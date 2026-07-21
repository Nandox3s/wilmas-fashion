module "networking" {
  source      = "./modules/networking"
  enabled     = var.enable_networking
  name        = "wilmas-${var.environment}"
  environment = var.environment
}

module "storage" {
  source  = "./modules/storage"
  enabled = var.enable_storage
  name    = "wilmas-fashion-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

module "sqs" {
  source  = "./modules/sqs"
  enabled = var.enable_queues
  name    = "wilmas-invoices-${var.environment}"
}

module "rds" {
  source                    = "./modules/rds"
  enabled                   = var.enable_rds
  name                      = "wilmas-${var.environment}"
  environment               = var.environment
  subnet_ids                = module.networking.private_subnet_ids
  backend_security_group_id = module.networking.backend_security_group_id
  database_name             = var.database_name
  database_username         = var.database_username
}

module "iam" {
  source              = "./modules/iam"
  name                = "wilmas-${var.environment}"
  products_bucket_arn = module.storage.products_bucket_arn
  invoices_bucket_arn = module.storage.invoices_bucket_arn
  queue_arn           = module.sqs.queue_arn
  secret_arn          = module.rds.master_user_secret_arn
}

module "backend" {
  source                = "./modules/backend"
  enabled               = var.enable_backend
  name                  = "wilmas-${var.environment}"
  instance_type         = var.backend_instance_type
  solution_stack_name   = var.backend_solution_stack
  instance_profile_name = module.iam.instance_profile_name
  subnet_ids            = module.networking.public_subnet_ids
  security_group_id     = module.networking.backend_security_group_id
}

module "invoice_worker" {
  source    = "./modules/invoice-worker"
  enabled   = false
  name      = "wilmas-invoice-worker-${var.environment}"
  role_arn  = module.iam.worker_role_arn
  queue_arn = module.sqs.queue_arn
}

module "monitoring" {
  source     = "./modules/monitoring"
  name       = "wilmas-${var.environment}"
  queue_name = module.sqs.queue_name
  dlq_name   = module.sqs.dlq_name
}

module "ses" {
  source  = "./modules/ses"
  enabled = var.enable_ses_identity
  email   = var.ses_from_email
}

module "budget_monitoring" {
  source  = "./modules/budget-monitoring"
  enabled = var.enable_budget
  email   = var.budget_email
  amount  = var.monthly_budget_usd
  name    = "wilmas-${var.environment}-monthly"
}
