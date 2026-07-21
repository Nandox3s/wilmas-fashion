locals {
  invoice_worker_enabled = var.enable_invoice_worker && var.enable_queues
}

module "networking" {
  source                       = "./modules/networking"
  enabled                      = var.enable_networking
  name                         = "wilmas-${var.environment}"
  environment                  = var.environment
  enable_private_aws_endpoints = local.invoice_worker_enabled
}

module "storage" {
  source           = "./modules/storage"
  enabled          = var.enable_storage
  name             = "wilmas-fashion-${var.environment}-${data.aws_caller_identity.current.account_id}"
  frontend_origins = concat(var.frontend_origins, var.amplify_origin == null ? [] : [var.amplify_origin])
}

module "sqs" {
  source  = "./modules/sqs"
  enabled = local.invoice_worker_enabled
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
  deletion_protection       = var.enable_deletion_protection
}

module "secrets" {
  source  = "./modules/secrets"
  enabled = var.enable_secrets
  name    = "wilmas/${var.environment}"
}

module "iam" {
  source                 = "./modules/iam"
  backend_enabled        = var.enable_backend
  worker_enabled         = local.invoice_worker_enabled
  name                   = "wilmas-${var.environment}"
  products_bucket_arn    = module.storage.products_bucket_arn
  invoices_bucket_arn    = module.storage.invoices_bucket_arn
  queue_arn              = module.sqs.queue_arn
  secret_arn             = module.rds.master_user_secret_arn
  application_secret_arn = module.secrets.application_secret_arn
}

module "backend" {
  source                 = "./modules/backend"
  enabled                = var.enable_backend
  name                   = "wilmas-${var.environment}"
  instance_type          = var.backend_instance_type
  solution_stack_name    = var.backend_solution_stack
  instance_profile_name  = module.iam.instance_profile_name
  subnet_ids             = module.networking.public_subnet_ids
  security_group_id      = module.networking.backend_security_group_id
  service_role_arn       = module.iam.service_role_arn
  cors_origins           = concat(var.frontend_origins, var.amplify_origin == null ? [] : [var.amplify_origin])
  products_bucket        = module.storage.products_bucket_name
  invoices_bucket        = module.storage.invoices_bucket_name
  queue_url              = module.sqs.queue_url
  rds_secret_arn         = module.rds.master_user_secret_arn
  application_secret_arn = module.secrets.application_secret_arn
  database_name          = var.database_name
}

module "amplify" {
  source      = "./modules/amplify"
  enabled     = var.enable_amplify
  name        = "wilmas-${var.environment}-frontend"
  branch_name = var.amplify_branch_name
  build_spec  = file("${path.root}/../../amplify.yml")
  api_base    = module.backend.https_url
}

module "invoice_worker" {
  source                 = "./modules/invoice-worker"
  enabled                = local.invoice_worker_enabled
  name                   = "wilmas-invoice-worker-${var.environment}"
  role_arn               = module.iam.worker_role_arn
  queue_arn              = module.sqs.queue_arn
  image_uri              = var.invoice_worker_image_uri
  subnet_ids             = module.networking.private_subnet_ids
  security_group_id      = module.networking.backend_security_group_id
  rds_secret_arn         = module.rds.master_user_secret_arn
  application_secret_arn = module.secrets.application_secret_arn
  database_name          = var.database_name
  invoices_bucket        = module.storage.invoices_bucket_name
}

module "monitoring" {
  source                   = "./modules/monitoring"
  enabled                  = var.enable_monitoring
  name                     = "wilmas-${var.environment}"
  queue_name               = var.enable_monitoring ? module.sqs.queue_name : null
  dlq_name                 = var.enable_monitoring ? module.sqs.dlq_name : null
  backend_environment_name = var.enable_backend ? "wilmas-${var.environment}" : null
  rds_identifier           = var.enable_rds ? "wilmas-${var.environment}" : null
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
