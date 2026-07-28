variable "enabled" { type = bool }
variable "email" { type = string }
variable "amount" { type = number }
variable "name" { type = string }
resource "aws_budgets_budget" "this" {
  count        = var.enabled ? 1 : 0
  name         = var.name
  budget_type  = "COST"
  limit_amount = tostring(var.amount)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.email]
  }
  lifecycle {
    precondition {
      condition     = var.email != ""
      error_message = "budget email is required when budget is enabled"
    }
  }
}
