output "user_name" {
  value = aws_iam_user.github_actions.name
}

output "access_key_id" {
  value = aws_iam_access_key.github_actions.id
}

output "secret_access_key" {
  description = "Sensitive — only visible at first apply. Save into GitHub Secrets immediately."
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}
