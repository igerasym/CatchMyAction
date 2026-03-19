#!/bin/bash
set -euo pipefail

# ============================================================
# SurfShots AWS Deploy — DEV/CHEAP version
# ~$3-5/month: RDS t4g.micro (free tier) + Fargate minimal
# ============================================================

APP_NAME="surfshots"
REGION="${AWS_REGION:-us-east-1}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)}"

echo "🏄 Deploying SurfShots to AWS ($REGION) — CHEAP mode"
echo "============================================"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ---- 1. ECR Repository ----
echo "📦 ECR..."
aws ecr describe-repositories --repository-names $APP_NAME --region $REGION 2>/dev/null || \
  aws ecr create-repository --repository-name $APP_NAME --region $REGION \
    --image-scanning-configuration scanOnPush=false
ECR_URI=$(aws ecr describe-repositories --repository-names $APP_NAME --region $REGION \
  --query 'repositories[0].repositoryUri' --output text)

# ---- 2. S3 Buckets ----
echo "🪣 S3..."
ORIGINALS_BUCKET="${APP_NAME}-originals-${ACCOUNT_ID}"
PREVIEWS_BUCKET="${APP_NAME}-previews-${ACCOUNT_ID}"
for BUCKET in $ORIGINALS_BUCKET $PREVIEWS_BUCKET; do
  aws s3api head-bucket --bucket $BUCKET 2>/dev/null || \
    aws s3api create-bucket --bucket $BUCKET --region $REGION \
      $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION" || echo "")
done

aws s3api put-public-access-block --bucket $ORIGINALS_BUCKET \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
aws s3api delete-public-access-block --bucket $PREVIEWS_BUCKET 2>/dev/null || true
cat > /tmp/preview-policy.json << POLICY
{"Version":"2012-10-17","Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::${PREVIEWS_BUCKET}/*"}]}
POLICY
aws s3api put-bucket-policy --bucket $PREVIEWS_BUCKET --policy file:///tmp/preview-policy.json
echo "  S3: $ORIGINALS_BUCKET (private), $PREVIEWS_BUCKET (public)"

# ---- 3. Default VPC (reuse — free, no NAT needed) ----
echo "🌐 Using default VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text --region $REGION)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' --output text --region $REGION)
SUB1=$(echo $SUBNETS | awk '{print $1}')
SUB2=$(echo $SUBNETS | awk '{print $2}')
echo "  VPC: $VPC_ID | Subnets: $SUB1, $SUB2"

# ---- 4. Security Groups ----
echo "🔒 Security groups..."
get_or_create_sg() {
  local NAME=$1 DESC=$2
  local SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null)
  if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    SG_ID=$(aws ec2 create-security-group --group-name $NAME --description "$DESC" \
      --vpc-id $VPC_ID --region $REGION --query 'GroupId' --output text)
  fi
  echo $SG_ID
}

ALB_SG=$(get_or_create_sg "${APP_NAME}-alb" "ALB")
ECS_SG=$(get_or_create_sg "${APP_NAME}-ecs" "ECS")
RDS_SG=$(get_or_create_sg "${APP_NAME}-rds" "RDS")

# Ingress rules (idempotent — ignore errors if already exists)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 3000 --source-group $ALB_SG --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $ECS_SG --region $REGION 2>/dev/null || true

# ---- 5. RDS PostgreSQL — db.t4g.micro (FREE TIER) ----
echo "🐘 RDS PostgreSQL (t4g.micro — free tier)..."
DB_EXISTS=$(aws rds describe-db-instances --db-instance-identifier ${APP_NAME}-db --region $REGION \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "not-found")

if [ "$DB_EXISTS" = "not-found" ]; then
  aws rds create-db-instance \
    --db-instance-identifier ${APP_NAME}-db \
    --db-instance-class db.t4g.micro \
    --engine postgres \
    --engine-version 15 \
    --master-username surfadmin \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --db-name surfshots \
    --vpc-security-group-ids $RDS_SG \
    --no-multi-az \
    --backup-retention-period 1 \
    --no-auto-minor-version-upgrade \
    --publicly-accessible \
    --region $REGION
  echo "  ⏳ Waiting for DB (3-5 min)..."
  aws rds wait db-instance-available --db-instance-identifier ${APP_NAME}-db --region $REGION
fi

DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier ${APP_NAME}-db --region $REGION \
  --query 'DBInstances[0].Endpoint.Address' --output text)
DATABASE_URL="postgresql://surfadmin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/surfshots?schema=public"
echo "  DB: $DB_ENDPOINT"

# ---- 6. IAM Roles ----
echo "👤 IAM..."
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam get-role --role-name ${APP_NAME}-exec 2>/dev/null || \
  aws iam create-role --role-name ${APP_NAME}-exec --assume-role-policy-document "$TRUST"
aws iam attach-role-policy --role-name ${APP_NAME}-exec \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

aws iam get-role --role-name ${APP_NAME}-task 2>/dev/null || \
  aws iam create-role --role-name ${APP_NAME}-task --assume-role-policy-document "$TRUST"
cat > /tmp/s3pol.json << SPOL
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:PutObject","s3:GetObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::${ORIGINALS_BUCKET}/*","arn:aws:s3:::${PREVIEWS_BUCKET}/*"]}]}
SPOL
aws iam put-role-policy --role-name ${APP_NAME}-task --policy-name s3 --policy-document file:///tmp/s3pol.json

EXEC_ROLE="arn:aws:iam::${ACCOUNT_ID}:role/${APP_NAME}-exec"
TASK_ROLE="arn:aws:iam::${ACCOUNT_ID}:role/${APP_NAME}-task"

# ---- 7. Docker Build & Push ----
echo "🐳 Building image..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
docker build --platform linux/amd64 -t $APP_NAME ..
docker tag $APP_NAME:latest $ECR_URI:latest
docker push $ECR_URI:latest
IMAGE="$ECR_URI:latest"

# ---- 8. ALB ----
echo "⚖️  ALB..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names ${APP_NAME}-alb --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "None")
if [ "$ALB_ARN" = "None" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer --name ${APP_NAME}-alb \
    --subnets $SUB1 $SUB2 --security-groups $ALB_SG \
    --scheme internet-facing --type application --region $REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
fi
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION \
  --query 'LoadBalancers[0].DNSName' --output text)

TG_ARN=$(aws elbv2 describe-target-groups --names ${APP_NAME}-tg --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "None")
if [ "$TG_ARN" = "None" ]; then
  TG_ARN=$(aws elbv2 create-target-group --name ${APP_NAME}-tg \
    --protocol HTTP --port 3000 --vpc-id $VPC_ID --target-type ip \
    --health-check-path "/" --health-check-interval-seconds 60 \
    --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
    --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text)
fi

LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $REGION \
  --query 'Listeners[0].ListenerArn' --output text 2>/dev/null || echo "None")
if [ "$LISTENER" = "None" ]; then
  aws elbv2 create-listener --load-balancer-arn $ALB_ARN \
    --protocol HTTP --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN --region $REGION
fi
echo "  ALB: $ALB_DNS"

# ---- 9. ECS (Fargate SPOT — 70% cheaper) ----
echo "🚀 ECS Fargate..."

aws ecs describe-clusters --clusters $APP_NAME --region $REGION \
  --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE || \
  aws ecs create-cluster --cluster-name $APP_NAME --region $REGION \
    --capacity-providers FARGATE_SPOT FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1

aws logs create-log-group --log-group-name /ecs/$APP_NAME --region $REGION 2>/dev/null || true

# Task def — minimal: 256 CPU, 512 MB
cat > /tmp/taskdef.json << TD
{
  "family": "${APP_NAME}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${EXEC_ROLE}",
  "taskRoleArn": "${TASK_ROLE}",
  "containerDefinitions": [{
    "name": "${APP_NAME}",
    "image": "${IMAGE}",
    "portMappings": [{"containerPort": 3000}],
    "environment": [
      {"name": "DATABASE_URL", "value": "${DATABASE_URL}"},
      {"name": "AWS_REGION", "value": "${REGION}"},
      {"name": "S3_BUCKET_ORIGINALS", "value": "${ORIGINALS_BUCKET}"},
      {"name": "S3_BUCKET_PREVIEWS", "value": "${PREVIEWS_BUCKET}"},
      {"name": "NEXT_PUBLIC_APP_URL", "value": "http://${ALB_DNS}"},
      {"name": "NODE_ENV", "value": "production"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/${APP_NAME}",
        "awslogs-region": "${REGION}",
        "awslogs-stream-prefix": "app"
      }
    },
    "essential": true
  }]
}
TD
aws ecs register-task-definition --cli-input-json file:///tmp/taskdef.json --region $REGION > /dev/null

SVC=$(aws ecs describe-services --cluster $APP_NAME --services $APP_NAME --region $REGION \
  --query 'services[0].status' --output text 2>/dev/null || echo "MISSING")

if [ "$SVC" = "ACTIVE" ]; then
  aws ecs update-service --cluster $APP_NAME --service $APP_NAME \
    --task-definition $APP_NAME --force-new-deployment --region $REGION > /dev/null
else
  aws ecs create-service --cluster $APP_NAME --service-name $APP_NAME \
    --task-definition $APP_NAME --desired-count 1 \
    --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1 \
    --network-configuration "awsvpcConfiguration={subnets=[$SUB1,$SUB2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$APP_NAME,containerPort=3000" \
    --region $REGION > /dev/null
fi

echo ""
echo "============================================"
echo "✅ Deploy complete!"
echo ""
echo "🌐 URL:     http://$ALB_DNS"
echo "🐘 DB:      $DB_ENDPOINT"
echo "🔑 DB Pass: $DB_PASSWORD"
echo "🪣 S3:      $ORIGINALS_BUCKET / $PREVIEWS_BUCKET"
echo ""
echo "Next: push schema to RDS:"
echo "  DATABASE_URL=\"$DATABASE_URL\" npx prisma db push"
echo ""
echo "💰 Cost: ~\$3-5/mo (RDS free tier + Fargate Spot)"
echo "🗑️  To destroy: ./destroy.sh"
echo "============================================"
