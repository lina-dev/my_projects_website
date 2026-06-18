# Product Showcase Site — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)

## Purpose

A beautiful, playful static website where the owner publishes the digital
products they build — a personal "things I built" showcase. New products are
added by hand-editing HTML. The site is hosted on AWS S3 static website hosting.

## Goals

- Visual-forward: every product leads with an image.
- Playful & colorful aesthetic with tasteful motion.
- Zero build tooling — plain files that upload directly to S3.
- Easy, reliable way to add a new product (copy-paste a card template).
- One-command deploy to S3.

## Non-Goals (YAGNI)

- No CMS, database, or backend.
- No build step, bundler, or framework.
- No CloudFront/CDN, custom domain, or HTTPS setup (S3 static hosting only —
  can be added later).
- No contact form (links only).
- No per-product separate pages (detail expands in-place instead).

## Tech Stack

Pure static site — no build tools, no frameworks:

- `index.html` — entire page (hero, product grid, footer).
- `styles.css` — playful, colorful styling.
- `script.js` — vanilla JS for card expand/collapse and small interactions.
- `images/` — product images (thumbnails / screenshots).
- `deploy.sh` — `aws s3 sync` deploy script.
- `README.md` — setup, "how to add a product", and deploy instructions.

## Page Layout (single page)

1. **Hero** — owner name/tagline, short intro ("Things I build"), animated
   colorful gradient background.
2. **Product grid** — responsive grid of cards. Each card:
   - Product image (leads the card).
   - Title.
   - Short blurb.
   - Tags (e.g. "Web App", "Side Project").
   - Link buttons (Live / GitHub / etc.).
3. **Expanding detail** — clicking a card smoothly expands it in place
   (accordion-style) to reveal a longer writeup, larger image(s), and full
   links. Clicking again collapses it. No page navigation — snappy single-page
   feel. Only the markup inside each card is involved; no separate data file.
4. **Footer** — owner links (GitHub, email, etc.).

## Adding a Product

Cards are hardcoded in `index.html`. To keep this reliable:

- A single card is a self-contained block of markup.
- A clearly marked `<!-- ==== PRODUCT CARD TEMPLATE — COPY THIS ==== -->`
  block lives in the HTML (and is documented in the README) so adding a new
  product is a predictable copy-paste: duplicate the block, swap image, title,
  blurb, tags, links, and detail text.
- No JS changes needed to add a product — `script.js` wires up expand/collapse
  generically by selector/class, so new cards work automatically.

## Visual & Interaction Design

- Bright accent palette, soft rounded cards, subtle hover lift/tilt.
- Gently animated gradient hero.
- Responsive: looks good on mobile through desktop (CSS grid that reflows).
- Motion respects `prefers-reduced-motion` (animations reduced/disabled when
  the user prefers).
- Accessible: cards are keyboard-focusable and expand via keyboard; buttons
  have accessible labels; images have alt text.

## AWS Deployment (S3 static website hosting)

- `deploy.sh` runs `aws s3 sync ./ s3://<bucket> --exclude` of non-site files
  (e.g. `.git`, docs, the script itself), uploading the static site.
- `README.md` documents the one-time setup, copy-paste ready:
  1. Create the S3 bucket.
  2. Enable static website hosting (index document = `index.html`).
  3. Disable "Block Public Access" and apply a public-read bucket policy.
  4. Run `deploy.sh` (requires AWS CLI configured).
- The site URL is the S3 website endpoint.

## Testing / Verification

- Open `index.html` locally in a browser to verify layout, expand/collapse,
  responsiveness, and reduced-motion behavior.
- Verify `deploy.sh` excludes non-site files and syncs only site assets.
- After deploy, load the S3 website endpoint and confirm the page renders and
  cards expand.
