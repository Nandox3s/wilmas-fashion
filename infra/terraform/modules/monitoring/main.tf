variable "name" { type = string }
variable "queue_name" {
  type     = string
  nullable = true
}
variable "dlq_name" {
  type     = string
  nullable = true
}
resource "aws_cloudwatch_log_group" "application" {
  name              = "/wilmas-fashion/${var.name}/application"
  retention_in_days = 7
}
resource "aws_cloudwatch_metric_alarm" "queue_age" {
  count               = var.queue_name == null ? 0 : 1
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
  count               = var.dlq_name == null ? 0 : 1
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
