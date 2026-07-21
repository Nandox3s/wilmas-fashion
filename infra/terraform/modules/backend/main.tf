variable "enabled" { type = bool }
variable "name" { type = string }
variable "instance_type" { type = string }
variable "solution_stack_name" { type = string }
variable "instance_profile_name" {
  type     = string
  nullable = true
}
variable "subnet_ids" { type = list(string) }
variable "security_group_id" {
  type     = string
  nullable = true
}
variable "service_role_arn" {
  type     = string
  nullable = true
}
variable "cors_origins" { type = list(string) }
variable "products_bucket" {
  type     = string
  nullable = true
}
variable "invoices_bucket" {
  type     = string
  nullable = true
}
variable "queue_url" {
  type     = string
  nullable = true
}
variable "rds_secret_arn" {
  type     = string
  nullable = true
}
variable "application_secret_arn" {
  type     = string
  nullable = true
}
variable "database_name" { type = string }

resource "aws_elastic_beanstalk_application" "this" {
  count = var.enabled ? 1 : 0
  name  = var.name
}
resource "aws_elastic_beanstalk_environment" "this" {
  count               = var.enabled ? 1 : 0
  name                = var.name
  application         = aws_elastic_beanstalk_application.this[0].name
  solution_stack_name = var.solution_stack_name
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "SingleInstance"
  }
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = var.service_role_arn
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = var.instance_profile_name
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = var.security_group_id
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", var.subnet_ids)
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "true"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application"
    name      = "Application Healthcheck URL"
    value     = "/api/ping"
  }
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7"
  }
  dynamic "setting" {
    for_each = merge({
      NODE_ENV           = "production"
      PORT               = "8080"
      TRUST_PROXY        = "1"
      CORS_ORIGINS       = join(",", var.cors_origins)
      CHECKOUT_MODE      = "mock"
      PAYMENT_PROVIDER   = "mock"
      INVOICE_PROVIDER   = "mock"
      STORAGE_PROVIDER   = "s3"
      EMAIL_PROVIDER     = "console"
      S3_PRODUCTS_BUCKET = var.products_bucket
      S3_INVOICES_BUCKET = var.invoices_bucket
      RDS_SECRET_ARN     = var.rds_secret_arn
      APP_SECRET_ARN     = var.application_secret_arn
      DATABASE_NAME      = var.database_name
    }, var.queue_url == null ? { INVOICE_QUEUE_PROVIDER = "local" } : { INVOICE_QUEUE_PROVIDER = "sqs", SQS_INVOICE_QUEUE_URL = var.queue_url })
    content {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = setting.key
      value     = setting.value
    }
  }
}

resource "aws_cloudfront_distribution" "https" {
  count               = var.enabled ? 1 : 0
  enabled             = true
  comment             = "HTTPS endpoint for ${var.name} single-instance backend"
  price_class         = "PriceClass_100"
  wait_for_deployment = false
  origin {
    domain_name = aws_elastic_beanstalk_environment.this[0].cname
    origin_id   = "elastic-beanstalk"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id       = "elastic-beanstalk"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin"]
      cookies { forward = "all" }
    }
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}

output "url" { value = try(aws_elastic_beanstalk_environment.this[0].cname, null) }
output "https_url" { value = try("https://${aws_cloudfront_distribution.https[0].domain_name}", null) }
