#!/usr/bin/env bash
# =============================================================================
# Deploy the marketing site + the PWA to one S3 bucket behind one CloudFront
# distribution.
#
#   easygeez.com/       -> website/dist   (prerendered marketing site)
#   easygeez.com/app/   -> dist           (the PWA, built with VITE_BASE=/app/)
#
# One-time infrastructure setup is in docs/deploy-aws.md. This script only
# uploads and invalidates, so it is safe to run repeatedly.
#
# WARNING: this is the FULL website + app deploy and it runs
# `aws s3 sync ... --delete` against the BUCKET ROOT. Anything at the root
# that is not in website/dist and not excluded below (_tools/, about/, ...)
# is deleted. For app-only releases use the GitHub Actions workflow
# .github/workflows/deploy-app.yml or the app-only steps in docs/deploy.md,
# which never use --delete and never write outside app/.
#
# Required env:
#   EGEEZ_BUCKET        S3 bucket name (e.g. easygeez-com)
#   EGEEZ_DISTRIBUTION  CloudFront distribution id (e.g. E1234ABCD5678)
# Optional:
#   VITE_API_URL        hub API origin; WITHOUT it every form silently
#                       degrades to a mailto draft, so the deploy refuses.
#
# Usage:  EGEEZ_BUCKET=... EGEEZ_DISTRIBUTION=... VITE_API_URL=... \
#           bash scripts/deploy-aws.sh
# =============================================================================
set -euo pipefail

: "${EGEEZ_BUCKET:?set EGEEZ_BUCKET to the S3 bucket name}"
: "${EGEEZ_DISTRIBUTION:?set EGEEZ_DISTRIBUTION to the CloudFront distribution id}"

if [ -z "${VITE_API_URL:-}" ]; then
  echo "REFUSING: VITE_API_URL is unset."
  echo "  Every form on the site would silently fall back to a mailto draft"
  echo "  and no teacher application or waitlist signup would reach the API."
  echo "  Set it to the hub API origin, or export ALLOW_MAILTO_ONLY=1 if that"
  echo "  really is what you want for this deploy."
  [ "${ALLOW_MAILTO_ONLY:-}" = "1" ] || exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building the PWA for /app/"
VITE_BASE=/app/ npm run build

echo "==> Building the website"
(cd website && npm run build)

# Long-cache the fingerprinted assets; never cache the HTML, the service
# worker or the manifest, or a returning visitor is stuck on an old build.
IMMUTABLE='public, max-age=31536000, immutable'
NOCACHE='no-cache, no-store, must-revalidate'

echo "==> Uploading the website to s3://$EGEEZ_BUCKET/"
# --delete removes bucket keys that are not in website/dist. Exclude:
#   app/*    the PWA, including its canonical voice and paintings
#            (app/audio, app/art). The web build requests these.
#   audio/*  art/*
#            temporary root copies. Clients built before the BASE_URL
#            fix still request /audio and /art. The marketing site does
#            not ship these files, so without the exclude a website
#            deploy deletes the only copy those clients can play.
# Canonical location after the fix is under app/. A duplicate at the
# bucket root is not required for new builds.
aws s3 sync website/dist "s3://$EGEEZ_BUCKET/" \
  --delete \
  --exclude 'app/*' --exclude 'audio/*' --exclude 'art/*' \
  --exclude '*.html' --exclude 'sitemap.xml' --exclude 'robots.txt' \
  --cache-control "$IMMUTABLE"
aws s3 sync website/dist "s3://$EGEEZ_BUCKET/" \
  --exclude '*' --include '*.html' --include 'sitemap.xml' --include 'robots.txt' \
  --cache-control "$NOCACHE" --content-type 'text/html; charset=utf-8' \
  --metadata-directive REPLACE
# sitemap/robots are not HTML - put their content types back.
aws s3 cp "s3://$EGEEZ_BUCKET/sitemap.xml" "s3://$EGEEZ_BUCKET/sitemap.xml" \
  --content-type 'application/xml' --cache-control "$NOCACHE" --metadata-directive REPLACE
aws s3 cp "s3://$EGEEZ_BUCKET/robots.txt" "s3://$EGEEZ_BUCKET/robots.txt" \
  --content-type 'text/plain; charset=utf-8' --cache-control "$NOCACHE" --metadata-directive REPLACE

echo "==> Uploading the PWA to s3://$EGEEZ_BUCKET/app/"
aws s3 sync dist "s3://$EGEEZ_BUCKET/app/" \
  --delete --exclude '*.html' --exclude 'sw.js' --exclude 'manifest.webmanifest' \
  --cache-control "$IMMUTABLE"
aws s3 sync dist "s3://$EGEEZ_BUCKET/app/" \
  --exclude '*' --include '*.html' --include 'sw.js' --include 'manifest.webmanifest' \
  --cache-control "$NOCACHE" --metadata-directive REPLACE
aws s3 cp "s3://$EGEEZ_BUCKET/app/sw.js" "s3://$EGEEZ_BUCKET/app/sw.js" \
  --content-type 'application/javascript; charset=utf-8' --cache-control "$NOCACHE" --metadata-directive REPLACE
aws s3 cp "s3://$EGEEZ_BUCKET/app/manifest.webmanifest" "s3://$EGEEZ_BUCKET/app/manifest.webmanifest" \
  --content-type 'application/manifest+json' --cache-control "$NOCACHE" --metadata-directive REPLACE

echo "==> Invalidating CloudFront"
aws cloudfront create-invalidation --distribution-id "$EGEEZ_DISTRIBUTION" \
  --paths '/*' --query 'Invalidation.Id' --output text

echo "Done. https://easygeez.com/ and https://easygeez.com/app/"
