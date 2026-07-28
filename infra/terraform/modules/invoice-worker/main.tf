variable "enabled" { type = bool }
variable "name" { type = string }
variable "role_arn" {
  type     = string
  nullable = true
}
variable "queue_arn" {
  type     = string
  nullable = true
}
variable "image_uri" {
  type     = string
  nullable = true
}
variable "subnet_ids" { type = list(string) }
variable "security_group_id" {
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
variable "invoices_bucket" {
  type     = string
  nullable = true
}

resource "aws_lambda_function" "this" {
  count         = var.enabled ? 1 : 0
  function_name = var.name
  role          = var.role_arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 60
  memory_size   = 512
  architectures = ["x86_64"]
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.security_group_id]
  }
  environment {
    variables = {
      NODE_ENV           = "production"
      INVOICE_PROVIDER   = "mock"
      EMAIL_PROVIDER     = "console"
      STORAGE_PROVIDER   = "s3"
      RDS_SECRET_ARN     = var.rds_secret_arn
      APP_SECRET_ARN     = var.application_secret_arn
      DATABASE_NAME      = var.database_name
      S3_INVOICES_BUCKET = var.invoices_bucket
    }
  }
  lifecycle {
    precondition {
      condition     = !var.enabled || (var.image_uri != null && can(regex("^[0-9]+\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com/", var.image_uri)))
      error_message = "A published ECR image URI is required before enabling the invoice worker"
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs" {
  count                              = var.enabled ? 1 : 0
  event_source_arn                   = var.queue_arn
  function_name                      = aws_lambda_function.this[0].arn
  batch_size                         = 5
  function_response_types            = ["ReportBatchItemFailures"]
  maximum_batching_window_in_seconds = 5
}

output "function_name" { value = try(aws_lambda_function.this[0].function_name, null) }
