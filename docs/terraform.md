# Operación Terraform

Terraform requerido `>=1.6,<2`; proveedor AWS `~>5`. El lock file se versiona y `.terraform/`/tfstate se ignoran. Dev usa estado local. Comandos seguros: `fmt`, `init`, `validate`, `plan`. `apply` y `destroy` requieren autorización expresa.

Los flags dev reducidos deshabilitan VPC/RDS/EB. Habilitarlos juntos para un plan completo. Nunca pasar secretos reales como tfvars; RDS gestiona contraseña en Secrets Manager. Revisar siempre add/change/destroy y costo antes de aprobar.
