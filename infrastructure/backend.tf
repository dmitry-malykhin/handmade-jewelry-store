# Remote state backend — required for team / CI use. State is stored in S3
# with object-versioning enabled; DynamoDB holds a write lock so two
# `apply` runs cannot stomp on each other.
#
# Bootstrap (one-time, run BEFORE `terraform init`):
#
#   aws s3api create-bucket \
#     --bucket handmade-jewelry-store-tfstate \
#     --region us-east-1
#   aws s3api put-bucket-versioning \
#     --bucket handmade-jewelry-store-tfstate \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption \
#     --bucket handmade-jewelry-store-tfstate \
#     --server-side-encryption-configuration \
#       '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#   aws dynamodb create-table \
#     --table-name handmade-jewelry-store-tflock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-east-1
#
# Then uncomment the block below and run `terraform init -reconfigure`.
#
# Until you've bootstrapped, `terraform init` uses the implicit local backend
# (state lives in this directory as `terraform.tfstate`). That's fine for
# initial experimentation but unsafe for production.

# terraform {
#   backend "s3" {
#     bucket         = "handmade-jewelry-store-tfstate"
#     key            = "production/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "handmade-jewelry-store-tflock"
#     encrypt        = true
#   }
# }
