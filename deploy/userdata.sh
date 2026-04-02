#!/bin/bash
set -e
yum update -y
yum install -y docker git
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
cd /home/ec2-user
git clone https://github.com/altarr/toone.git
cd toone
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
JWT_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
PUBLIC_IP=${PUBLIC_IP}
JWT_SECRET=${JWT_SECRET}
EOF
cp deploy/nginx-initial.conf deploy/nginx.conf
docker-compose up -d --build
chown -R ec2-user:ec2-user /home/ec2-user/toone
echo "DEPLOY COMPLETE" > /home/ec2-user/deploy-status.txt
