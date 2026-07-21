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

# Lambda is intentionally disabled until the Prisma bundle is built and tested.
# Enabling a placeholder worker could acknowledge messages without processing them.
output "function_name" { value = null }
