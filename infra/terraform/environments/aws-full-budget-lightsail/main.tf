resource "aws_lightsail_instance" "app" {
  name              = local.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = "ubuntu_24_04"
  bundle_id         = var.instance_bundle_id
  ip_address_type   = "ipv4"

  dynamic "add_on" {
    for_each = var.enable_automatic_snapshots ? [1] : []

    content {
      type          = "AutoSnapshot"
      snapshot_time = var.snapshot_time
      status        = "Enabled"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_lightsail_static_ip" "app" {
  name = "${local.instance_name}-ipv4"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}

resource "aws_lightsail_instance_public_ports" "app" {
  instance_name = aws_lightsail_instance.app.name

  port_info {
    protocol          = "tcp"
    from_port         = 22
    to_port           = 22
    cidrs             = var.ssh_allowed_cidrs
    cidr_list_aliases = ["lightsail-connect"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]
  }
}