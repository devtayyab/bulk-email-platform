#!/bin/bash

# AWS EC2 Deployment Script for Bulk Email Platform
# This script sets up the entire application stack on AWS EC2

set -e

# Configuration
APP_NAME="bulk-email-platform"
REGION="${AWS_REGION:-eu-north-1}"
INSTANCE_TYPE="t3.medium"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-bulk-email-key}"
SECURITY_GROUP_NAME="${SECURITY_GROUP_NAME:-bulk-email-sg}"
DOMAIN_NAME="${DOMAIN_NAME:-yourdomain.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS EC2 Deployment for $APP_NAME${NC}"

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo -e "${RED}❌ AWS CLI is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose is required but not installed. Aborting.${NC}" >&2; exit 1; }

# Login to AWS
if ! aws sts get-caller-identity --profile "bulk-email" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  AWS credentials not configured. Please configure them first.${NC}"
    echo "Run: aws configure --profile bulk-email"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create security group
echo -e "${YELLOW}📦 Creating security group...${NC}"
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
    --group-names "$SECURITY_GROUP_NAME" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")

if [ "$SECURITY_GROUP_ID" = "None" ] || [ -z "$SECURITY_GROUP_ID" ]; then
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "Security group for Bulk Email Platform" \
        --region "$REGION" \
        --query 'GroupId' \
        --output text)

    # Add inbound rules
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"

    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"

    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"

    echo -e "${GREEN}✅ Security group created: $SECURITY_GROUP_ID${NC}"
else
    echo -e "${GREEN}✅ Security group already exists: $SECURITY_GROUP_ID${NC}"
fi

# Create key pair if it doesn't exist
echo -e "${YELLOW}🔑 Checking key pair...${NC}"
if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" >/dev/null 2>&1; then
    aws ec2 create-key-pair \
        --key-name "$KEY_PAIR_NAME" \
        --region "$REGION" \
        --query 'KeyMaterial' \
        --output text > "${KEY_PAIR_NAME}.pem"

    chmod 400 "${KEY_PAIR_NAME}.pem"
    echo -e "${GREEN}✅ Key pair created and saved as ${KEY_PAIR_NAME}.pem${NC}"
else
    echo -e "${GREEN}✅ Key pair already exists${NC}"
fi

# Launch EC2 instance
echo -e "${YELLOW}🚀 Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-074211ec8e88502be \
    --count 1 \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_PAIR_NAME" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --region "$REGION" \
    --user-data file://setup-instance.sh \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}✅ Instance launched: $INSTANCE_ID${NC}"

# Wait for instance to be running
echo -e "${YELLOW}⏳ Waiting for instance to be ready...${NC}"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✅ Instance is ready at: $PUBLIC_IP${NC}"

# Create deployment script for the instance
echo -e "${YELLOW}📝 Creating deployment script...${NC}"
cat > deploy-to-instance.sh << 'EOF'
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

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

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
EOF

chmod +x deploy-to-instance.sh

echo -e "${GREEN}✅ AWS EC2 deployment setup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Replace 'devtayyab/bulk-email-platform' in deploy-to-instance.sh with your actual repository"
echo "2. Update the .env file with your actual credentials"
echo "3. Run: ./deploy-to-instance.sh to deploy to the instance"
echo "4. Access your application at: http://$PUBLIC_IP"
echo ""
echo -e "${YELLOW}🔑 Keep your private key safe: ${KEY_PAIR_NAME}.pem${NC}"
