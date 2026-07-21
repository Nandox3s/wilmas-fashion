variable "enabled" { type = bool }
variable "name" { type = string }
locals { buckets = var.enabled ? { products = "${var.name}-products", invoices = "${var.name}-invoices" } : {} }
resource "aws_s3_bucket" "this" {
  for_each = local.buckets
  bucket   = each.value
}
resource "aws_s3_bucket_public_access_block" "this" {
  for_each                = aws_s3_bucket.this
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_s3_bucket_versioning" "invoices" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.this["invoices"].id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  for_each = aws_s3_bucket.this
  bucket   = each.value.id
  rule {
    id     = "cost-control"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
    noncurrent_version_expiration { noncurrent_days = each.key == "invoices" ? 90 : 30 }
  }
}
resource "aws_s3_bucket_cors_configuration" "products" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.this["products"].id
  cors_rule {
    allowed_headers = ["content-type"]
    allowed_methods = ["PUT"]
    allowed_origins = ["https://<DOMAIN>", "http://localhost:5173"]
    expose_headers  = ["ETag"]
    max_age_seconds = 300
  }
}
output "products_bucket_name" { value = try(aws_s3_bucket.this["products"].id, null) }
output "invoices_bucket_name" { value = try(aws_s3_bucket.this["invoices"].id, null) }
output "products_bucket_arn" { value = try(aws_s3_bucket.this["products"].arn, null) }
output "invoices_bucket_arn" { value = try(aws_s3_bucket.this["invoices"].arn, null) }
