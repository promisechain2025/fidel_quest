# Deploying the eGeez app (easygeez.com/app)

There are two ways to ship the PWA. Both upload **only** to
`s3://easygeez-com/app/` and then invalidate CloudFront `E1SP7A6AIN6IQF`.
Neither touches the bucket root.

| | GitHub Actions (preferred) | Local app-only |
|---|---|---|
| Where it runs | GitHub, `.github/workflows/deploy-app.yml` | Your laptop |
| Credentials | OIDC -> IAM role `github-actions-egeez-deploy` (no stored keys) | Your own AWS CLI profile |
| Can write | `easygeez-com/app/*` only | Whatever your profile allows |
| Trigger | Actions tab -> *Deploy app* -> *Run workflow* on `main`, or `gh workflow run deploy-app.yml --ref main` | `bash` the steps below |

## 1. GitHub Actions deploy

1. Merge to `main`.
2. Actions -> **Deploy app (easygeez.com/app)** -> **Run workflow** (branch `main`).
   Tick **dry_run** to build and print what would upload without writing.
3. The job runs the unit tests, builds with `VITE_BASE=/app/`, syncs `dist/`
   to `s3://easygeez-com/app/` **without `--delete`**, invalidates `/*`,
   waits for the invalidation and checks the live `/app/` serves the new bundle.

It is manual (`workflow_dispatch`) on purpose: merging does not ship.

### What it needs (one time)

- **Workflow file**: the workflow is staged at `infra/github/deploy-app.yml`
  because the bot's GitHub token has no `workflow` scope and cannot create
  files under `.github/workflows/`. Move it once:
  `git mv infra/github/deploy-app.yml .github/workflows/deploy-app.yml`
  (or GitHub web: Add file -> `.github/workflows/deploy-app.yml`, paste it).

- **AWS**: OIDC provider `token.actions.githubusercontent.com` and role
  `arn:aws:iam::326055865221:role/github-actions-egeez-deploy`.
  Run `infra/aws/setup-github-oidc.sh` once as an IAM admin (AWS CloudShell works).
  - Trust: `infra/aws/github-actions-egeez-deploy.trust.json` - only
    `repo:promisechain2025/fidel_quest:environment:production`.
  - Permissions: `infra/aws/github-actions-egeez-deploy.permissions.json` -
    `s3:ListBucket` on `easygeez-com` limited to prefix `app/`,
    `s3:GetObject/PutObject/DeleteObject` on `easygeez-com/app/*`,
    `cloudfront:CreateInvalidation/GetInvalidation` on `E1SP7A6AIN6IQF`.
- **GitHub**: environment `production` (deployments limited to `main`) and
  repository secret `AWS_ROLE_ARN_DEPLOY` =
  `arn:aws:iam::326055865221:role/github-actions-egeez-deploy`.

## 2. Local app-only deploy

From a clean checkout of `main`:

```bash
VITE_BASE=/app/ npm run build
B=s3://easygeez-com/app/
IMM='public, max-age=31536000, immutable'
NOC='no-cache, no-store, must-revalidate'
aws s3 sync dist/assets ${B}assets/ --cache-control "$IMM"
aws s3 sync dist/audio  ${B}audio/  --cache-control 'public, max-age=3600, must-revalidate'
aws s3 sync dist ${B} --exclude 'assets/*' --exclude 'audio/*' \
  --exclude '*.html' --exclude 'sw.js' --exclude 'manifest.webmanifest' --cache-control "$IMM"
aws s3 cp dist/sw.js ${B}sw.js --content-type 'application/javascript; charset=utf-8' --cache-control "$NOC"
aws s3 cp dist/manifest.webmanifest ${B}manifest.webmanifest --content-type 'application/manifest+json' --cache-control "$NOC"
aws s3 sync dist ${B} --exclude '*' --include '*.html' --content-type 'text/html; charset=utf-8' --cache-control "$NOC"
aws cloudfront create-invalidation --distribution-id E1SP7A6AIN6IQF --paths '/*'
```

This is the same sequence the workflow runs. Entry points (`sw.js`,
manifest, HTML) go last so a client never loads HTML that points at files
not uploaded yet.

## Why never `--delete` against the bucket root

`aws s3 sync <dir> s3://easygeez-com/ --delete` deletes **every key in the
bucket that is not in `<dir>`**. The bucket holds more than one build:

- `app/` - the PWA, including the recorded voice (`app/audio`) and paintings (`app/art`)
- `_tools/`, `about/` and other hand-uploaded folders
- root `audio/` and `art/` copies still requested by older installed clients
- the marketing website

A single root sync with `--delete` from the wrong folder (or with a missing
`--exclude`) wipes all of that, and S3 has no undo unless versioning is on.
That is why:

- the Actions role cannot write outside `app/*`, so even a bad command fails
  with AccessDenied instead of deleting the site;
- the app deploy never uses `--delete`. Old hashed files under `app/assets/`
  are left behind; that is harmless (they are small and unreferenced) and
  keeps users mid-session on the previous build working.

`scripts/deploy-aws.sh` is the full website + app deploy. It **does** use
`--delete` at the bucket root with excludes. Only run it when you mean to
redeploy the marketing site, and check its excludes first. For app-only
changes use the workflow or the steps above.
