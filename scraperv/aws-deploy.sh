#!/bin/bash

# AWS Deployment Script for Design Hackathon Scraper
# This script deploys the server with auto-shutdown functionality

echo "🚀 Deploying Design Hackathon Scraper to AWS..."

# Configuration
PROJECT_NAME="design-hackathon-scraper"
EC2_INSTANCE_TYPE="t3.micro"  # Smallest instance for cost optimization
KEY_NAME="your-key-pair-name"  # Replace with your AWS key pair name
SECURITY_GROUP="your-security-group"  # Replace with your security group ID

# Create user data script for EC2 instance
cat > user-data.sh << 'EOF'
#!/bin/bash

# Update system
yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install Git
yum install -y git

# Create app directory
mkdir -p /opt/design-hackathon-scraper
cd /opt/design-hackathon-scraper

# Clone or copy your application here
# For now, we'll assume the files are uploaded separately
# git clone https://github.com/yourusername/design-hackathon-scraper.git .

# Install dependencies
npm install

# Create environment file
cat > .env << 'ENVEOF'
AUTO_SHUTDOWN=true
SHUTDOWN_DELAY=30000
PORT=3001
NODE_ENV=production
ENVEOF

# Create systemd service
cat > /etc/systemd/system/design-hackathon-scraper.service << 'SERVICEEOF'
[Unit]
Description=Design Hackathon Scraper
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/design-hackathon-scraper
Environment=NODE_ENV=production
Environment=AUTO_SHUTDOWN=true
Environment=SHUTDOWN_DELAY=30000
ExecStart=/usr/bin/node server.js
Restart=no
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Enable and start service
systemctl enable design-hackathon-scraper.service
systemctl start design-hackathon-scraper.service

# Wait for service to complete
sleep 60

# Shutdown instance after scraping is complete
shutdown -h now
EOF

# Create EC2 instance
echo "📦 Creating EC2 instance..."

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type $EC2_INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SECURITY_GROUP \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME}]" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ Instance created: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "🌐 Instance IP: $PUBLIC_IP"

# Create CloudWatch Events rule for hourly execution
echo "⏰ Setting up CloudWatch Events rule..."

RULE_NAME="${PROJECT_NAME}-hourly"
aws events put-rule \
  --name $RULE_NAME \
  --schedule-expression "rate(1 hour)" \
  --description "Run design hackathon scraper every hour"

# Create target for the rule
aws events put-targets \
  --rule $RULE_NAME \
  --targets "Id=1,Arn=arn:aws:ec2:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):instance/$INSTANCE_ID"

echo "✅ Deployment complete!"
echo "📋 Instance ID: $INSTANCE_ID"
echo "🌐 Public IP: $PUBLIC_IP"
echo "⏰ CloudWatch Rule: $RULE_NAME"
echo ""
echo "🔧 To upload your application files:"
echo "scp -i your-key.pem -r ./server/* ec2-user@$PUBLIC_IP:/opt/design-hackathon-scraper/"
echo ""
echo "📊 To monitor logs:"
echo "ssh -i your-key.pem ec2-user@$PUBLIC_IP 'journalctl -u design-hackathon-scraper -f'" 