#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying Bulk Email Platform to EC2 Instance${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo yum update -y

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
sudo amazon-linux-extras install docker -y
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose (more reliable method)
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose installation
if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose installation failed. Trying alternative method...${NC}"
    # Alternative installation method
    sudo curl -L "https://raw.githubusercontent.com/docker/compose/master/contrib/completion/bash/docker-compose" -o /etc/bash_completion.d/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
    docker-compose --version
else
    echo -e "${RED}❌ Docker Compose installation failed completely${NC}"
    exit 1
fi

# Install Git
echo -e "${YELLOW}📥 Installing Git...${NC}"
sudo yum install -y git

# Install Nginx
echo -e "${YELLOW}🌐 Installing Nginx...${NC}"
sudo amazon-linux-extras install nginx1 -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /opt/bulk-email-platform
sudo chown ec2-user:ec2-user /opt/bulk-email-platform

cd /opt/bulk-email-platform

# Clone repository (replace with your actual repository URL)
echo -e "${YELLOW}📥 Cloning repository...${NC}"
git clone https://github.com/devtayyab/bulk-email-platform.git .
# Or copy from S3, etc.

# Create environment file
echo -e "${YELLOW}⚙️ Setting up environment variables...${NC}"
cat > .env << EENV
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=bulkemail123
DB_NAME=bulk_email_platform

# Application
PORT=3001
NODE_ENV=production

# AWS Configuration
AWS_REGION=$REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_SQS_QUEUE_URL=$AWS_SQS_QUEUE_URL
AWS_SQS_DLQ_URL=$AWS_SQS_DLQ_URL

# SendGrid Configuration
SENDGRID_API_KEY=$SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL
EENV

# Start Docker services
echo -e "${YELLOW}🚀 Starting Docker services...${NC}"
sudo docker-compose up -d

# Configure Nginx as reverse proxy
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
sudo cat > /etc/nginx/conf.d/bulk-email-platform.conf << NGINX
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

# Reload Nginx
sudo systemctl reload nginx

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: http://$PUBLIC_IP${NC}"
echo -e "${GREEN}📚 API Documentation: http://$PUBLIC_IP/api${NC}"
