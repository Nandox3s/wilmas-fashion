locals {
  aws_region    = replace(var.availability_zone, "/[a-z]$/", "")
  instance_name = "wilmas-fashion-${var.environment}"
  tags = {
    Project     = "wilmas-fashion"
    Environment = var.environment
    ManagedBy   = "terraform"
    Profile     = "aws-full-budget-lightsail"
    Domain      = var.domain_name != "" ? var.domain_name : "not-configured"
  }
}

provider "aws" {
  region = local.aws_region

  default_tags {
    tags = local.tags
  }
}
