provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  tags = { Project = "wilmas-fashion", Environment = var.environment, ManagedBy = "terraform", Owner = "fernando" }
}
