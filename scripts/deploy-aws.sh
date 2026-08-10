#!/bin/bash
# Build and ship to AWS. Usage: scripts/deploy-aws.sh [app|website|all]
#
#   website -> website/dist -> s3://easygeez-website -> easygeez.com + www
#   app     -> dist         -> s3://easygeez-app     -> app.easygeez.com
#
# Hashed assets get a 1-year immutable cache; HTML, the service worker and the
# manifests must revalidate every load, or a stale sw.js strands users on an old
# build. CloudFront is invalidated only for those revalidating paths — the
# hashed ones change name when they change content, so they never need it.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

APP_URL="https://app.easygeez.com"
SITE_URL="https://www.easygeez.com"

ship () {
  local src="$1" bucket="$2" dist_id="$3"
  echo "==> s3://$bucket"
  aws s3 sync "$src" "s3://$bucket" --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" --exclude "sw.js" --exclude "*.webmanifest" \
    --exclude "manifest*.json" --exclude "registerSW.js" --only-show-errors
  aws s3 sync "$src" "s3://$bucket" \
    --cache-control "public, max-age=0, must-revalidate" \
    --exclude "*" --include "*.html" --include "sw.js" --include "*.webmanifest" \
    --include "manifest*.json" --include "registerSW.js" --only-show-errors
  echo "==> invalidating $dist_id"
  aws cloudfront create-invalidation --distribution-id "$dist_id" \
    --paths "/" "/index.html" "/sw.js" "/*.webmanifest" \
    --query 'Invalidation.Id' --output text
}

if [ "$TARGET" = "website" ] || [ "$TARGET" = "all" ]; then
  ( cd "$REPO/website" && VITE_APP_URL="$APP_URL" npm run build )
  ship "$REPO/website/dist" easygeez-website E118QXS289N0PE
fi

if [ "$TARGET" = "app" ] || [ "$TARGET" = "all" ]; then
  ( cd "$REPO" && VITE_APP_URL="$APP_URL" npm run build )
  ship "$REPO/dist" easygeez-app E1Q2Y7XTD3EAVW
fi

echo "done. site=$SITE_URL app=$APP_URL"
