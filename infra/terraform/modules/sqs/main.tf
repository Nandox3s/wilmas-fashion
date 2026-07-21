variable "enabled" { type = bool }
variable "name" { type = string }
resource "aws_sqs_queue" "dlq" {
  count                     = var.enabled ? 1 : 0
  name                      = "${var.name}-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
resource "aws_sqs_queue" "main" {
  count                      = var.enabled ? 1 : 0
  name                       = var.name
  visibility_timeout_seconds = 180
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true
  redrive_policy             = jsonencode({ deadLetterTargetArn = aws_sqs_queue.dlq[0].arn, maxReceiveCount = 4 })
}
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  count                = var.enabled ? 1 : 0
  queue_url            = aws_sqs_queue.dlq[0].id
  redrive_allow_policy = jsonencode({ redrivePermission = "byQueue", sourceQueueArns = [aws_sqs_queue.main[0].arn] })
}
output "queue_arn" { value = try(aws_sqs_queue.main[0].arn, null) }
output "queue_url" { value = try(aws_sqs_queue.main[0].url, null) }
output "queue_name" { value = try(aws_sqs_queue.main[0].name, null) }
output "dlq_name" { value = try(aws_sqs_queue.dlq[0].name, null) }
