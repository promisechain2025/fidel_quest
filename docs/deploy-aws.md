# Deploying easygeez.com on AWS

One S3 bucket, one CloudFront distribution, one certificate.

```
easygeez.com/          the marketing site   (website/dist)
easygeez.com/app/      the PWA              (dist, built with VITE_BASE=/app/)
easygeez.com/api/*     -> the hub API       (optional second origin, see step 8)
```

Everything below is one-time except step 9, which is the deploy you re-run.

Region note: the bucket can live anywhere, but **the ACM certificate must be
in `us-east-1`** - CloudFront only reads certificates from that region. This
catches everyone once.

---

## 1. The bucket

```bash
aws s3api create-bucket --bucket easygeez-com --region us-east-1
aws s3api put-public-access-block --bucket easygeez-com \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Keep the bucket **private**. CloudFront reaches it through Origin Access
Control, so nothing needs to be public and there is no S3 website endpoint to
leak. (The older "S3 static website hosting" route works too, but it is
HTTP-only to the origin and cannot use OAC - do not use it.)

## 2. The certificate

```bash
aws acm request-certificate --region us-east-1 \
  --domain-name easygeez.com \
  --subject-alternative-names www.easygeez.com \
  --validation-method DNS
```

Add the CNAME records it prints to your DNS, then wait for `ISSUED`:

```bash
aws acm describe-certificate --region us-east-1 --certificate-arn <arn> \
  --query 'Certificate.Status'
```

## 3. The rewrite function

`/pricing` is a real directory in the build (`pricing/index.html`) because the
site prerenders one HTML file per route. S3's REST endpoint will not serve a
directory index, so a CloudFront Function does it.

1. CloudFront console -> Functions -> Create function, name `egeez-rewrite`.
2. Paste `scripts/cloudfront-rewrite.js`.
3. Publish.

## 4. The distribution

- **Origin**: the S3 bucket, with **Origin Access Control** (create one; then
  copy the bucket policy CloudFront offers you and apply it).
- **Default root object**: `index.html`
- **Viewer protocol policy**: Redirect HTTP to HTTPS
- **Alternate domain names**: `easygeez.com`, `www.easygeez.com`
- **Certificate**: the one from step 2
- **Function association** (default behaviour): Viewer request -> `egeez-rewrite`
- **Compress objects automatically**: on

### Custom error responses (both required)

| HTTP error code | Response page path | HTTP response code |
| --- | --- | --- |
| 403 | `/index.html` | 404 |
| 404 | `/index.html` | 404 |

S3 answers a missing key with 403 under OAC, which is why both are listed.
Returning **404**, not 200, is deliberate: unknown URLs render the in-app
"Page not found" *and* tell crawlers the truth. A 200 here would recreate the
soft-404 the SEO pass removed.

## 5. DNS

Point the apex and `www` at the distribution.

**Route 53** - two alias records (A, and AAAA if you enabled IPv6):

```
easygeez.com      A     ALIAS -> d111111abcdef8.cloudfront.net
www.easygeez.com  A     ALIAS -> d111111abcdef8.cloudfront.net
```

**Any other registrar** - the apex cannot be a CNAME. Either move DNS to
Route 53, or use your registrar's ALIAS/ANAME record if it has one, and a
plain CNAME for `www`.

## 6. Environment for the build

| Var | Value | Why |
| --- | --- | --- |
| `VITE_API_URL` | the hub API origin | **Without it every form silently becomes a mailto draft.** The deploy script refuses to run unless it is set. |
| `VITE_APP_URL` | `https://easygeez.com/app` | Already the default; set it only if the PWA moves. |
| `VITE_SITE_URL` | `https://easygeez.com` | Used by the app's shareable progress cards. |

## 6b. The deploy identity

Create a dedicated IAM user (or role) for deploys - never your root or
console-admin keys. `scripts/aws-deploy-policy.json` is the whole permission
set it needs: read/write objects in one bucket, and invalidate one
distribution. Nothing else. Replace the three REPLACE- placeholders, then:

```bash
aws iam create-user --user-name egeez-deploy
aws iam put-user-policy --user-name egeez-deploy \
  --policy-name egeez-deploy --policy-document file://scripts/aws-deploy-policy.json
aws iam create-access-key --user-name egeez-deploy
```

If a key ever leaks, the blast radius is one bucket and one invalidation
endpoint - not your account.

**Prefer short-lived credentials for anything you hand to a tool or paste
anywhere.** `aws sts get-session-token --duration-seconds 3600` returns a
key/secret/session-token trio that expires in an hour and can be revoked
early; long-lived keys, once pasted, live in that transcript forever.

## 7. Deploy

```bash
export EGEEZ_BUCKET=easygeez-com
export EGEEZ_DISTRIBUTION=E1234ABCD5678
export VITE_API_URL=https://api.easygeez.com
bash scripts/deploy-aws.sh
```

It builds both, uploads with the right cache headers (fingerprinted assets
immutable for a year; HTML, `sw.js` and the manifest never cached), and
invalidates the distribution.

## 8. The API

The API is a Node server, so it does not belong in S3. Either:

- keep it where `render.yaml` / `api/fly.toml` point, on its own hostname
  (`api.easygeez.com`), and set `CORS_ORIGIN=https://easygeez.com`; or
- add it as a second CloudFront origin under `/api/*` with caching disabled,
  which keeps everything same-origin and removes CORS entirely.

Either way the API needs `SITE_URL=https://easygeez.com` (emailed links and
Stripe redirects), `JWT_SECRET`, and `TRUST_PROXY` set to match whatever sits
in front of it - the rate limiter is only meaningful when `req.ip` is real.

## 9. After the first deploy, check these five

1. `curl -sI https://easygeez.com/pricing` -> **200**, and
   `curl -s https://easygeez.com/pricing | grep '<title>'` -> `Pricing - eGeez`
   (proves the rewrite function and the prerender are both working).
2. `curl -sI https://easygeez.com/definitely-not-real` -> **404**.
3. `https://easygeez.com/app/` loads the PWA, and installing it opens at
   `/app`, not the marketing site.
4. Submit the Tigrinya waitlist form: it should say "You are on the list",
   not "Your email app should have opened" - the latter means `VITE_API_URL`
   was missing at build time.
5. `curl -s https://easygeez.com/sitemap.xml | head` -> the `easygeez.com`
   URLs, and Search Console accepts it.

## Rollback

S3 versioning is the cheapest safety net:

```bash
aws s3api put-bucket-versioning --bucket easygeez-com \
  --versioning-configuration Status=Enabled
```

With it on, a bad deploy is fixed by re-running the previous commit's
`deploy-aws.sh` - the invalidation makes it live in a minute or two.
