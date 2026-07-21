output "account_id" { value = data.aws_caller_identity.current.account_id }
output "region" { value = data.aws_region.current.name }
output "products_bucket" { value = module.storage.products_bucket_name }
output "invoices_bucket" { value = module.storage.invoices_bucket_name }
output "invoice_queue_url" { value = module.sqs.queue_url }
output "database_endpoint" { value = module.rds.endpoint }
output "backend_url" { value = module.backend.url }
