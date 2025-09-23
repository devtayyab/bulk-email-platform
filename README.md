# 🚀 Bulk Email Platform

A comprehensive bulk email sending platform built with modern technologies for reliable email delivery at scale.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: NestJS with TypeORM and PostgreSQL
- **Database**: PostgreSQL with Redis caching
- **Queue**: AWS SQS for asynchronous job processing
- **Email Service**: SendGrid for reliable email delivery
- **Deployment**: Docker containers with AWS EC2 orchestration

## ✨ Features

- 📁 CSV/Excel file upload for recipient management
- 📧 Campaign creation with personalized content
- 📊 Real-time campaign progress tracking
- 🔄 Automatic retry mechanism for failed emails
- 💀 Dead letter queue handling for failed messages
- 📈 Dashboard with comprehensive campaign analytics
- 🐳 Docker containerization for easy deployment
- ☁️ AWS EC2 deployment with automated setup
- 📊 Built-in monitoring and health checks

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **Docker & Docker Compose**: For containerized deployment
- **AWS Account**: For SQS queue and EC2 deployment
- **SendGrid Account**: For email delivery
- **Git**: For version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd bulk-email-platform
```

### 2. Environment Setup

Copy environment templates and configure them:

```bash
# Backend environment
cp backend/.env.example backend/.env
cp .env .env

# Frontend environment
cp frontend/.env.example frontend/.env
```

### 3. Local Development with Docker

```bash
# Start all services
make setup
make dev

# Or use Docker Compose directly
docker-compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api

### 4. Manual Setup (without Docker)

```bash
# Backend setup
cd backend
npm install
npm run build
npm run start:dev

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

## 🐳 Docker Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Deployment

```bash
# Build and deploy
make deploy

# Check health
make health

# View logs
make logs
```

## ☁️ AWS EC2 Deployment

### Automated Deployment

```bash
# Configure AWS CLI first
aws configure

# Deploy to AWS EC2
make deploy-aws

# Or use the deployment script directly
chmod +x deploy-aws.sh
./deploy-aws.sh
```

### Manual EC2 Setup

1. **Launch EC2 Instance**
   - AMI: Amazon Linux 2
   - Instance Type: t3.medium or higher
   - Security Group: Open ports 80, 443, 22
   - Key Pair: Create new or use existing

2. **Install Dependencies**
   ```bash
   # Copy setup script to instance
   scp setup-instance.sh ec2-user@your-instance-ip:/tmp/

   # Run setup script on instance
   ssh ec2-user@your-instance-ip 'bash /tmp/setup-instance.sh'
   ```

3. **Deploy Application**
   ```bash
   # Copy application files
   scp -r ../bulk-email-platform ec2-user@your-instance-ip:/opt/

   # Deploy application
   ssh ec2-user@your-instance-ip 'cd /opt/bulk-email-platform && ./deploy-to-instance.sh'
   ```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=bulk_email_platform

# Application
PORT=3001
NODE_ENV=production

# AWS SQS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SQS_QUEUE_URL=your_queue_url
AWS_SQS_DLQ_URL=your_dlq_url

# SendGrid
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

#### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=production
```

### AWS SQS Setup

1. Create SQS Queue for email processing
2. Create Dead Letter Queue (DLQ) for failed messages
3. Update environment variables with queue URLs

### SendGrid Setup

1. Create SendGrid account
2. Generate API key
3. Verify sender email/domain
4. Update environment variables

## 📊 Monitoring & Logging

### Health Checks

```bash
# Check all services
make health

# Monitor specific services
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Logs

```bash
# View all logs
make logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### System Monitoring

```bash
# Real-time system monitoring
htop

# Disk usage
df -h

# Memory usage
free -h

# Network monitoring
nmon
```

## 🔧 Development Commands

```bash
# Setup development environment
make setup

# Run tests
make test

# Build for production
make build

# Clean up
make clean

# Database operations
make db-reset

# View available commands
make help
```

## 📁 Project Structure

```
bulk-email-platform/
├── frontend/                    # Next.js frontend
│   ├── app/                    # Next.js app router
│   ├── components/             # React components
│   ├── lib/                    # Utilities and services
│   ├── Dockerfile             # Frontend container
│   └── next.config.js         # Next.js configuration
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── campaigns/         # Campaign management
│   │   ├── email/             # Email services
│   │   ├── file-upload/       # File processing
│   │   ├── email-jobs/        # Queue processing
│   │   └── sqs/               # AWS SQS integration
│   ├── Dockerfile             # Backend container
│   └── nest-cli.json          # NestJS configuration
├── docker-compose.yml          # Docker orchestration
├── nginx.conf                  # Production nginx config
├── deploy-aws.sh              # AWS deployment script
├── setup-monitoring.sh        # Monitoring setup
├── Makefile                   # Development commands
└── init.sql                   # Database initialization
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **API Keys**: Use AWS IAM roles instead of access keys when possible
3. **HTTPS**: Always use SSL/TLS in production
4. **Firewall**: Configure security groups to restrict access
5. **Updates**: Keep dependencies updated and monitor for vulnerabilities

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000

   # Kill the process
   kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs postgres

   # Reset database
   make db-reset
   ```

3. **Permission Issues**
   ```bash
   # Fix Docker permissions
   sudo chown -R $USER:$USER .
   ```

4. **AWS CLI Issues**
   ```bash
   # Reconfigure AWS CLI
   aws configure

   # Check credentials
   aws sts get-caller-identity
   ```

### Support

For issues and questions:
1. Check the logs: `make logs`
2. Verify environment variables
3. Ensure all services are healthy: `make health`
4. Check AWS console for SQS queue status

## 📈 Scaling

### Horizontal Scaling

1. **Frontend**: Deploy multiple Next.js instances behind load balancer
2. **Backend**: Use multiple NestJS instances with shared Redis
3. **Database**: Use PostgreSQL read replicas
4. **Queue**: Configure multiple SQS consumers

### Performance Optimization

1. **Caching**: Implement Redis caching for frequently accessed data
2. **CDN**: Use CloudFront for static assets
3. **Database**: Optimize queries and add proper indexes
4. **Monitoring**: Set up alerts for performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Emailing! 📧**
