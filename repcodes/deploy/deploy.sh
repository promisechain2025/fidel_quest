#!/usr/bin/env bash
# Deploy/update the rep-code Lambda. Needs role egeez-repcodes-lambda (see iam-role.json). Never touches the website bucket.
set -euo pipefail
cd "$(dirname "$0")/.."
R=us-east-1; F=egeez-repcodes; ACCT=$(aws sts get-caller-identity --query Account --output text)
rm -rf /tmp/egr-build && mkdir /tmp/egr-build && cp -r src package.json /tmp/egr-build/
(cd /tmp/egr-build && npm i --omit=dev --silent && zip -qr ../egr.zip .)
if aws lambda get-function --function-name $F --region $R >/dev/null 2>&1; then
  aws lambda update-function-code --function-name $F --zip-file fileb:///tmp/egr.zip --region $R >/dev/null
else
  aws lambda create-function --function-name $F --runtime nodejs20.x --handler src/index.handler \
    --role arn:aws:iam::$ACCT:role/egeez-repcodes-lambda --zip-file fileb:///tmp/egr.zip --timeout 10 --memory-size 256 \
    --environment "Variables={TABLE=egeez-repcodes,MAIL_FROM=noreply@easygeez.com}" --region $R >/dev/null
  aws lambda wait function-active --function-name $F --region $R
  aws lambda put-function-concurrency --function-name $F --reserved-concurrent-executions 10 --region $R
  aws lambda create-function-url-config --function-name $F --auth-type NONE --region $R >/dev/null
  aws lambda add-permission --function-name $F --statement-id url --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE --region $R >/dev/null
  aws lambda add-permission --function-name $F --statement-id urlinvoke --action lambda:InvokeFunction --principal '*' --region $R >/dev/null
  aws logs create-log-group --log-group-name /aws/lambda/$F --region $R 2>/dev/null || true
  aws logs put-retention-policy --log-group-name /aws/lambda/$F --retention-in-days 30 --region $R
fi
aws lambda get-function-url-config --function-name $F --region $R --query FunctionUrl --output text
