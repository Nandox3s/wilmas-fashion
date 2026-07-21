variable "enabled" { type = bool }
variable "name" { type = string }
variable "instance_type" { type = string }
variable "solution_stack_name" { type = string }
variable "instance_profile_name" {
  type     = string
  nullable = true
}
variable "subnet_ids" { type = list(string) }
variable "security_group_id" {
  type     = string
  nullable = true
}

resource "aws_elastic_beanstalk_application" "this" {
  count = var.enabled ? 1 : 0
  name  = var.name
}
resource "aws_elastic_beanstalk_environment" "this" {
  count               = var.enabled ? 1 : 0
  name                = var.name
  application         = aws_elastic_beanstalk_application.this[0].name
  solution_stack_name = var.solution_stack_name
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "SingleInstance"
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = var.instance_profile_name
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = var.security_group_id
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", var.subnet_ids)
  }
  setting {
    namespace = "aws:elasticbeanstalk:application"
    name      = "Application Healthcheck URL"
    value     = "/api/ping"
  }
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7"
  }
}
output "url" { value = try(aws_elastic_beanstalk_environment.this[0].cname, null) }
