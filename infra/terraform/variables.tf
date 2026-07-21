variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "environment" {
  type    = string
  default = "dev"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod"
  }
}
variable "enable_networking" {
  type    = bool
  default = false
}
variable "enable_rds" {
  type    = bool
  default = false
}
variable "enable_backend" {
  type    = bool
  default = false
}
variable "enable_invoice_worker" {
  type    = bool
  default = false
}
variable "enable_monitoring" {
  type    = bool
  default = false
}
variable "enable_storage" {
  type    = bool
  default = true
}
variable "enable_queues" {
  type    = bool
  default = true
}
variable "enable_ses_identity" {
  type    = bool
  default = false
}
variable "enable_budget" {
  type    = bool
  default = false
}
variable "budget_email" {
  type    = string
  default = ""
}
variable "ses_from_email" {
  type    = string
  default = ""
}
variable "monthly_budget_usd" {
  type    = number
  default = 5
}
variable "frontend_origins" {
  type    = list(string)
  default = ["http://localhost:5173", "https://wilmas-fashion.vercel.app"]
  validation {
    condition     = length(var.frontend_origins) > 0 && alltrue([for origin in var.frontend_origins : can(regex("^https?://[^< >]+$", origin))])
    error_message = "frontend_origins must contain explicit HTTP(S) origins without placeholders"
  }
}
variable "database_name" {
  type    = string
  default = "wilmas_fashion"
}
variable "database_username" {
  type      = string
  default   = "wilmas_admin"
  sensitive = true
}
variable "backend_instance_type" {
  type    = string
  default = "t3.micro"
}
variable "backend_solution_stack" {
  type    = string
  default = "64bit Amazon Linux 2023 v6.5.1 running Node.js 20"
}
