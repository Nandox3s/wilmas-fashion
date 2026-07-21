variable "name" { type = string }
variable "enabled" { type = bool }
variable "queue_name" {
  type     = string
  nullable = true
}
variable "dlq_name" {
  type     = string
  nullable = true
}
variable "backend_environment_name" {
  type     = string
  nullable = true
}
variable "rds_identifier" {
  type     = string
  nullable = true
}
resource "aws_cloudwatch_log_group" "application" {
  count             = var.enabled ? 1 : 0
  name              = "/wilmas-fashion/${var.name}/application"
  retention_in_days = 7
}
resource "aws_cloudwatch_metric_alarm" "queue_age" {
  count               = var.enabled && var.queue_name != null ? 1 : 0
  alarm_name          = "${var.name}-invoice-queue-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 600
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = var.queue_name }
}
resource "aws_cloudwatch_metric_alarm" "dlq" {
  count               = var.enabled && var.dlq_name != null ? 1 : 0
  alarm_name          = "${var.name}-invoice-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = var.dlq_name }
}
resource "aws_cloudwatch_metric_alarm" "backend_5xx" {
  count               = var.enabled && var.backend_environment_name != null ? 1 : 0
  alarm_name          = "${var.name}-backend-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApplicationRequests5xx"
  namespace           = "AWS/ElasticBeanstalk"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  dimensions          = { EnvironmentName = var.backend_environment_name }
}
resource "aws_cloudwatch_metric_alarm" "backend_health" {
  count               = var.enabled && var.backend_environment_name != null ? 1 : 0
  alarm_name          = "${var.name}-backend-degraded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "EnvironmentHealth"
  namespace           = "AWS/ElasticBeanstalk"
  period              = 300
  statistic           = "Maximum"
  threshold           = 15
  treat_missing_data  = "notBreaching"
  dimensions          = { EnvironmentName = var.backend_environment_name }
}
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count               = var.enabled && var.rds_identifier != null ? 1 : 0
  alarm_name          = "${var.name}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  dimensions          = { DBInstanceIdentifier = var.rds_identifier }
}
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count               = var.enabled && var.rds_identifier != null ? 1 : 0
  alarm_name          = "${var.name}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Minimum"
  threshold           = 2147483648
  treat_missing_data  = "notBreaching"
  dimensions          = { DBInstanceIdentifier = var.rds_identifier }
}
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count               = var.enabled && var.rds_identifier != null ? 1 : 0
  alarm_name          = "${var.name}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 70
  treat_missing_data  = "notBreaching"
  dimensions          = { DBInstanceIdentifier = var.rds_identifier }
}
