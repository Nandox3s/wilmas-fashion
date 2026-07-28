output "public_ip" {
  description = "Static public IPv4 address attached to the Lightsail instance."
  value       = aws_lightsail_static_ip.app.ip_address
}

output "instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.app.name
}

output "ssh_command_example" {
  description = "Example SSH command. Replace the private-key path with the downloaded Lightsail key."
  value       = "ssh -i /path/to/LightsailDefaultKey-${local.aws_region}.pem ${aws_lightsail_instance.app.username}@${aws_lightsail_static_ip.app.ip_address}"
}
