variable "enabled" { type = bool }
variable "name" { type = string }
variable "environment" { type = string }
variable "enable_private_aws_endpoints" { type = bool }
data "aws_region" "current" {}
data "aws_availability_zones" "available" { state = "available" }
resource "aws_vpc" "this" {
  count                = var.enabled ? 1 : 0
  cidr_block           = "10.40.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = var.name }
}
resource "aws_internet_gateway" "this" {
  count  = var.enabled ? 1 : 0
  vpc_id = aws_vpc.this[0].id
  tags   = { Name = var.name }
}
resource "aws_subnet" "public" {
  count                   = var.enabled ? 2 : 0
  vpc_id                  = aws_vpc.this[0].id
  cidr_block              = cidrsubnet(aws_vpc.this[0].cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name}-public-${count.index + 1}" }
}
resource "aws_subnet" "private" {
  count             = var.enabled ? 2 : 0
  vpc_id            = aws_vpc.this[0].id
  cidr_block        = cidrsubnet(aws_vpc.this[0].cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.name}-private-${count.index + 1}" }
}
resource "aws_route_table" "public" {
  count  = var.enabled ? 1 : 0
  vpc_id = aws_vpc.this[0].id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this[0].id
  }
}
resource "aws_route_table_association" "public" {
  count          = var.enabled ? 2 : 0
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}
resource "aws_route_table" "private" {
  count  = var.enabled ? 1 : 0
  vpc_id = aws_vpc.this[0].id
  tags   = { Name = "${var.name}-private" }
}
resource "aws_route_table_association" "private" {
  count          = var.enabled ? 2 : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}
resource "aws_security_group" "backend" {
  count       = var.enabled ? 1 : 0
  name        = "${var.name}-backend"
  description = "Backend web traffic"
  vpc_id      = aws_vpc.this[0].id
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_security_group" "endpoints" {
  count       = var.enabled && var.enable_private_aws_endpoints ? 1 : 0
  name        = "${var.name}-endpoints"
  description = "HTTPS from application runtimes to VPC endpoints"
  vpc_id      = aws_vpc.this[0].id
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.backend[0].id]
  }
}
resource "aws_vpc_endpoint" "s3" {
  count             = var.enabled && var.enable_private_aws_endpoints ? 1 : 0
  vpc_id            = aws_vpc.this[0].id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private[0].id]
}
resource "aws_vpc_endpoint" "secretsmanager" {
  count               = var.enabled && var.enable_private_aws_endpoints ? 1 : 0
  vpc_id              = aws_vpc.this[0].id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints[0].id]
  private_dns_enabled = true
}
output "vpc_id" { value = try(aws_vpc.this[0].id, null) }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "backend_security_group_id" { value = try(aws_security_group.backend[0].id, null) }
