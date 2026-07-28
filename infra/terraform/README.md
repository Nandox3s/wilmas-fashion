# Terraform de Wilmas Fashion

La configuración dev reducida crea únicamente S3 privado, SQS/DLQ, IAM mínimo y CloudWatch. Networking, RDS y Elastic Beanstalk están preparados pero deshabilitados porque su costo mensual supera el presupuesto de referencia.

```powershell
$env:AWS_PROFILE='wilmas-dev'
$env:AWS_REGION='us-east-1'
terraform fmt -recursive
terraform init
terraform validate
terraform plan -var-file=environments/dev/terraform.tfvars
```

No ejecutar `apply` sin aprobación expresa. El estado es local e ignorado durante esta fase. Para trabajo compartido se propone posteriormente S3 cifrado con versionado y bloqueo DynamoDB/OpenTofu-compatible, creado mediante un bootstrap independiente autorizado.
