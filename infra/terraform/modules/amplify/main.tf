variable "enabled" { type = bool }
variable "name" { type = string }
variable "branch_name" { type = string }
variable "build_spec" { type = string }
variable "api_base" { type = string }

resource "aws_amplify_app" "this" {
  count      = var.enabled ? 1 : 0
  name       = var.name
  platform   = "WEB"
  build_spec = var.build_spec
  environment_variables = {
    VITE_API_BASE         = var.api_base
    VITE_CHECKOUT_MODE    = "mock"
    VITE_PAYMENT_PROVIDER = "mock"
    VITE_INVOICE_PROVIDER = "mock"
  }
  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "200"
  }
}

resource "aws_amplify_branch" "this" {
  count             = var.enabled ? 1 : 0
  app_id            = aws_amplify_app.this[0].id
  branch_name       = var.branch_name
  stage             = "DEVELOPMENT"
  enable_auto_build = false
}

output "app_id" { value = try(aws_amplify_app.this[0].id, null) }
output "default_domain" { value = try(aws_amplify_app.this[0].default_domain, null) }
output "branch_url" { value = try("https://${aws_amplify_branch.this[0].branch_name}.${aws_amplify_app.this[0].default_domain}", null) }
