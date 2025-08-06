const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

exports.handler = async (event) => {
    console.log('🚀 Lambda scheduler triggered');
    
    try {
        // Get the latest AMI ID for Amazon Linux 2
        const amiResponse = await ec2.describeImages({
            Owners: ['amazon'],
            Filters: [
                {
                    Name: 'name',
                    Values: ['amzn2-ami-hvm-*-x86_64-gp2']
                },
                {
                    Name: 'state',
                    Values: ['available']
                }
            ]
        }).promise();
        
        const latestAMI = amiResponse.Images.sort((a, b) => 
            new Date(b.CreationDate) - new Date(a.CreationDate)
        )[0];
        
        // User data script that will run on the EC2 instance
        const userData = `#!/bin/bash
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

# Download application from S3 (you'll need to upload your app to S3)
aws s3 cp s3://your-bucket-name/design-hackathon-scraper.zip .
unzip design-hackathon-scraper.zip

# Install dependencies
npm install

# Create environment file
cat > .env << 'ENVEOF'
AUTO_SHUTDOWN=true
SHUTDOWN_DELAY=30000
PORT=3001
NODE_ENV=production
ENVEOF

# Run the scraper
node server.js

# Wait for completion
sleep 30

# Shutdown instance
shutdown -h now
`;
        
        // Create EC2 instance
        const instanceParams = {
            ImageId: latestAMI.ImageId,
            MinCount: 1,
            MaxCount: 1,
            InstanceType: 't3.micro',
            KeyName: process.env.KEY_PAIR_NAME,
            SecurityGroupIds: [process.env.SECURITY_GROUP_ID],
            UserData: Buffer.from(userData).toString('base64'),
            IamInstanceProfile: {
                Name: process.env.IAM_INSTANCE_PROFILE
            },
            TagSpecifications: [
                {
                    ResourceType: 'instance',
                    Tags: [
                        {
                            Key: 'Name',
                            Value: 'design-hackathon-scraper'
                        },
                        {
                            Key: 'Purpose',
                            Value: 'scraping'
                        }
                    ]
                }
            ]
        };
        
        console.log('📦 Creating EC2 instance...');
        const instanceResponse = await ec2.runInstances(instanceParams).promise();
        const instanceId = instanceResponse.Instances[0].InstanceId;
        
        console.log(`✅ Instance created: ${instanceId}`);
        
        // Wait for instance to be running
        console.log('⏳ Waiting for instance to be running...');
        await ec2.waitFor('instanceRunning', { InstanceIds: [instanceId] }).promise();
        
        // Get instance details
        const instanceDetails = await ec2.describeInstances({
            InstanceIds: [instanceId]
        }).promise();
        
        const publicIp = instanceDetails.Reservations[0].Instances[0].PublicIpAddress;
        console.log(`🌐 Instance IP: ${publicIp}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Scraping instance created successfully',
                instanceId: instanceId,
                publicIp: publicIp,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Error creating instance:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to create scraping instance',
                details: error.message
            })
        };
    }
}; 