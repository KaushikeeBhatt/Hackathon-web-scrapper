# 🚀 AWS Deployment Guide - Design Hackathon Scraper

## 📋 Overview

This guide will help you deploy your design hackathon scraper to AWS with cost optimization features:

- **Auto-shutdown** after scraping completion
- **Hourly scheduling** using CloudWatch Events
- **Status tracking** (active/expired hackathons)
- **Data updates** for existing hackathons
- **Cost optimization** using Lambda + EC2

## 🏗️ Architecture

```
CloudWatch Events (Hourly) 
    ↓
Lambda Function (Scheduler)
    ↓
EC2 Instance (t3.micro)
    ↓
Scraper Runs → Auto-shutdown
    ↓
S3 Storage (Data)
```

## 📦 Prerequisites

1. **AWS CLI** installed and configured
2. **AWS Account** with appropriate permissions
3. **Key Pair** for EC2 access
4. **Security Group** with port 3001 open
5. **S3 Bucket** for application storage

## 🔧 Setup Steps

### 1. Create S3 Bucket

```bash
aws s3 mb s3://your-design-hackathon-bucket
```

### 2. Upload Application to S3

```bash
# Create deployment package
cd server
zip -r design-hackathon-scraper.zip . -x "*.git*" "node_modules/.cache/*"

# Upload to S3
aws s3 cp design-hackathon-scraper.zip s3://your-design-hackathon-bucket/
```

### 3. Create IAM Role for EC2

```bash
# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name DesignHackathonScraperRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name DesignHackathonScraperRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam attach-role-policy \
  --role-name DesignHackathonScraperRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name DesignHackathonScraperProfile

aws iam add-role-to-instance-profile \
  --instance-profile-name DesignHackathonScraperProfile \
  --role-name DesignHackathonScraperRole
```

### 4. Deploy Lambda Scheduler

```bash
# Create Lambda function
cd lambda
npm install
zip -r lambda-scheduler.zip .

aws lambda create-function \
  --function-name design-hackathon-scheduler \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda-scheduler.handler \
  --zip-file fileb://lambda-scheduler.zip \
  --timeout 300 \
  --memory-size 256

# Set environment variables
aws lambda update-function-configuration \
  --function-name design-hackathon-scheduler \
  --environment Variables='{
    "KEY_PAIR_NAME":"your-key-pair-name",
    "SECURITY_GROUP_ID":"sg-xxxxxxxxx",
    "IAM_INSTANCE_PROFILE":"DesignHackathonScraperProfile",
    "S3_BUCKET":"your-design-hackathon-bucket"
  }'
```

### 5. Create CloudWatch Events Rule

```bash
# Create rule
aws events put-rule \
  --name design-hackathon-hourly \
  --schedule-expression "rate(1 hour)" \
  --description "Run design hackathon scraper every hour"

# Add Lambda target
aws events put-targets \
  --rule design-hackathon-hourly \
  --targets "Id=1,Arn=arn:aws:lambda:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):function:design-hackathon-scheduler"

# Add Lambda permission
aws lambda add-permission \
  --function-name design-hackathon-scheduler \
  --statement-id EventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):rule/design-hackathon-hourly
```

## 🔄 Manual Deployment (Alternative)

If you prefer manual deployment without Lambda:

```bash
# Make deployment script executable
chmod +x aws-deploy.sh

# Edit configuration in aws-deploy.sh
# - Replace KEY_NAME with your key pair name
# - Replace SECURITY_GROUP with your security group ID

# Run deployment
./aws-deploy.sh
```

## 📊 Monitoring

### View Logs

```bash
# SSH to instance (if still running)
ssh -i your-key.pem ec2-user@INSTANCE_IP

# View systemd logs
journalctl -u design-hackathon-scraper -f

# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/design-hackathon"
```

### Check Status

```bash
# Check instance status
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=design-hackathon-scraper" \
  --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PublicIpAddress}'

# Check Lambda executions
aws logs filter-log-events \
  --log-group-name /aws/lambda/design-hackathon-scheduler \
  --start-time $(date -d '1 hour ago' +%s)000
```

## 💰 Cost Optimization

### Estimated Costs (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 24 executions/day | ~$0.50 |
| EC2 t3.micro | 24 hours total | ~$8.00 |
| CloudWatch Events | 24 events/day | ~$0.50 |
| S3 Storage | 1GB | ~$0.02 |
| **Total** | | **~$9.02** |

### Cost Reduction Tips

1. **Use Spot Instances** for even lower costs
2. **Increase Lambda timeout** to handle longer scraping
3. **Use S3 for data storage** instead of instance storage
4. **Implement retry logic** for failed scrapes

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
AUTO_SHUTDOWN=true          # Enable auto-shutdown
SHUTDOWN_DELAY=30000        # 30 seconds delay
PORT=3001                   # Server port
NODE_ENV=production         # Environment

# AWS configuration
AWS_REGION=us-east-1        # AWS region
S3_BUCKET=your-bucket       # S3 bucket name
```

### API Endpoints

```
GET  /api/health     - Health check
GET  /api/hackathons - Get scraped hackathons
POST /api/scrape     - Trigger new scraping
GET  /api/stats      - Get scraping statistics
POST /api/cleanup    - Clean up duplicates
POST /api/update     - Update existing hackathons
POST /api/shutdown   - Trigger auto-shutdown
```

## 🚨 Troubleshooting

### Common Issues

1. **Instance not starting**
   - Check security group rules
   - Verify key pair exists
   - Check IAM role permissions

2. **Scraper failing**
   - Check internet connectivity
   - Verify website selectors
   - Check Puppeteer installation

3. **Auto-shutdown not working**
   - Verify AUTO_SHUTDOWN environment variable
   - Check systemd service configuration
   - Review user data script

### Debug Commands

```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-xxxxxxxxx

# View user data
aws ec2 describe-instance-attribute \
  --instance-id i-xxxxxxxxx \
  --attribute userData

# Check CloudWatch logs
aws logs describe-log-streams \
  --log-group-name /aws/lambda/design-hackathon-scheduler
```

## 🔄 Updates

### Update Application

```bash
# Create new deployment package
zip -r design-hackathon-scraper-v2.zip . -x "*.git*"

# Upload to S3
aws s3 cp design-hackathon-scraper-v2.zip s3://your-bucket/

# Update Lambda (if using Lambda scheduler)
cd lambda
npm run deploy
```

### Update Scheduling

```bash
# Change schedule to every 2 hours
aws events put-rule \
  --name design-hackathon-hourly \
  --schedule-expression "rate(2 hours)"
```

## 📈 Scaling

### For Higher Volume

1. **Use larger instance types** (t3.small, t3.medium)
2. **Implement parallel scraping** across multiple instances
3. **Use Auto Scaling Groups** for dynamic scaling
4. **Add CloudFront** for API caching

### For Multiple Regions

1. **Deploy Lambda in multiple regions**
2. **Use Route 53** for global routing
3. **Implement cross-region data sync**

## 🔒 Security

### Best Practices

1. **Use VPC** for network isolation
2. **Implement IAM roles** with minimal permissions
3. **Enable CloudTrail** for audit logging
4. **Use KMS** for sensitive data encryption
5. **Regular security updates** for instances

### Security Checklist

- [ ] VPC configured
- [ ] Security groups restricted
- [ ] IAM roles with least privilege
- [ ] CloudTrail enabled
- [ ] Encryption at rest enabled
- [ ] Regular backups configured

## 📞 Support

For issues or questions:

1. Check CloudWatch logs first
2. Review this deployment guide
3. Check AWS documentation
4. Monitor instance metrics

---

**Happy Scraping! 🎨✨** 