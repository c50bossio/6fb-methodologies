# 6FB Methodologies Workshop - Terraform Variables
# Configuration variables for infrastructure deployment

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"

  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-west-2", "eu-central-1",
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"
    ], var.aws_region)
    error_message = "AWS region must be a valid region."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "project_name" {
  description = "Project name for resource naming and tagging"
  type        = string
  default     = "6fb-methodologies"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "6fbmethodologies.com"

  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid domain format."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"

  validation {
    condition     = can(regex("^1\\.(2[4-9]|[3-9][0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.24 or higher."
  }
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL database"
  type        = string
  default     = "db.t3.medium"

  validation {
    condition = contains([
      "db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large",
      "db.r5.large", "db.r5.xlarge", "db.r5.2xlarge",
      "db.m5.large", "db.m5.xlarge", "db.m5.2xlarge"
    ], var.db_instance_class)
    error_message = "DB instance class must be a valid RDS instance type."
  }
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition = contains([
      "cache.t3.micro", "cache.t3.small", "cache.t3.medium",
      "cache.m5.large", "cache.m5.xlarge", "cache.r5.large"
    ], var.redis_node_type)
    error_message = "Redis node type must be a valid ElastiCache node type."
  }
}

# ==============================================
# Application Configuration Variables
# ==============================================

variable "stripe_secret_key" {
  description = "Stripe secret key for payment processing"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^sk_(test_|live_)[a-zA-Z0-9]+$", var.stripe_secret_key))
    error_message = "Stripe secret key must be in valid format (sk_test_ or sk_live_)."
  }
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key for client-side integration"
  type        = string

  validation {
    condition     = can(regex("^pk_(test_|live_)[a-zA-Z0-9]+$", var.stripe_publishable_key))
    error_message = "Stripe publishable key must be in valid format (pk_test_ or pk_live_)."
  }
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook endpoint secret for signature verification"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^whsec_[a-zA-Z0-9]+$", var.stripe_webhook_secret))
    error_message = "Stripe webhook secret must be in valid format (whsec_)."
  }
}

variable "twilio_account_sid" {
  description = "Twilio Account SID for SMS notifications"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^AC[a-f0-9]{32}$", var.twilio_account_sid))
    error_message = "Twilio Account SID must be in valid format (AC followed by 32 hex chars)."
  }
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token for SMS authentication"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.twilio_auth_token) == 32
    error_message = "Twilio Auth Token must be 32 characters long."
  }
}

variable "twilio_phone_number" {
  description = "Twilio phone number for sending SMS notifications"
  type        = string

  validation {
    condition     = can(regex("^\\+1[0-9]{10}$", var.twilio_phone_number))
    error_message = "Twilio phone number must be in E.164 format (+1XXXXXXXXXX)."
  }
}

variable "webhook_secret" {
  description = "Generic webhook secret for signature verification"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.webhook_secret) >= 32
    error_message = "Webhook secret must be at least 32 characters long."
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for DNS management"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.cloudflare_api_token) > 20
    error_message = "Cloudflare API token must be provided."
  }
}

# ==============================================
# Email Configuration Variables
# ==============================================

variable "sendgrid_api_key" {
  description = "SendGrid API key for email notifications"
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.sendgrid_api_key == "" || can(regex("^SG\\.[a-zA-Z0-9_-]+$", var.sendgrid_api_key))
    error_message = "SendGrid API key must be in valid format (SG.xxx) or empty."
  }
}

variable "from_email" {
  description = "From email address for outbound notifications"
  type        = string
  default     = "noreply@6fbmethodologies.com"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.from_email))
    error_message = "From email must be a valid email address."
  }
}

# ==============================================
# Monitoring and Alerting Variables
# ==============================================

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.slack_webhook_url == "" || can(regex("^https://hooks\\.slack\\.com/", var.slack_webhook_url))
    error_message = "Slack webhook URL must be a valid Slack webhook or empty."
  }
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.grafana_admin_password == "" || length(var.grafana_admin_password) >= 8
    error_message = "Grafana admin password must be at least 8 characters or empty for auto-generation."
  }
}

# ==============================================
# Infrastructure Scaling Variables
# ==============================================

variable "min_nodes" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 2

  validation {
    condition     = var.min_nodes >= 1 && var.min_nodes <= 10
    error_message = "Minimum nodes must be between 1 and 10."
  }
}

variable "max_nodes" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 6

  validation {
    condition     = var.max_nodes >= var.min_nodes && var.max_nodes <= 20
    error_message = "Maximum nodes must be greater than or equal to min_nodes and not exceed 20."
  }
}

variable "desired_nodes" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 3

  validation {
    condition     = var.desired_nodes >= var.min_nodes && var.desired_nodes <= var.max_nodes
    error_message = "Desired nodes must be between min_nodes and max_nodes."
  }
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "spot_max_price" {
  description = "Maximum price for spot instances (USD per hour)"
  type        = string
  default     = "0.10"

  validation {
    condition     = can(regex("^[0-9]+(\\.[0-9]+)?$", var.spot_max_price))
    error_message = "Spot max price must be a valid decimal number."
  }
}

# ==============================================
# Security Configuration Variables
# ==============================================

variable "enable_waf" {
  description = "Enable AWS WAF for additional security"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster API"
  type        = list(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition = alltrue([
      for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))
    ])
    error_message = "All CIDR blocks must be valid."
  }
}

variable "enable_cluster_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  validation {
    condition = alltrue([
      for log_type in var.enable_cluster_log_types : contains([
        "api", "audit", "authenticator", "controllerManager", "scheduler"
      ], log_type)
    ])
    error_message = "Log types must be valid EKS log types."
  }
}

# ==============================================
# Backup and Disaster Recovery Variables
# ==============================================

variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "snapshot_schedule" {
  description = "Cron expression for automated snapshots"
  type        = string
  default     = "0 3 * * *"  # Daily at 3 AM

  validation {
    condition     = can(regex("^[0-9*,-/ ]+$", var.snapshot_schedule))
    error_message = "Snapshot schedule must be a valid cron expression."
  }
}

# ==============================================
# Cost Optimization Variables
# ==============================================

variable "enable_cost_alerts" {
  description = "Enable cost monitoring and alerts"
  type        = bool
  default     = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD for cost alerts"
  type        = number
  default     = 500

  validation {
    condition     = var.monthly_budget_limit > 0
    error_message = "Monthly budget limit must be greater than 0."
  }
}

variable "budget_alert_threshold" {
  description = "Budget alert threshold as a percentage (0-100)"
  type        = number
  default     = 80

  validation {
    condition     = var.budget_alert_threshold > 0 && var.budget_alert_threshold <= 100
    error_message = "Budget alert threshold must be between 1 and 100."
  }
}

# ==============================================
# Feature Flags
# ==============================================

variable "enable_monitoring" {
  description = "Enable Prometheus and Grafana monitoring stack"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging with Elasticsearch/OpenSearch"
  type        = bool
  default     = true
}

variable "enable_istio" {
  description = "Enable Istio service mesh"
  type        = bool
  default     = false
}

variable "enable_cert_manager" {
  description = "Enable cert-manager for automatic SSL certificate management"
  type        = bool
  default     = true
}

variable "enable_external_dns" {
  description = "Enable external-dns for automatic DNS record management"
  type        = bool
  default     = true
}