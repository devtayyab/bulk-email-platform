# 🚀 Production Deployment Guide - Bulk Email Platform

## 📋 Complete Step-by-Step Production Deployment

This guide covers **EVERY SINGLE STEP** you need to take to deploy the Bulk Email Platform to production on AWS EC2. Follow these steps in exact order.

---

## 🎯 **STEP 1: Prerequisites Setup** (Local Machine)

### 1.1 Install Required Software

**On your local machine terminal:**

```bash
# Check if you have these installed
which docker
which docker-compose
which aws
which git
which node
which npm
```

**If any are missing, install them:**

**MacOS:**
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Install AWS CLI: https://aws.amazon.com/cli/
# Install Node.js: https://nodejs.org/
# Install Git: https://git-scm.com/
```

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install AWS CLI
sudo apt update
sudo apt install awscli

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install Git
sudo apt install git
```

### 1.2 Verify Installations

```bash
# Verify Docker
docker --version
docker-compose --version

# Verify AWS CLI
aws --version

# Verify Node.js
node --version
npm --version

# Verify Git
git --version
```

**Expected output:**
- Docker version 20.10+
- Docker Compose version 1.29+
- AWS CLI version 2.x
- Node.js version 18.x
- Git version 2.x

---

## 🎯 **STEP 2: AWS Account Setup** (AWS Console)

### 2.1 Create AWS Account

1. Go to https://aws.amazon.com/
2. Click "Create AWS Account"
3. Follow the signup process
4. Verify your email address
5. Add payment method (required but you can use free tier)

### 2.2 Create IAM User

1. **AWS Console → IAM Dashboard**
2. Click "Users" → "Add user"
3. Username: `bulk-email-deployer`
4. Check "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Search and select these policies:
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `IAMFullAccess`
   - `AmazonSQSFullAccess`
8. Click "Next: Tags" → "Next: Review" → "Create user"

**⚠️ SAVE THESE CREDENTIALS:**
- Access Key ID: ``
- Secret Access Key: ``

### 2.3 Configure AWS CLI

**On your local terminal:**

```bash
# Configure AWS CLI with the credentials you just saved
aws configure

# Enter these values when prompted:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: us-east-1
# Default output format: json
```

**Verify configuration:**
```bash
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/bulk-email-deployer"
}
```

---

## 🎯 **STEP 3: Environment Configuration** (Local Machine)

### 3.1 Configure Environment Variables

**Edit the `.env` file in your project root:**

```bash
# Open the .env file
nano .env
# Or use your preferred editor
```

**Add these values to `.env`:**

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=YourSecurePassword123!
DB_NAME=bulk_email_platform

# Application
PORT=3001
NODE_ENV=production

# AWS Configuration (use credentials from Step 2.2)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/bulk-email-queue
AWS_SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/bulk-email-dlq

# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
```

### 3.2 Configure Frontend Environment

**Edit the frontend `.env` file:**

```bash
nano frontend/.env
```

**Add this content:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=production
```

### 3.3 Get SendGrid API Key

1. Go to https://sendgrid.com/
2. Create account or login
3. Go to Settings → API Keys
4. Create new API Key with "Full Access"
5. Copy the API key
6. Replace `SG.your_sendgrid_api_key_here` in `.env`

### 3.4 Get AWS Account ID

```bash
# On your local terminal
aws sts get-caller-identity --query Account --output text
```

**Save this Account ID for later use.**

---

## 🎯 **STEP 4: AWS Services Setup** (AWS Console)

### 4.1 Create SQS Queues

**AWS Console → Amazon SQS:**

1. **Create Main Queue:**
   - Click "Create queue"
   - Name: `bulk-email-queue`
   - Type: Standard
   - Click "Create queue"

2. **Create Dead Letter Queue:**
   - Click "Create queue"
   - Name: `bulk-email-dlq`
   - Type: Standard
   - Click "Create queue"

3. **Configure Dead Letter Queue for Main Queue:**
   - Go to `bulk-email-queue`
   - Redrive Policy tab
   - Enable redrive
   - DLQ: `bulk-email-dlq`
   - Max receives: 3

4. **Get Queue URLs:**
   - Click on each queue
   - Copy the "URL" from the details section
   - Replace in your `.env` file:
     - `AWS_SQS_QUEUE_URL`: Main queue URL
     - `AWS_SQS_DLQ_URL`: DLQ URL

### 4.2 Create Security Group

**AWS Console → EC2 → Security Groups:**

1. Click "Create security group"
2. Name: `bulk-email-sg`
3. Description: "Security group for Bulk Email Platform"
4. VPC: Default VPC
5. Add inbound rules:
   - SSH (22) - Source: My IP
   - HTTP (80) - Source: Anywhere
   - HTTPS (443) - Source: Anywhere
6. Click "Create security group"

---

## 🎯 **STEP 5: Local Preparation** (Local Machine)

### 5.1 Test Local Setup First

```bash
# Navigate to project directory
cd /path/to/bulk-email-platform

# Test Docker setup
docker --version
docker-compose --version

# Test if all files exist
ls -la
# Should show: docker-compose.yml, .env, frontend/, backend/, etc.
```

### 5.2 Update Deployment Script

**Edit `deploy-aws.sh`:**

```bash
nano deploy-aws.sh
```

**Update these lines:**
- Line with `yourusername/bulk-email-platform` → your actual GitHub username/repo
- Check all AWS region references are `$REGION`
- Verify domain name if you have one

### 5.3 Make Scripts Executable

```bash
# Make deployment scripts executable
chmod +x deploy-aws.sh
chmod +x setup-instance.sh
chmod +x verify-deployment.sh
chmod +x setup-monitoring.sh
```

### 5.4 Test Environment Variables

```bash
# Test if environment variables are loaded
docker-compose config

# Check for any errors in configuration
echo "Environment variables test completed"
```

---

## 🎯 **STEP 6: Deploy to AWS EC2** (Local Terminal)

### 6.1 Start Deployment

```bash
# Run the deployment script
./deploy-aws.sh
```

**What happens next:**
1. Script creates security group (if doesn't exist)
2. Creates key pair and saves to `bulk-email-key.pem`
3. Launches EC2 instance
4. Waits for instance to be ready
5. Shows you the public IP address

**⚠️ SAVE THE PUBLIC IP ADDRESS!** You'll need it later.

### 6.2 Wait for Deployment

The script will show:
```
✅ Instance is ready at: 54.xxx.xxx.xxx
```

**Copy this IP address.**

### 6.3 Monitor Deployment Logs

**In a new terminal:**

```bash
# SSH into your instance to monitor deployment
chmod 400 bulk-email-key.pem
ssh -i bulk-email-key.pem ec2-user@YOUR_INSTANCE_IP

# Once connected, check logs
sudo tail -f /var/log/cloud-init-output.log
sudo tail -f /var/log/user-data.log
```

**Expected log messages:**
- "Docker installed successfully"
- "Nginx installed successfully"
- "Application deployed successfully"
- "All services started"

### 6.4 Wait for Application Startup

**On the EC2 instance:**

```bash
# Check Docker containers
sudo docker-compose ps

# Check application logs
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
```

**Wait until you see:**
- PostgreSQL: "database system is ready to accept connections"
- Redis: "Ready to accept connections"
- Backend: "Application is running on: http://localhost:3001"
- Frontend: "Ready - started server on 0.0.0.0:3000"

---

## 🎯 **STEP 7: Post-Deployment Setup** (AWS Console + Local)

### 7.1 Get Your Instance Public IP

**AWS Console → EC2 → Instances:**
1. Find your instance
2. Copy the "Public IPv4 address"
3. Note the "Instance ID"

### 7.2 Update Security Group (Optional)

If you want to restrict SSH access to only your IP:

**AWS Console → EC2 → Security Groups:**
1. Find `bulk-email-sg`
2. Edit inbound rules
3. Change SSH source from "Anywhere" to "My IP"

### 7.3 Test Application Access

**On your local machine:**

```bash
# Test frontend
curl -I http://YOUR_INSTANCE_IP

# Test backend API
curl -I http://YOUR_INSTANCE_IP/api

# Test health endpoints
curl http://YOUR_INSTANCE_IP/health
curl http://YOUR_INSTANCE_IP/api/health
```

**Expected responses:**
- HTTP 200 for frontend
- HTTP 200 for API endpoints
- JSON response for health checks

### 7.4 Set Up Domain (Optional)

**If you have a domain:**

1. **AWS Console → Route 53:**
   - Create hosted zone for your domain
   - Create A record pointing to your instance IP

2. **Update Nginx configuration:**
   ```bash
   # SSH into instance
   ssh -i bulk-email-key.pem ec2-user@YOUR_INSTANCE_IP

   # Edit nginx config
   sudo nano /etc/nginx/conf.d/bulk-email-platform.conf
   # Change server_name to your domain
   ```

---

## 🎯 **STEP 8: Verification & Testing** (Local Terminal)

### 8.1 Run Deployment Verification

```bash
# Set environment variables
export FRONTEND_URL=http://YOUR_INSTANCE_IP
export BACKEND_URL=http://YOUR_INSTANCE_IP

# Run verification script
./verify-deployment.sh
```

**Expected results:**
- ✅ All connectivity tests pass
- ✅ All services are healthy
- ✅ API endpoints respond correctly
- ✅ Performance is acceptable

### 8.2 Manual Testing

**Test the application:**

1. **Frontend:** http://YOUR_INSTANCE_IP
2. **API Documentation:** http://YOUR_INSTANCE_IP/api
3. **Health Check:** http://YOUR_INSTANCE_IP/health

### 8.3 Load Testing

```bash
# Simple load test
for i in {1..10}; do
    curl -s -w "%{time_total}\n" -o /dev/null http://YOUR_INSTANCE_IP
done
```

---

## 🎯 **STEP 9: Monitoring & Maintenance** (Ongoing)

### 9.1 Set Up Monitoring

```bash
# Copy monitoring scripts to instance
scp -i bulk-email-key.pem setup-monitoring.sh ec2-user@YOUR_INSTANCE_IP:/opt/bulk-email-platform/

# Run monitoring setup on instance
ssh -i bulk-email-key.pem ec2-user@YOUR_INSTANCE_IP
cd /opt/bulk-email-platform
chmod +x setup-monitoring.sh
./setup-monitoring.sh
```

### 9.2 Set Up Log Rotation

**On the instance:**
```bash
sudo crontab -e
```

**Add these lines:**
```
# Bulk Email Platform Monitoring
*/5 * * * * /opt/bulk-email-platform/monitor-health.sh >> /var/log/bulk-email-health.log 2>&1
*/15 * * * * /opt/bulk-email-platform/monitor-resources.sh >> /var/log/bulk-email-resources.log 2>&1
0 2 * * * /usr/sbin/logrotate /opt/bulk-email-platform/logrotate.conf
```

### 9.3 Regular Maintenance

**Daily checks:**
```bash
# On your local machine
./verify-deployment.sh

# On the instance
sudo docker-compose logs --tail=50
htop
df -h
```

---

## 🎯 **STEP 10: Troubleshooting** (As Needed)

### 10.1 Check Service Status

```bash
# On the instance
sudo docker-compose ps
sudo systemctl status docker
sudo systemctl status nginx
```

### 10.2 View Application Logs

```bash
# On the instance
sudo docker-compose logs backend
sudo docker-compose logs frontend
sudo docker-compose logs postgres
```

### 10.3 Check System Resources

```bash
# On the instance
htop
df -h
free -h
```

### 10.4 Database Issues

```bash
# On the instance
sudo docker-compose exec postgres pg_isready -U postgres
sudo docker-compose logs postgres
```

### 10.5 Network Issues

```bash
# On the instance
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001
```

---

## 🔒 **Security Checklist**

- [ ] Change database password from default
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall properly
- [ ] Set up automated backups
- [ ] Monitor for security updates
- [ ] Use AWS IAM roles instead of access keys (advanced)

---

## 📞 **Emergency Contacts**

**AWS Support:**
- AWS Console → Support Center
- Phone: Check your AWS account for support number

**Your Setup:**
- Instance IP: `YOUR_INSTANCE_IP`
- SSH Key: `bulk-email-key.pem`
- Security Group: `bulk-email-sg`

---

## 🎉 **Success Checklist**

- [ ] AWS account created and configured
- [ ] Environment variables set correctly
- [ ] SQS queues created and configured
- [ ] EC2 instance deployed successfully
- [ ] Application accessible via public IP
- [ ] All health checks passing
- [ ] Monitoring set up
- [ ] SSL configured (optional)

---

**🚀 CONGRATULATIONS! Your Bulk Email Platform is now running in production!**

**Access your application:**
- **Frontend:** http://YOUR_INSTANCE_IP
- **API:** http://YOUR_INSTANCE_IP/api
- **Health:** http://YOUR_INSTANCE_IP/health

**Next steps:**
1. Set up custom domain (optional)
2. Configure SSL certificate
3. Set up automated backups
4. Monitor performance and logs
5. Scale as needed

---

## 📞 **Need Help?**

If you encounter issues:

1. **Check this guide** - Most issues are covered
2. **Run verification script:** `./verify-deployment.sh`
3. **Check logs:** `make logs` or SSH into instance
4. **AWS Status:** https://status.aws.amazon.com/
5. **Community:** AWS Forums, Stack Overflow

**Remember:** Keep your `.pem` key file safe and your credentials secure!
