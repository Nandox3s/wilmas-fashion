variable "instance_bundle_id" {
  description = "Lightsail Linux bundle. small_3_0 is the recommended 2 GB plan; micro_3_0 is only for a minimal demo."
  type        = string
  default     = "small_3_0"

  validation {
    condition     = contains(["small_3_0", "micro_3_0"], var.instance_bundle_id)
    error_message = "instance_bundle_id must be small_3_0 (recommended) or micro_3_0 (minimal demo)."
  }
}

variable "availability_zone" {
  description = "Lightsail availability zone. The provider region is derived from this value."
  type        = string
  default     = "us-east-1a"

  validation {
    condition     = can(regex("^[a-z]{2}(?:-[a-z]+)+-[0-9][a-z]$", var.availability_zone))
    error_message = "availability_zone must look like us-east-1a."
  }
}

variable "ssh_allowed_cidrs" {
  description = "Administrator IPv4 CIDRs allowed to reach SSH. Public SSH is deliberately rejected."
  type        = set(string)

  validation {
    condition = (
      length(var.ssh_allowed_cidrs) > 0 &&
      alltrue([
        for cidr in var.ssh_allowed_cidrs :
        can(cidrhost(cidr, 0)) && !strcontains(cidr, ":") && cidr != "0.0.0.0/0"
      ])
    )
    error_message = "Provide at least one valid IPv4 CIDR and never use 0.0.0.0/0 for SSH."
  }
}

variable "domain_name" {
  description = "Optional DNS name configured later outside Terraform. Leave empty while DNS remains unchanged."
  type        = string
  default     = ""

  validation {
    condition = (
      var.domain_name == "" ||
      can(regex("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$", var.domain_name))
    )
    error_message = "domain_name must be empty or a valid fully qualified domain name."
  }
}

variable "enable_automatic_snapshots" {
  description = "Plan the Lightsail daily automatic snapshot add-on. Snapshot storage is billed separately."
  type        = bool
  default     = false
}

variable "snapshot_time" {
  description = "Daily automatic snapshot start time in UTC, in an hourly increment."
  type        = string
  default     = "06:00"

  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):00$", var.snapshot_time))
    error_message = "snapshot_time must use UTC HH:00 format."
  }
}

variable "environment" {
  description = "Short environment identifier used in names and tags."
  type        = string
  default     = "prod"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,19}$", var.environment))
    error_message = "environment must contain 2-20 lowercase letters, digits, or hyphens and start with a letter."
  }
}
