#!/bin/bash

# Monitoring and Alerting Setup Script
# This script sets up basic monitoring for the Bulk Email Platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📊 Setting up monitoring and alerting...${NC}"

# Install monitoring tools
echo -e "${YELLOW}📦 Installing monitoring tools...${NC}"

# Install Node.js monitoring (if not already installed)
if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
fi

# Install system monitoring tools
sudo apt-get update
sudo apt-get install -y htop iotop nmon sysstat

echo -e "${GREEN}✅ System monitoring tools installed${NC}"

# Create monitoring scripts
echo -e "${YELLOW}📝 Creating monitoring scripts...${NC}"

# Application health check script
cat > monitor-health.sh << 'EOF'
#!/bin/bash

# Application Health Monitor
LOG_FILE="/var/log/bulk-email-monitor.log"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
DB_HOST="localhost"
DB_PORT="5432"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_frontend() {
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        echo "✅ Frontend is healthy"
        return 0
    else
        echo "❌ Frontend is down"
        log "Frontend health check failed"
        return 1
    fi
}

check_backend() {
    if curl -f -s "$BACKEND_URL/api" > /dev/null; then
        echo "✅ Backend API is healthy"
        return 0
    else
        echo "❌ Backend API is down"
        log "Backend API health check failed"
        return 1
    fi
}

check_database() {
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✅ Database is accessible"
        return 0
    else
        echo "❌ Database is not accessible"
        log "Database connection failed"
        return 1
    fi
}

# Run checks
echo "=== Health Check Report ==="
echo "Date: $(date)"

FRONTEND_OK=0
BACKEND_OK=0
DB_OK=0

check_frontend && FRONTEND_OK=1
check_backend && BACKEND_OK=1
check_database && DB_OK=1

if [ $FRONTEND_OK -eq 1 ] && [ $BACKEND_OK -eq 1 ] && [ $DB_OK -eq 1 ]; then
    echo "🎉 All services are healthy!"
    log "All services healthy"
    exit 0
else
    echo "⚠️  Some services are not healthy"
    log "Some services unhealthy - Frontend:$FRONTEND_OK Backend:$BACKEND_OK DB:$DB_OK"
    exit 1
fi
EOF

chmod +x monitor-health.sh

# Resource monitoring script
cat > monitor-resources.sh << 'EOF'
#!/bin/bash

# Resource Monitor Script
LOG_FILE="/var/log/bulk-email-resources.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Get system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
DISK_USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//g')
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}')

# Get Docker container resources
DOCKER_CONTAINERS=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tail -n +2)

log "CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, Load: ${LOAD_AVERAGE}"
log "Docker Containers: $DOCKER_CONTAINERS"

# Alert if resources are high
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "WARNING: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    log "WARNING: High memory usage: ${MEMORY_USAGE}%"
fi

if (( $(echo "$DISK_USAGE > 90" | bc -l) )); then
    log "WARNING: High disk usage: ${DISK_USAGE}%"
fi

echo "Resource usage logged successfully"
EOF

chmod +x monitor-resources.sh

# Create log rotation configuration
cat > logrotate.conf << 'EOF'
/var/log/bulk-email-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload rsyslog >/dev/null 2>&1 || true
    endscript
}
EOF

# Create cron jobs for monitoring
cat > cron-jobs << 'EOF'
# Bulk Email Platform Monitoring Cron Jobs

# Health check every 5 minutes
*/5 * * * * /opt/bulk-email-platform/monitor-health.sh >> /var/log/bulk-email-health.log 2>&1

# Resource monitoring every 15 minutes
*/15 * * * * /opt/bulk-email-platform/monitor-resources.sh >> /var/log/bulk-email-resources.log 2>&1

# Log rotation daily at 2 AM
0 2 * * * /usr/sbin/logrotate /opt/bulk-email-platform/logrotate.conf
EOF

# Setup PM2 ecosystem file for production process management
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bulk-email-backend',
      script: './backend/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
EOF

echo -e "${GREEN}✅ Monitoring scripts created${NC}"

# Create monitoring dashboard script
cat > dashboard.sh << 'EOF'
#!/bin/bash

# Simple monitoring dashboard
clear
echo "====================================="
echo "Bulk Email Platform - Monitoring Dashboard"
echo "====================================="
echo "Last updated: $(date)"
echo ""

# Service status
echo "🔍 Service Status:"
echo "-------------------"

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Running"
else
    echo "❌ Nginx: Stopped"
fi

if systemctl is-active --quiet docker; then
    echo "✅ Docker: Running"
else
    echo "❌ Docker: Stopped"
fi

# Docker containers
echo ""
echo "🐳 Docker Containers:"
echo "---------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Resource usage
echo ""
echo "📊 Resource Usage:"
echo "------------------"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')%"
echo "Memory: $(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')%"
echo "Disk: $(df / | grep / | awk '{print $5}' | sed 's/%//g')%"

# Recent logs
echo ""
echo "📝 Recent Backend Logs:"
echo "-----------------------"
tail -5 /var/log/bulk-email-monitor.log 2>/dev/null || echo "No logs available"

echo ""
echo "Press Ctrl+C to exit"
EOF

chmod +x dashboard.sh

echo -e "${GREEN}✅ Monitoring dashboard created${NC}"

# Instructions
echo ""
echo -e "${YELLOW}📋 Monitoring Setup Complete!${NC}"
echo ""
echo "To use the monitoring system:"
echo ""
echo "1. Copy monitoring scripts to your server:"
echo "   scp monitor-*.sh user@your-server:/opt/bulk-email-platform/"
echo ""
echo "2. Make scripts executable and run them:"
echo "   chmod +x /opt/bulk-email-platform/monitor-*.sh"
echo "   /opt/bulk-email-platform/monitor-health.sh"
echo "   /opt/bulk-email-platform/monitor-resources.sh"
echo ""
echo "3. Run the monitoring dashboard:"
echo "   /opt/bulk-email-platform/dashboard.sh"
echo ""
echo "4. Set up cron jobs:"
echo "   crontab -e"
echo "   # Add the contents of cron-jobs file"
echo ""
echo "5. For production, consider using PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 logs"
echo ""
echo -e "${GREEN}✅ Monitoring setup completed successfully!${NC}"
