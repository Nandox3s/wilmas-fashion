# aws-full-budget-lightsail

Root Terraform independiente para una sola instancia Ubuntu 24.04 en Amazon Lightsail. No carga el estado ni los módulos de `aws-full` o `aws-minimal-hybrid`.

El plan contiene únicamente cuatro recursos:

- instancia Lightsail `small_3_0` por defecto;
- IP estática;
- asociación de la IP;
- firewall público autoritativo con SSH restringido y HTTP/HTTPS públicos.

El snapshot automático es un `add_on` opcional de la instancia, no un quinto recurso. Terraform no configura DNS, secretos ni software del servidor.

## Plan seguro

```powershell
Set-Location infra/terraform/environments/aws-full-budget-lightsail
Copy-Item terraform.tfvars.example terraform.tfvars
# Reemplace REPLACE_WITH_PUBLIC_IPV4/32 con la IPv4 pública real del administrador /32.
# El plan falla con valores vacíos, 0.0.0.0/0, inválidos o TEST-NET.
terraform fmt -recursive
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

Antes de cualquier aplicación futura, sustituya el marcador inválido por la IP pública real del administrador con máscara `/32`. No se debe abrir SSH a `0.0.0.0/0`. El archivo local `terraform.tfvars` puede contener datos operativos y no debe confirmarse en Git.

No ejecute `terraform apply` ni `terraform destroy` sin una autorización separada y explícita.
