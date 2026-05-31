# IAM user that CI uses to push container images and roll the ECS service.
# Matches infra/aws/ecr/github-actions-policy.json plus the ECS deploy bits
# that the deploy workflow needs.
#
# After `terraform apply`, fetch the access key once with:
#   terraform output -raw github_actions_access_key_id
#   terraform output -raw github_actions_secret_access_key
# Save them straight into GitHub Secrets — they are not retrievable later.

resource "aws_iam_user" "github_actions" {
  name = "${var.project_name}-github-actions"
}

resource "aws_iam_user_policy" "github_actions" {
  name = "${var.project_name}-github-actions-policy"
  user = aws_iam_user.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = var.ecr_repository_arn
      },
      {
        Sid    = "EcsDeploy"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
        ]
        Resource = "*"
      },
      {
        Sid    = "PassExecutionRoles"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          var.task_execution_role_arn,
          var.task_role_arn,
        ]
      },
    ]
  })
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}
