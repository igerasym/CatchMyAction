#!/bin/bash
set -euo pipefail

APP_NAME="surfshots"
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🗑️  Destroying SurfShots ($REGION)..."

# ECS
echo "  ECS..."
aws ecs update-service --cluster $APP_NAME --service $APP_NAME --desired-count 0 --region $REGION 2>/dev/null || true
aws ecs delete-service --cluster $APP_NAME --service $APP_NAME --force --region $REGION 2>/dev/null || true
sleep 5
aws ecs delete-cluster --cluster $APP_NAME --region $REGION 2>/dev/null || true

# ALB
echo "  ALB..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names ${APP_NAME}-alb --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "")
if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
  for L in $(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN \
    --query 'Listeners[*].ListenerArn' --output text --region $REGION 2>/dev/null); do
    aws elbv2 delete-listener --listener-arn $L --region $REGION 2>/dev/null || true
  done
  aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $REGION
fi
sleep 3
TG_ARN=$(aws elbv2 describe-target-groups --names ${APP_NAME}-tg --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
[ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ] && \
  aws elbv2 delete-target-group --target-group-arn $TG_ARN --region $REGION 2>/dev/null || true

# RDS
echo "  RDS..."
aws rds delete-db-instance --db-instance-identifier ${APP_NAME}-db \
  --skip-final-snapshot --delete-automated-backups --region $REGION 2>/dev/null || true
echo "  (RDS deletion takes a few minutes in background)"

# S3
echo "  S3..."
for B in ${APP_NAME}-originals-${ACCOUNT_ID} ${APP_NAME}-previews-${ACCOUNT_ID}; do
  aws s3 rm s3://$B --recursive --region $REGION 2>/dev/null || true
  aws s3api delete-bucket --bucket $B --region $REGION 2>/dev/null || true
done

# ECR
echo "  ECR..."
aws ecr delete-repository --repository-name $APP_NAME --force --region $REGION 2>/dev/null || true

# IAM
echo "  IAM..."
aws iam delete-role-policy --role-name ${APP_NAME}-task --policy-name s3 2>/dev/null || true
aws iam detach-role-policy --role-name ${APP_NAME}-exec \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true
aws iam delete-role --role-name ${APP_NAME}-task 2>/dev/null || true
aws iam delete-role --role-name ${APP_NAME}-exec 2>/dev/null || true

# Security Groups (in default VPC)
echo "  Security groups..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text --region $REGION)
for SG_NAME in ${APP_NAME}-alb ${APP_NAME}-ecs ${APP_NAME}-rds; do
  SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null || echo "None")
  [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ] && \
    aws ec2 delete-security-group --group-id $SG_ID --region $REGION 2>/dev/null || true
done

# Logs
aws logs delete-log-group --log-group-name /ecs/$APP_NAME --region $REGION 2>/dev/null || true

echo "✅ Done. RDS may take a few more minutes to fully delete."
