# 6FB Methodologies Workshop - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the 6FB Methodologies ticket sales platform to production with enterprise-grade infrastructure, security, monitoring, and disaster recovery capabilities.

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- kubectl configured for Kubernetes access
- Docker installed and configured
- GitHub repository access

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/6fb-methodologies.git
cd 6fb-methodologies

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with your actual values

# Verify Docker build
docker build -t 6fb-methodologies:latest .
```

### 2. Infrastructure Deployment

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review and customize variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values

# Plan the deployment
terraform plan -var-file="terraform.tfvars"

# Deploy infrastructure
terraform apply -var-file="terraform.tfvars"
```

### 3. Application Deployment

```bash
# Configure kubectl for the new EKS cluster
aws eks update-kubeconfig --region us-east-1 --name 6fb-methodologies-production

# Create namespace
kubectl create namespace 6fb-methodologies

# Deploy application
kubectl apply -f infrastructure/kubernetes/base/
```

## 📋 Detailed Deployment Steps

### Phase 1: Infrastructure Foundation

#### 1.1 AWS Infrastructure

The Terraform configuration creates:

- **VPC** with public, private, and database subnets across 3 AZs
- **EKS Cluster** with managed node groups (on-demand and spot instances)
- **RDS PostgreSQL** with Multi-AZ deployment and automated backups
- **ElastiCache Redis** cluster for caching and sessions
- **Application Load Balancer** with SSL termination
- **CloudWatch** logging and monitoring
- **IAM Roles** with least-privilege access
- **Security Groups** with minimal required access

#### 1.2 DNS and SSL

- Cloudflare DNS management
- Automatic SSL certificate provisioning via ACM
- DNS validation for certificates

### Phase 2: Container Registry and Images

#### 2.1 Build and Push Images

```bash
# Build production image
docker build -t 6fb-methodologies:latest .

# Tag for registry
docker tag 6fb-methodologies:latest ghcr.io/your-org/6fb-methodologies:latest

# Push to registry
docker push ghcr.io/your-org/6fb-methodologies:latest
```

#### 2.2 Update Kubernetes Manifests

```bash
# Update image references in deployment.yaml
sed -i 's|6fb-methodologies:latest|ghcr.io/your-org/6fb-methodologies:latest|g' infrastructure/kubernetes/base/deployment.yaml
```

### Phase 3: Security Configuration

#### 3.1 Secrets Management

```bash
# Create secrets from AWS Secrets Manager
kubectl create secret generic 6fb-methodologies-secrets \
  --from-literal=DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id 6fb-methodologies-prod-secrets --query SecretString --output text | jq -r .DATABASE_URL)" \
  --from-literal=REDIS_URL="$(aws secretsmanager get-secret-value --secret-id 6fb-methodologies-prod-secrets --query SecretString --output text | jq -r .REDIS_URL)" \
  --namespace 6fb-methodologies
```

#### 3.2 Network Policies

```bash
# Apply network policies
kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml
```

### Phase 4: Application Deployment

#### 4.1 Database Migration

```bash
# Run database migrations (handled by init container)
kubectl logs -f deployment/6fb-methodologies-app -c database-migration -n 6fb-methodologies
```

#### 4.2 Application Verification

```bash
# Check pod status
kubectl get pods -n 6fb-methodologies

# Check service endpoints
kubectl get svc -n 6fb-methodologies

# Test health endpoint
kubectl port-forward svc/6fb-methodologies-app-service 3000:80 -n 6fb-methodologies
curl http://localhost:3000/api/health
```

### Phase 5: Monitoring and Alerting

#### 5.1 Deploy Monitoring Stack

```bash
# Deploy Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus/values.yaml

# Deploy Grafana dashboards
kubectl apply -f monitoring/grafana/dashboards/
```

#### 5.2 Configure Alerting

```bash
# Apply AlertManager configuration
kubectl apply -f monitoring/alertmanager/
```

### Phase 6: Load Balancer and Ingress

#### 6.1 Install Ingress Controller

```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

#### 6.2 Configure Ingress

```bash
# Apply ingress configuration
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
```

## 🔒 Security Hardening

### Network Security

- VPC with private subnets for application workloads
- Security groups with minimal required access
- Network policies for pod-to-pod communication
- WAF rules for application-layer protection

### Application Security

- Container security with non-root users
- Read-only root filesystem
- Resource limits and quotas
- Pod security policies
- Image vulnerability scanning

### Data Security

- Encryption at rest for databases and storage
- Encryption in transit with TLS 1.3
- Secret management with AWS Secrets Manager
- Audit logging for all API access

## 📊 Monitoring and Observability

### Application Metrics

- Custom business metrics (ticket sales, inventory levels)
- Performance metrics (response times, error rates)
- Resource utilization (CPU, memory, network)

### Infrastructure Metrics

- Kubernetes cluster health
- Database performance metrics
- Load balancer metrics
- Network performance

### Alerting

- Critical system failures
- Performance degradation
- Security incidents
- Business metric anomalies

## 🔄 Backup and Disaster Recovery

### Automated Backups

```bash
# Database backups (automated via RDS)
# - Daily automated backups with 30-day retention
# - Point-in-time recovery capability

# Application state backups
kubectl create cronjob backup-app-data \
  --image=6fb-methodologies:latest \
  --schedule="0 2 * * *" \
  --restart=OnFailure \
  -- /app/scripts/backup-app-data.sh
```

### Disaster Recovery Testing

```bash
# Test disaster recovery procedures
./scripts/disaster-recovery.sh assess
./scripts/disaster-recovery.sh validate
```

## 📈 Scaling and Performance

### Horizontal Pod Autoscaling

- CPU-based scaling (target: 70%)
- Memory-based scaling (target: 80%)
- Custom metrics scaling (requests per second)

### Cluster Autoscaling

- Node group autoscaling based on pod resource requests
- Spot instance integration for cost optimization

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling with PgBouncer
- Query optimization and indexing

## 💰 Cost Optimization

### Infrastructure Optimization

- Spot instances for non-critical workloads
- Right-sizing based on actual usage
- Reserved instances for predictable workloads
- S3 lifecycle policies for backup storage

### Monitoring and Alerting

- Cost monitoring with AWS Budgets
- Resource utilization dashboards
- Automated cost optimization recommendations

## 🧪 Testing and Validation

### Pre-deployment Testing

```bash
# Run full test suite
npm run test:all

# Performance testing
npm run test:load

# Security testing
npm run test:security
```

### Post-deployment Validation

```bash
# Health checks
./scripts/health-check.sh

# End-to-end testing
npm run test:e2e:production

# Load testing
npm run test:load:production
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name> -n 6fb-methodologies

# Check events
kubectl describe pod <pod-name> -n 6fb-methodologies

# Check resource constraints
kubectl top pod -n 6fb-methodologies
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- psql $DATABASE_URL

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
kubectl describe certificate 6fb-methodologies-tls -n 6fb-methodologies

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager
```

### Log Analysis

```bash
# Application logs
kubectl logs -f deployment/6fb-methodologies-app -n 6fb-methodologies

# Ingress logs
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx

# Database logs (RDS CloudWatch)
aws logs tail /aws/rds/instance/6fb-methodologies-postgres/postgresql --follow
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor application health and performance
- Review error logs and alerts
- Check resource utilization

#### Weekly
- Update security patches
- Review and rotate secrets
- Analyze performance trends

#### Monthly
- Security vulnerability assessment
- Disaster recovery testing
- Cost optimization review

### Emergency Contacts

- **DevOps Team**: devops@6fbmethodologies.com
- **Security Team**: security@6fbmethodologies.com
- **On-call Engineer**: +1-XXX-XXX-XXXX

### Runbooks

- Application restart: `./runbooks/restart-application.md`
- Database failover: `./runbooks/database-failover.md`
- Security incident: `./runbooks/security-incident.md`

## 🔗 Additional Resources

- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Prometheus Monitoring Guide](https://prometheus.io/docs/guides/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

## 📝 Deployment Checklist

### Pre-deployment
- [ ] Infrastructure Terraform plan reviewed and approved
- [ ] Security scan completed with no critical issues
- [ ] Load testing completed successfully
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting configured
- [ ] DNS and SSL certificates ready

### Deployment
- [ ] Infrastructure deployed successfully
- [ ] Application deployed and health checks passing
- [ ] Database migrations completed
- [ ] Monitoring stack operational
- [ ] Backup procedures verified
- [ ] Load balancer and ingress configured

### Post-deployment
- [ ] End-to-end testing completed
- [ ] Performance baseline established
- [ ] Security monitoring active
- [ ] Cost monitoring configured
- [ ] Documentation updated
- [ ] Team notified of successful deployment

---

**Deployment completed successfully!** 🎉

The 6FB Methodologies Workshop ticket sales platform is now running in production with enterprise-grade infrastructure, security, monitoring, and disaster recovery capabilities.