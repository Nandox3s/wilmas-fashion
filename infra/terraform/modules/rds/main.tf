variable "enabled" { type = bool }
variable "name" { type = string }
variable "environment" { type = string }
variable "subnet_ids" { type = list(string) }
variable "backend_security_group_id" {
  type     = string
  nullable = true
}
variable "database_name" { type = string }
variable "database_username" {
  type      = string
  sensitive = true
}
variable "deletion_protection" { type = bool }
resource "aws_db_subnet_group" "this" {
  count      = var.enabled ? 1 : 0
  name       = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_security_group" "this" {
  count       = var.enabled ? 1 : 0
  name        = "${var.name}-postgres"
  description = "PostgreSQL only from backend"
  vpc_id      = aws_db_subnet_group.this[0].vpc_id
  ingress {
    description     = "PostgreSQL from backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.backend_security_group_id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_db_instance" "this" {
  count                       = var.enabled ? 1 : 0
  identifier                  = var.name
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  max_allocated_storage       = 30
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = var.database_name
  username                    = var.database_username
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.this[0].name
  vpc_security_group_ids      = [aws_security_group.this[0].id]
  publicly_accessible         = false
  multi_az                    = false
  backup_retention_period     = var.environment == "prod" ? 7 : 1
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = var.environment != "prod"
  final_snapshot_identifier   = var.environment == "prod" ? "${var.name}-final" : null
  auto_minor_version_upgrade  = true
}
output "endpoint" { value = try(aws_db_instance.this[0].endpoint, null) }
output "master_user_secret_arn" { value = try(aws_db_instance.this[0].master_user_secret[0].secret_arn, null) }
