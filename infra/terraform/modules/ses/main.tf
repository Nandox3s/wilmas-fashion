variable "enabled" { type = bool }
variable "email" { type = string }
resource "aws_ses_email_identity" "this" {
  count = var.enabled ? 1 : 0
  email = var.email
  lifecycle {
    precondition {
      condition     = var.email != ""
      error_message = "email is required when SES identity is enabled"
    }
  }
}
