terraform {
  required_version = ">= 1.6.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.13"
    }
  }
}

provider "vercel" {
  # token comes from VERCEL_API_TOKEN
}

# Placeholder: add vercel_project, vercel_deployment, and managed DB/Redis later.
