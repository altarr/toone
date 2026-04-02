#!/bin/bash
set -e

DOMAIN="tune.trendcyberrange.com"
EMAIL="admin@trendcyberrange.com"

echo "=== Installing Docker ==="
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "=== Cloning project ==="
cd /home/ec2-user
if [ -d "toone" ]; then
  cd toone && git pull
else
  git clone https://github.com/altarr/toone.git
  cd toone
fi

echo "=== Setting environment ==="
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
JWT_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
PUBLIC_IP=${PUBLIC_IP}
JWT_SECRET=${JWT_SECRET}
EOF

echo "=== Step 1: Start with HTTP-only nginx for certbot ==="
cp deploy/nginx-initial.conf deploy/nginx.conf
sudo docker-compose up -d --build server web nginx

echo "=== Step 2: Get SSL certificate ==="
sudo docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email ${EMAIL} \
  --agree-tos \
  --no-eff-email \
  -d ${DOMAIN}

echo "=== Step 3: Switch to HTTPS nginx config ==="
cp deploy/nginx-ssl.conf deploy/nginx.conf
sudo docker-compose restart nginx

echo "=== Done! ==="
echo "Visit https://${DOMAIN}"
echo "Admin login: admin / admin (change on first login)"
