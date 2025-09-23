#!/bin/bash

# User Data Script for EC2 Instance Setup
# This script runs when the EC2 instance starts

set -e

# Log all output to a file
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting EC2 instance setup..."

# Update system packages
yum update -y

# Install Docker
amazon-linux-extras install docker -y
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Install Nginx
amazon-linux-extras install nginx1 -y
systemctl enable nginx
systemctl start nginx

# Install Node.js and npm (for health checks)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create application directory
mkdir -p /opt/bulk-email-platform
cd /opt/bulk-email-platform

echo "EC2 instance setup completed successfully!"
