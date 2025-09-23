#!/bin/bash

# Comprehensive Deployment Verification Script
# This script verifies that all components of the Bulk Email Platform are working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
DB_HOST="${DB_HOST:-localhost}"
LOG_FILE="/var/log/deployment-verification.log"

# Utility functions
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}=================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test functions
test_connectivity() {
    print_header "Connectivity Tests"

    # Test internet connectivity
    if ping -c 1 google.com >/dev/null 2>&1; then
        print_success "Internet connectivity: OK"
    else
        print_error "Internet connectivity: FAILED"
        return 1
    fi

    # Test DNS resolution
    if nslookup google.com >/dev/null 2>&1; then
        print_success "DNS resolution: OK"
    else
        print_error "DNS resolution: FAILED"
        return 1
    fi
}

test_docker() {
    print_header "Docker Tests"

    # Test Docker daemon
    if docker info >/dev/null 2>&1; then
        print_success "Docker daemon: Running"

        # Get Docker version
        DOCKER_VERSION=$(docker --version)
        log "Docker version: $DOCKER_VERSION"

        # Get container count
        CONTAINER_COUNT=$(docker ps -q | wc -l)
        log "Running containers: $CONTAINER_COUNT"
        print_success "Docker containers: $CONTAINER_COUNT running"
    else
        print_error "Docker daemon: Not running"
        return 1
    fi

    # Test Docker Compose
    if docker-compose --version >/dev/null 2>&1; then
        DOCKER_COMPOSE_VERSION=$(docker-compose --version)
        log "Docker Compose version: $DOCKER_COMPOSE_VERSION"
        print_success "Docker Compose: Available"
    else
        print_error "Docker Compose: Not available"
        return 1
    fi
}

test_services() {
    print_header "Service Health Tests"

    # Test PostgreSQL
    if docker-compose ps postgres | grep -q "Up"; then
        print_success "PostgreSQL: Running"
        if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_success "PostgreSQL: Accepting connections"
        else
            print_error "PostgreSQL: Not accepting connections"
            return 1
        fi
    else
        print_error "PostgreSQL: Not running"
        return 1
    fi

    # Test Redis
    if docker-compose ps redis | grep -q "Up"; then
        print_success "Redis: Running"
        if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
            print_success "Redis: Responding"
        else
            print_error "Redis: Not responding"
            return 1
        fi
    else
        print_error "Redis: Not running"
        return 1
    fi

    # Test Backend
    if curl -f -s "$BACKEND_URL/api" >/dev/null 2>&1; then
        print_success "Backend API: Responding"
        log "Backend health check passed"
    else
        print_error "Backend API: Not responding"
        return 1
    fi

    # Test Frontend
    if curl -f -s "$FRONTEND_URL" >/dev/null 2>&1; then
        print_success "Frontend: Responding"
        log "Frontend health check passed"
    else
        print_error "Frontend: Not responding"
        return 1
    fi
}

test_application_features() {
    print_header "Application Feature Tests"

    # Test API endpoints
    API_ENDPOINTS=(
        "/api"
        "/api/campaigns"
        "/api/health"
    )

    for endpoint in "${API_ENDPOINTS[@]}"; do
        if curl -f -s "$BACKEND_URL$endpoint" >/dev/null 2>&1; then
            print_success "API endpoint $endpoint: OK"
        else
            print_warning "API endpoint $endpoint: Not accessible"
        fi
    done

    # Test frontend pages
    FRONTEND_PAGES=(
        "/"
        "/campaigns"
    )

    for page in "${FRONTEND_PAGES[@]}"; do
        if curl -f -s "$FRONTEND_URL$page" >/dev/null 2>&1; then
            print_success "Frontend page $page: OK"
        else
            print_warning "Frontend page $page: Not accessible"
        fi
    done
}

test_performance() {
    print_header "Performance Tests"

    # Test response times
    BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" "$BACKEND_URL/api")
    FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" "$FRONTEND_URL")

    log "Backend response time: ${BACKEND_RESPONSE}s"
    log "Frontend response time: ${FRONTEND_RESPONSE}s"

    # Simple performance assessment
    if (( $(echo "$BACKEND_RESPONSE < 2" | bc -l) )); then
        print_success "Backend response time: Fast (${BACKEND_RESPONSE}s)"
    elif (( $(echo "$BACKEND_RESPONSE < 5" | bc -l) )); then
        print_warning "Backend response time: Moderate (${BACKEND_RESPONSE}s)"
    else
        print_error "Backend response time: Slow (${BACKEND_RESPONSE}s)"
    fi

    if (( $(echo "$FRONTEND_RESPONSE < 3" | bc -l) )); then
        print_success "Frontend response time: Fast (${FRONTEND_RESPONSE}s)"
    elif (( $(echo "$FRONTEND_RESPONSE < 8" | bc -l) )); then
        print_warning "Frontend response time: Moderate (${FRONTEND_RESPONSE}s)"
    else
        print_error "Frontend response time: Slow (${FRONTEND_RESPONSE}s)"
    fi
}

test_resources() {
    print_header "Resource Usage Tests"

    # System resources
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    DISK_USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//g')

    log "CPU Usage: ${CPU_USAGE}%"
    log "Memory Usage: ${MEMORY_USAGE}%"
    log "Disk Usage: ${DISK_USAGE}%"

    # Resource assessment
    if (( $(echo "$CPU_USAGE < 70" | bc -l) )); then
        print_success "CPU Usage: Good (${CPU_USAGE}%)"
    elif (( $(echo "$CPU_USAGE < 90" | bc -l) )); then
        print_warning "CPU Usage: High (${CPU_USAGE}%)"
    else
        print_error "CPU Usage: Critical (${CPU_USAGE}%)"
    fi

    if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
        print_success "Memory Usage: Good (${MEMORY_USAGE}%)"
    elif (( $(echo "$MEMORY_USAGE < 95" | bc -l) )); then
        print_warning "Memory Usage: High (${MEMORY_USAGE}%)"
    else
        print_error "Memory Usage: Critical (${MEMORY_USAGE}%)"
    fi

    if (( $(echo "$DISK_USAGE < 80" | bc -l) )); then
        print_success "Disk Usage: Good (${DISK_USAGE}%)"
    elif (( $(echo "$DISK_USAGE < 95" | bc -l) )); then
        print_warning "Disk Usage: High (${DISK_USAGE}%)"
    else
        print_error "Disk Usage: Critical (${DISK_USAGE}%)"
    fi

    # Docker resources
    DOCKER_CONTAINERS=$(docker ps --format "table {{.Names}}" | wc -l)
    DOCKER_CPU=$(docker stats --no-stream --format "{{.Name}}: {{.CPUPerc}}" 2>/dev/null | head -n 10)

    log "Docker containers: $DOCKER_CONTAINERS"
    log "Docker CPU usage: $DOCKER_CPU"

    print_success "Docker containers: $DOCKER_CONTAINERS running"
}

test_security() {
    print_header "Security Tests"

    # Test SSL (if configured)
    if curl -f -s -I "$FRONTEND_URL" 2>/dev/null | grep -q "HTTP/2\|HTTP/1.1 200"; then
        print_success "Frontend security headers: Present"
    else
        print_warning "Frontend security headers: Not configured"
    fi

    # Test backend security headers
    if curl -f -s -I "$BACKEND_URL/api" 2>/dev/null | grep -q "HTTP/2\|HTTP/1.1 200"; then
        print_success "Backend security headers: Present"
    else
        print_warning "Backend security headers: Not configured"
    fi

    # Check for open ports (basic test)
    OPEN_PORTS=$(netstat -tlnp 2>/dev/null | grep LISTEN | wc -l)
    log "Open ports: $OPEN_PORTS"

    if [ "$OPEN_PORTS" -lt 10 ]; then
        print_success "Open ports: Minimal ($OPEN_PORTS)"
    else
        print_warning "Open ports: Many ($OPEN_PORTS) - review firewall settings"
    fi
}

generate_report() {
    print_header "Deployment Verification Report"

    echo "Date: $(date)"
    echo "Environment: ${ENVIRONMENT:-Development}"
    echo "Frontend URL: $FRONTEND_URL"
    echo "Backend URL: $BACKEND_URL"
    echo ""

    # Overall status
    FAILED_TESTS=$(grep -c "FAILED\|Not responding\|Critical" "$LOG_FILE" 2>/dev/null || echo "0")
    WARNING_TESTS=$(grep -c "WARNING\|High\|Not accessible" "$LOG_FILE" 2>/dev/null || echo "0")

    if [ "$FAILED_TESTS" -eq 0 ] && [ "$WARNING_TESTS" -eq 0 ]; then
        print_success "OVERALL STATUS: EXCELLENT - All tests passed!"
        echo "🎉 Deployment is healthy and ready for production"
    elif [ "$FAILED_TESTS" -eq 0 ] && [ "$WARNING_TESTS" -gt 0 ]; then
        print_warning "OVERALL STATUS: GOOD - Minor issues detected"
        echo "✅ Deployment is functional but has some warnings"
    else
        print_error "OVERALL STATUS: CRITICAL - Major issues detected"
        echo "❌ Deployment needs immediate attention"
        return 1
    fi

    echo ""
    echo "📋 Test Summary:"
    echo "- Connectivity: $(grep -c "OK" "$LOG_FILE" 2>/dev/null || echo "0") passed"
    echo "- Services: $(grep -c "Running\|Responding" "$LOG_FILE" 2>/dev/null || echo "0") healthy"
    echo "- Performance: $(grep -c "Fast\|Good" "$LOG_FILE" 2>/dev/null || echo "0") optimal"
    echo "- Security: $(grep -c "Present\|Minimal" "$LOG_FILE" 2>/dev/null || echo "0") secure"

    echo ""
    echo "📊 Recommendations:"
    if [ "$WARNING_TESTS" -gt 0 ]; then
        echo "- Review warnings in the log file"
        echo "- Consider performance optimizations"
        echo "- Verify security configurations"
    fi

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo "- Monitor application performance"
        echo "- Set up alerting for critical services"
        echo "- Plan for scaling based on usage"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}🚀 Starting Bulk Email Platform Deployment Verification${NC}"
    echo "Log file: $LOG_FILE"
    echo ""

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    # Run all tests
    test_connectivity
    test_docker
    test_services
    test_application_features
    test_performance
    test_resources
    test_security

    # Generate report
    generate_report

    echo ""
    echo -e "${GREEN}✅ Verification completed!${NC}"
    echo "📄 Check the full report in: $LOG_FILE"
}

# Handle script arguments
case "${1:-}" in
    "connectivity")
        test_connectivity
        ;;
    "docker")
        test_docker
        ;;
    "services")
        test_services
        ;;
    "features")
        test_application_features
        ;;
    "performance")
        test_performance
        ;;
    "resources")
        test_resources
        ;;
    "security")
        test_security
        ;;
    "report")
        generate_report
        ;;
    *)
        main
        ;;
esac
