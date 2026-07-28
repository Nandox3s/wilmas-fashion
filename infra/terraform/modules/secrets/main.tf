variable "enabled" { type = bool }
variable "name" { type = string }

resource "aws_secretsmanager_secret" "application" {
  count                   = var.enabled ? 1 : 0
  name                    = "${var.name}/application"
  description             = "Runtime secrets for Wilmas Fashion; populate manually after apply"
  recovery_window_in_days = 7
}

output "application_secret_arn" { value = try(aws_secretsmanager_secret.application[0].arn, null) }
