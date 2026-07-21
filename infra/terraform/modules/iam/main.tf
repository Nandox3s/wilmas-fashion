variable "name" { type = string }
variable "enabled" { type = bool }
variable "products_bucket_arn" {
  type     = string
  nullable = true
}
variable "invoices_bucket_arn" {
  type     = string
  nullable = true
}
variable "queue_arn" {
  type     = string
  nullable = true
}
variable "secret_arn" {
  type     = string
  nullable = true
}
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}
data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "backend" {
  count              = var.enabled ? 1 : 0
  name               = "${var.name}-backend"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}
resource "aws_iam_instance_profile" "backend" {
  count = var.enabled ? 1 : 0
  name  = "${var.name}-backend"
  role  = aws_iam_role.backend[0].name
}
data "aws_iam_policy_document" "backend" {
  count = var.enabled ? 1 : 0
  statement {
    sid       = "ProductObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${var.products_bucket_arn}/*"]
  }
  statement {
    sid       = "InvoiceObjects"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${var.invoices_bucket_arn}/*"]
  }
  statement {
    sid       = "InvoiceQueue"
    actions   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
    resources = [var.queue_arn]
  }
  dynamic "statement" {
    for_each = var.secret_arn == null ? [] : [var.secret_arn]
    content {
      sid       = "DatabaseSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [statement.value]
    }
  }
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/elasticbeanstalk/${var.name}*:*"]
  }
}
resource "aws_iam_role_policy" "backend" {
  count  = var.enabled ? 1 : 0
  name   = "${var.name}-backend"
  role   = aws_iam_role.backend[0].id
  policy = data.aws_iam_policy_document.backend[0].json
}
resource "aws_iam_role" "worker" {
  count              = var.enabled ? 1 : 0
  name               = "${var.name}-invoice-worker"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
}
data "aws_iam_policy_document" "worker" {
  count = var.enabled ? 1 : 0
  statement {
    sid       = "QueueConsume"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes"]
    resources = [var.queue_arn]
  }
  statement {
    sid       = "InvoiceObjects"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${var.invoices_bucket_arn}/*"]
  }
  dynamic "statement" {
    for_each = var.secret_arn == null ? [] : [var.secret_arn]
    content {
      sid       = "DatabaseSecret"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [statement.value]
    }
  }
  statement {
    sid       = "WorkerLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name}*:*"]
  }
}
resource "aws_iam_role_policy" "worker" {
  count  = var.enabled ? 1 : 0
  name   = "${var.name}-worker"
  role   = aws_iam_role.worker[0].id
  policy = data.aws_iam_policy_document.worker[0].json
}
output "instance_profile_name" { value = try(aws_iam_instance_profile.backend[0].name, null) }
output "worker_role_arn" { value = try(aws_iam_role.worker[0].arn, null) }
