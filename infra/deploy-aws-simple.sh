#!/bin/bash
set -e

# ============================================
# CatchMyAction — Simple AWS Deploy
# EC2 (app + PostgreSQL) + S3 (photos)
# ============================================

REGION=$(aws configure get region)
APP_NAME="catchmyaction"
DOMAIN="catchmyactions.com"
KEY_NAME="${APP_NAME}-key"
SG_NAME="${APP_NAME}-sg"
INSTANCE_TYPE="t4g.micro"   # 1GB RAM, ARM64, ~$6/mo

echo "🚀 Deploying CatchMyAction to AWS ($REGION)"
echo "============================================="

# 1. Create SSH key pair
echo "🔑 Creating SSH key pair..."
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" 2>/dev/null; then
  echo "   Key pair already exists"
else
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --key-type ed25519 \
    --query 'KeyMaterial' \
    --output text \
    --region "$REGION" > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "   ✅ Key saved to ${KEY_NAME}.pem"
fi

# 2. Create security group
echo "🔒 Creating security group..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region "$REGION")

SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "CatchMyAction - HTTP/HTTPS/SSH" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text \
    --region "$REGION")

  # SSH
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$REGION"
  # HTTP
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION"
  # HTTPS
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$REGION"
  # App port
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region "$REGION"
  echo "   ✅ Security group: $SG_ID"
else
  echo "   Security group already exists: $SG_ID"
fi

# 3. Create S3 buckets
echo "📦 Creating S3 buckets..."
for BUCKET in "${APP_NAME}-originals-${REGION}" "${APP_NAME}-previews-${REGION}"; do
  if aws s3 ls "s3://${BUCKET}" 2>/dev/null; then
    echo "   Bucket $BUCKET already exists"
  else
    aws s3 mb "s3://${BUCKET}" --region "$REGION"
    echo "   ✅ Created $BUCKET"
  fi
done

# Make previews bucket public (for serving watermarked previews)
aws s3api put-public-access-block \
  --bucket "${APP_NAME}-previews-${REGION}" \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region "$REGION" 2>/dev/null || true

aws s3api put-bucket-policy \
  --bucket "${APP_NAME}-previews-${REGION}" \
  --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicRead\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${APP_NAME}-previews-${REGION}/*\"}]}" \
  --region "$REGION" 2>/dev/null || true

# 4. Find latest Amazon Linux 2023 ARM64 AMI
echo "🖥️  Finding AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-arm64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region "$REGION")
echo "   AMI: $AMI_ID"

# 5. Create user data script
echo "📝 Creating startup script..."
cat > /tmp/userdata.sh << 'USERDATA'
#!/bin/bash
set -e

# Install Docker
yum update -y
yum install -y docker git

# Add 1GB swap (t4g.micro only has 1GB RAM)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repo
cd /home/ec2-user
git clone https://github.com/igerasym/CatchMyAction.git app
cd app

# Create docker-compose for production
cat > docker-compose.production.yml << 'EOF'
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: catchmyaction
      POSTGRES_PASSWORD: CatchMyAction2026!
      POSTGRES_DB: catchmyaction
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catchmyaction"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    volumes:
      - uploads:/app/public/uploads
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
  uploads:
EOF

# Create env file (will be updated with real values via SSM or manually)
cat > .env.production << 'ENVEOF'
DATABASE_URL=postgresql://catchmyaction:CatchMyAction2026!@postgres:5432/catchmyaction?schema=public
NEXTAUTH_SECRET=PLACEHOLDER_WILL_BE_REPLACED
NEXTAUTH_URL=https://catchmyaction.live
NEXT_PUBLIC_APP_URL=https://catchmyaction.live
STRIPE_SECRET_KEY=PLACEHOLDER
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=PLACEHOLDER
STRIPE_WEBHOOK_SECRET=
USE_LOCAL_STORAGE=true
ENVEOF

chown -R ec2-user:ec2-user /home/ec2-user/app
USERDATA

# 6. Launch EC2 instance
echo "🖥️  Launching EC2 instance..."
EXISTING=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$APP_NAME" "Name=instance-state-name,Values=running,pending" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text \
  --region "$REGION" 2>/dev/null || echo "None")

if [ "$EXISTING" != "None" ] && [ -n "$EXISTING" ]; then
  INSTANCE_ID="$EXISTING"
  echo "   Instance already running: $INSTANCE_ID"
else
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data file:///tmp/userdata.sh \
    --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region "$REGION")
  echo "   ✅ Instance launched: $INSTANCE_ID"
fi

# 7. Wait for instance
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text \
  --region "$REGION")

echo ""
echo "============================================="
echo "✅ EC2 instance is running!"
echo "============================================="
echo ""
echo "🌐 Public IP: $PUBLIC_IP"
echo "🔑 SSH: ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Wait 3-5 min for Docker to install (user-data script)"
echo ""
echo "2. SSH in and update the env file:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo "   cd app"
echo "   nano .env.production"
echo "   # Update NEXTAUTH_SECRET, STRIPE keys"
echo ""
echo "3. Build and start:"
echo "   docker-compose -f docker-compose.production.yml up -d --build"
echo "   docker-compose -f docker-compose.production.yml exec app npx prisma db push"
echo "   docker-compose -f docker-compose.production.yml exec app npx tsx prisma/seed.ts"
echo ""
echo "4. Point Cloudflare DNS:"
echo "   Type: A"
echo "   Name: @"
echo "   Content: ${PUBLIC_IP}"
echo "   Proxy: ON (orange cloud)"
echo ""
echo "5. In Cloudflare SSL/TLS → set to 'Flexible'"
echo "   (Cloudflare handles HTTPS, talks HTTP to your server)"
echo ""
echo "🌍 Your app will be at: https://${DOMAIN}"
echo ""
