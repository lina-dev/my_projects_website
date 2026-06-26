

## Project layout

```
index.html        The whole page (hero, product grid, footer)
styles.css        Playful colorful responsive styling
script.js         Card expand/collapse behavior (vanilla JS)
images/           Product images (placeholder SVGs included)
deploy.sh         One-command S3 deploy (with validation + --check)
test/             Test suite (Node + jsdom)
docs/             Design spec and implementation plan
```

## Preview locally

Just open the file in your browser:

```bash
open index.html        # macOS
```

Everything runs client-side — no server required.

## Run the tests

The test suite uses Node + jsdom (the only dev dependency).

```bash
npm install
npm test
```

It checks the card behavior, HTML structure, accessibility/security
(alt text, external-link `rel`, no inline handlers), and the deploy script's
input validation.

## Add a new product

1. Open `index.html` and find the block marked:

   ```html
   <!-- PRODUCT CARD TEMPLATE — COPY THIS ... -->
   ```

2. Copy a whole `<article class="card"> ... </article>` block and paste it
   inside `<div class="product-grid">`.
3. Update:
   - the **image** `src` (drop your image in `images/`) and its `alt` text,
   - the **title**, **blurb**, and **tags**,
   - the **detail** paragraph and the larger detail image,
   - the **link buttons** (`href`).
4. Keep external links as `target="_blank" rel="noopener noreferrer"` and give
   every `<img>` meaningful `alt` text — the tests enforce both.
5. Run `npm test` to confirm everything still passes.

No JavaScript changes are needed — new cards are wired up automatically.

## Deploy to AWS S3 (static website hosting)

> You can fill in your real bucket name whenever you're ready — nothing here is
> hardcoded.

### One-time AWS setup

1. **Create a bucket** (name must be globally unique, lowercase):

   ```bash
   aws s3 mb s3://YOUR-BUCKET-NAME
   ```

2. **Enable static website hosting** with `index.html` as the index document:

   ```bash
   aws s3 website s3://YOUR-BUCKET-NAME --index-document index.html
   ```

3. **Allow public read access.** In the S3 console, disable "Block all public
   access" for the bucket, then apply this bucket policy (replace
   `YOUR-BUCKET-NAME`):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadForWebsite",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

   Save it as `bucket-policy.json` and apply:

   ```bash
   aws s3api put-bucket-policy --bucket YOUR-BUCKET-NAME --policy file://bucket-policy.json
   ```

Your site URL will be the S3 website endpoint, typically:
`http://YOUR-BUCKET-NAME.s3-website-<region>.amazonaws.com`

### Deploy

Requires the [AWS CLI](https://aws.amazon.com/cli/) installed and configured
(`aws configure`).

```bash
# Preview exactly what would be uploaded (no changes made):
./deploy.sh YOUR-BUCKET-NAME --check

# Actually deploy:
./deploy.sh YOUR-BUCKET-NAME
```

You can also set the bucket via environment variable:

```bash
S3_BUCKET=YOUR-BUCKET-NAME ./deploy.sh
```

`deploy.sh` validates the bucket name, confirms `index.html` exists, uploads
only site assets (excluding `test/`, `docs/`, `node_modules/`, scripts, and
markdown), and uses `--delete` to keep the bucket in sync with your local files.

## Security notes

- No secrets live in this repo. AWS credentials are read by the AWS CLI from
  your local configuration, never committed.
- Public read access applies only to the static site objects (via the bucket
  policy above), not to your AWS account.
- For HTTPS and a custom domain, put CloudFront in front of the bucket later —
  the current setup is plain S3 website hosting.
