#!/usr/bin/env bash
# One-time AWS setup for the GitHub Actions app deploy (.github/workflows/deploy-app.yml).
# Run once as an IAM admin, e.g. in AWS CloudShell (account 326055865221),
# from a checkout of this repo or after uploading the two JSON files next to it.
# Safe to re-run: existing provider / role are kept, the inline policy is overwritten.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ACCOUNT=326055865221
ROLE=github-actions-egeez-deploy
PROVIDER_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER_ARN" >/dev/null 2>&1; then
  echo "OIDC provider already exists"
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
fi

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" \
    --policy-document file://github-actions-egeez-deploy.trust.json
else
  aws iam create-role --role-name "$ROLE" \
    --description "GitHub Actions (promisechain2025/fidel_quest, env production) -> easygeez-com/app/* + CloudFront invalidation" \
    --assume-role-policy-document file://github-actions-egeez-deploy.trust.json
fi

aws iam put-role-policy --role-name "$ROLE" --policy-name egeez-app-deploy \
  --policy-document file://github-actions-egeez-deploy.permissions.json

aws iam get-role --role-name "$ROLE" --query Role.Arn --output text
