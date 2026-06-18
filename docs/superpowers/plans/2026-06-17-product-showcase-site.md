# Product Showcase Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playful, colorful static product-showcase website with expanding cards, hardcoded in HTML, deployable to AWS S3 static website hosting, with an automated test suite.

**Architecture:** Pure static site — `index.html` + `styles.css` + `script.js` (vanilla, no framework, no build step). `script.js` is written as a UMD-style module so the same file auto-initializes in the browser and is importable by tests in Node. Tests run on Node 16 via a tiny zero-dependency harness (`node:assert`) with `jsdom@21.1.2` as the only dev dependency for DOM/HTML assertions. Deployment is a hardened `deploy.sh` wrapping `aws s3 sync`.

**Tech Stack:** HTML5, CSS3 (Grid/Flex, custom properties, animations), vanilla ES5/ES2015 JS, Node 16 + jsdom 21 for tests, AWS CLI for deploy.

## Global Constraints

- No build tooling, bundler, or frontend framework — files upload to S3 as-is.
- Node engine: 16.14 (no stable `node:test`; use custom harness + `node:assert`).
- Only dev dependency permitted: `jsdom@21.1.2` (Node 16 compatible).
- All external links MUST have `target="_blank"` and `rel="noopener noreferrer"` (tabnabbing guard).
- All `<img>` MUST have non-empty `alt` text (accessibility).
- JS MUST NOT use `innerHTML`/`outerHTML`/`document.write` with dynamic values (XSS guard); use `textContent`/attribute APIs only.
- Animations MUST respect `prefers-reduced-motion`.
- Cards MUST be keyboard-operable (Enter/Space toggles; `aria-expanded` reflects state).
- `node_modules/` is git-ignored; site assets never include node_modules.
- Commit messages: plain, no co-author/attribution trailers.

---

## File Structure

- `index.html` — full page: hero, product grid (hardcoded cards w/ expand region), footer. Contains a clearly marked card template comment.
- `styles.css` — colorful playful styling, responsive grid, animations w/ reduced-motion guard.
- `script.js` — UMD module exporting `setupShowcase(doc)` and `toggleCard(card, expanded?)`; auto-inits in browser.
- `images/` — placeholder SVG images so the site renders out of the box.
- `deploy.sh` — hardened S3 deploy with validation, `--check` dry-run, bucket-name validation.
- `package.json` — dev dep `jsdom@21.1.2`; `test` script.
- `test/harness.js` — minimal test runner (`test()`, `run()`, re-exports `assert`).
- `test/run.js` — requires all `*.test.js` and runs the harness; exits non-zero on failure.
- `test/dom.test.js` — `script.js` behavior tests (toggle, keyboard, isolation, link click does not toggle).
- `test/html.test.js` — structural + security checks against `index.html`.
- `test/deploy.test.js` — `deploy.sh` validation/dry-run behavior.
- `.gitignore` — `node_modules/`.
- `README.md` — how to run/test, add a product, and deploy to S3.

---

### Task 1: Project scaffolding (package.json, gitignore, test harness)

**Files:**
- Create: `package.json`, `.gitignore`, `test/harness.js`, `test/run.js`

**Interfaces:**
- Produces: `test/harness.js` exports `{ test(name, fn), run(), assert }`. `test` registers; `run()` executes all registered, prints `N passed, M failed`, `process.exit(1)` if any fail. `npm test` runs `node test/run.js`.

- [ ] **Step 1: Write `.gitignore`**
```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 2: Write `package.json`**
```json
{
  "name": "my-projects-website",
  "version": "1.0.0",
  "private": true,
  "description": "Playful static showcase of products I build.",
  "scripts": {
    "test": "node test/run.js"
  },
  "devDependencies": {
    "jsdom": "21.1.2"
  }
}
```

- [ ] **Step 3: Write `test/harness.js`**
```js
'use strict';
const assert = require('node:assert');

const tests = [];
function test(name, fn) {
  if (typeof name !== 'string' || typeof fn !== 'function') {
    throw new TypeError('test(name, fn) requires a string and a function');
  }
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  const failures = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log('  ✓ ' + name);
    } catch (err) {
      failures.push({ name, err });
      console.error('  ✗ ' + name + '\n      ' + (err && err.stack ? err.stack.split('\n').join('\n      ') : err));
    }
  }
  console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
  if (failures.length > 0) process.exit(1);
}

module.exports = { test, run, assert };
```

- [ ] **Step 4: Write `test/run.js`**
```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./harness');

const dir = __dirname;
for (const file of fs.readdirSync(dir)) {
  if (file.endsWith('.test.js')) require(path.join(dir, file));
}

run();
```

- [ ] **Step 5: Install deps and verify harness runs with zero tests**
Run: `npm install && npm test`
Expected: installs jsdom; prints `0 passed, 0 failed`; exit 0.

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json .gitignore test/harness.js test/run.js
git commit -m "Add test harness and project scaffolding"
```

---

### Task 2: script.js behavior (TDD)

**Files:**
- Create: `script.js`, `test/dom.test.js`

**Interfaces:**
- Produces: `script.js` exports (CommonJS) `{ setupShowcase, toggleCard }`.
  - `setupShowcase(doc)` — wires every `.card` in `doc`: makes the card header (`.card__toggle`) clickable + keyboard-operable, sets initial `aria-expanded="false"`. Returns the number of cards wired.
  - `toggleCard(card, expanded)` — sets card expanded state. `card` is the `.card` element. `expanded` optional boolean; if omitted, flips current state. Updates `.is-open` class on card, `aria-expanded` on the `.card__toggle`, and `hidden` on `.card__detail`. Returns the new boolean state.
  - In a browser (`window` + `document` defined) the module auto-calls `setupShowcase(document)` on `DOMContentLoaded`.

- [ ] **Step 1: Write failing tests `test/dom.test.js`**
```js
'use strict';
const { test, assert } = require('./harness');
const { JSDOM } = require('jsdom');

function makeDom() {
  const html = `<!DOCTYPE html><body>
    <article class="card" id="c1">
      <button class="card__toggle"><h3>One</h3></button>
      <div class="card__detail"><a class="ext" href="https://a" target="_blank" rel="noopener noreferrer">live</a></div>
    </article>
    <article class="card" id="c2">
      <button class="card__toggle"><h3>Two</h3></button>
      <div class="card__detail">two detail</div>
    </article>
  </body>`;
  return new JSDOM(html);
}

function load(doc, win) {
  // Fresh require each time to avoid cross-test state.
  delete require.cache[require.resolve('../script.js')];
  global.window = win; // present for any feature checks; auto-init guarded below
  const mod = require('../script.js');
  delete global.window;
  return mod;
}

test('setupShowcase wires all cards and sets aria-expanded=false', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load(doc, window);
  const n = setupShowcase(doc);
  assert.strictEqual(n, 2);
  for (const t of doc.querySelectorAll('.card__toggle')) {
    assert.strictEqual(t.getAttribute('aria-expanded'), 'false');
  }
  for (const d of doc.querySelectorAll('.card__detail')) {
    assert.strictEqual(d.hasAttribute('hidden'), true);
  }
});

test('clicking a card toggle opens it and updates aria/hidden', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load(doc, window);
  setupShowcase(doc);
  const card = doc.getElementById('c1');
  const toggle = card.querySelector('.card__toggle');
  toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), true);
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(card.querySelector('.card__detail').hasAttribute('hidden'), false);
  // click again collapses
  toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), false);
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
});

test('Enter and Space keys toggle the card', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load(doc, window);
  setupShowcase(doc);
  const card = doc.getElementById('c1');
  const toggle = card.querySelector('.card__toggle');
  toggle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), true);
  toggle.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), false);
});

test('toggling one card does not affect others', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load(doc, window);
  setupShowcase(doc);
  doc.getElementById('c1').querySelector('.card__toggle')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(doc.getElementById('c1').classList.contains('is-open'), true);
  assert.strictEqual(doc.getElementById('c2').classList.contains('is-open'), false);
});

test('clicking a link inside the detail does not toggle the card', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase, toggleCard } = load(doc, window);
  setupShowcase(doc);
  const card = doc.getElementById('c1');
  toggleCard(card, true); // open it
  const link = card.querySelector('a.ext');
  link.dispatchEvent(new window.Event('click', { bubbles: true }));
  // still open — link click must not collapse via bubbling
  assert.strictEqual(card.classList.contains('is-open'), true);
});

test('setupShowcase is null-safe with no cards', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { setupShowcase } = load(dom.window.document, dom.window);
  assert.strictEqual(setupShowcase(dom.window.document), 0);
  assert.strictEqual(setupShowcase(null), 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**
Run: `npm test`
Expected: FAIL — `Cannot find module '../script.js'`.

- [ ] **Step 3: Write `script.js`**
```js
'use strict';
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  // Browser auto-init only when a real document exists and we are not under test.
  if (typeof window !== 'undefined' && typeof document !== 'undefined' &&
      typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.setupShowcase(document); });
    } else {
      api.setupShowcase(document);
    }
  }
})(this, function () {
  function getToggle(card) {
    return card ? card.querySelector('.card__toggle') : null;
  }
  function getDetail(card) {
    return card ? card.querySelector('.card__detail') : null;
  }

  function toggleCard(card, expanded) {
    if (!card) return false;
    var toggle = getToggle(card);
    var detail = getDetail(card);
    var next = (typeof expanded === 'boolean')
      ? expanded
      : !card.classList.contains('is-open');
    card.classList.toggle('is-open', next);
    if (toggle) toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
    if (detail) {
      if (next) detail.removeAttribute('hidden');
      else detail.setAttribute('hidden', '');
    }
    return next;
  }

  function setupShowcase(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return 0;
    var cards = doc.querySelectorAll('.card');
    var count = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var toggle = getToggle(card);
      if (!toggle) return;
      // initialize collapsed state
      toggleCard(card, false);
      toggle.addEventListener('click', function () { toggleCard(card); });
      toggle.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          toggleCard(card);
        }
      });
      count += 1;
    });
    return count;
  }

  return { setupShowcase: setupShowcase, toggleCard: toggleCard };
});
```
Note: the test loads the module via `require`, so `module` is defined and browser auto-init is correctly skipped. Link clicks inside `.card__detail` never collapse the card because only `.card__toggle` carries listeners — bubbling to the card is irrelevant.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npm test`
Expected: all dom tests PASS.

- [ ] **Step 5: Commit**
```bash
git add script.js test/dom.test.js
git commit -m "Add showcase card toggle behavior with tests"
```

---

### Task 3: index.html + placeholder images + html/security tests (TDD)

**Files:**
- Create: `index.html`, `images/placeholder-1.svg`, `images/placeholder-2.svg`, `images/placeholder-3.svg`, `test/html.test.js`

**Interfaces:**
- Consumes: classes wired by `script.js` (`.card`, `.card__toggle`, `.card__detail`).
- Produces: a valid HTML document with a hero, a `.product-grid` containing `.card` articles, and a footer. Loads `styles.css` and `script.js` (deferred).

- [ ] **Step 1: Write failing tests `test/html.test.js`**
```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { test, assert } = require('./harness');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'index.html');
function doc() {
  return new JSDOM(fs.readFileSync(htmlPath, 'utf8')).window.document;
}

test('index.html exists and has a title', () => {
  const d = doc();
  assert.ok(d.querySelector('title'), 'missing <title>');
  assert.ok(d.querySelector('title').textContent.trim().length > 0);
});

test('has a lang attribute and charset/viewport meta', () => {
  const d = doc();
  assert.ok(d.documentElement.getAttribute('lang'), 'missing lang');
  assert.ok(d.querySelector('meta[charset]'), 'missing charset meta');
  assert.ok(d.querySelector('meta[name="viewport"]'), 'missing viewport meta');
});

test('has at least one product card with toggle and detail', () => {
  const d = doc();
  const cards = d.querySelectorAll('.product-grid .card');
  assert.ok(cards.length >= 1, 'expected >=1 card');
  for (const c of cards) {
    assert.ok(c.querySelector('.card__toggle'), 'card missing .card__toggle');
    assert.ok(c.querySelector('.card__detail'), 'card missing .card__detail');
  }
});

test('every image has non-empty alt text', () => {
  const d = doc();
  const imgs = d.querySelectorAll('img');
  assert.ok(imgs.length >= 1, 'expected at least one image');
  for (const img of imgs) {
    assert.ok((img.getAttribute('alt') || '').trim().length > 0,
      'image missing alt: ' + img.getAttribute('src'));
  }
});

test('every external link is rel=noopener noreferrer and target=_blank', () => {
  const d = doc();
  const links = d.querySelectorAll('a[href^="http"]');
  for (const a of links) {
    assert.strictEqual(a.getAttribute('target'), '_blank',
      'external link missing target=_blank: ' + a.getAttribute('href'));
    const rel = (a.getAttribute('rel') || '');
    assert.ok(/noopener/.test(rel) && /noreferrer/.test(rel),
      'external link missing rel noopener noreferrer: ' + a.getAttribute('href'));
  }
});

test('loads styles.css and script.js (deferred)', () => {
  const d = doc();
  assert.ok(d.querySelector('link[rel="stylesheet"][href="styles.css"]'));
  const s = d.querySelector('script[src="script.js"]');
  assert.ok(s, 'missing script.js');
  assert.ok(s.hasAttribute('defer'), 'script.js should be deferred');
});

test('contains the copy-this card template comment', () => {
  const raw = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(/COPY THIS/i.test(raw), 'missing card template comment marker');
});

test('no inline event handlers (on* attributes)', () => {
  const raw = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(!/\son[a-z]+\s*=/.test(raw), 'inline event handler attribute found');
});
```

- [ ] **Step 2: Run tests to verify they fail**
Run: `npm test`
Expected: html tests FAIL — `index.html` does not exist.

- [ ] **Step 3: Create placeholder SVG images**
`images/placeholder-1.svg` (repeat with different gradient stops/letters for -2 and -3):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Placeholder">
  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff5f6d"/><stop offset="1" stop-color="#ffc371"/>
  </linearGradient></defs>
  <rect width="800" height="500" fill="url(#g1)"/>
  <text x="50%" y="52%" font-family="system-ui,sans-serif" font-size="120"
    fill="#ffffff" text-anchor="middle" font-weight="700">01</text>
</svg>
```
(-2: colors `#36d1dc`→`#5b86e5`, text `02`; -3: colors `#a18cd1`→`#fbc2eb`, text `03`.)

- [ ] **Step 4: Write `index.html`** (hero + 3 sample cards + footer; see implementation for full markup). Requirements it must satisfy: `<html lang="en">`, charset+viewport meta, `<link rel="stylesheet" href="styles.css">`, `<script src="script.js" defer></script>`, a `.product-grid` with `.card` articles each containing a `.card__toggle` button (image + title + blurb + tags) and a `.card__detail` region (longer writeup + larger image + external link buttons with `target="_blank" rel="noopener noreferrer"`), a `<!-- ==== PRODUCT CARD TEMPLATE — COPY THIS ==== -->` block, no inline `on*` handlers, every `<img>` has alt text.

- [ ] **Step 5: Run tests to verify they pass**
Run: `npm test`
Expected: all html tests PASS.

- [ ] **Step 6: Commit**
```bash
git add index.html images test/html.test.js
git commit -m "Add homepage markup, placeholder images, and html/security tests"
```

---

### Task 4: styles.css (playful, colorful, responsive, reduced-motion)

**Files:**
- Create: `styles.css`

**Interfaces:**
- Consumes: the class names used in `index.html` (`.hero`, `.product-grid`, `.card`, `.card__toggle`, `.card__detail`, `.is-open`, `.tag`, `.btn`).

- [ ] **Step 1: Write `styles.css`** — CSS custom properties for a bright palette; animated gradient hero; responsive `.product-grid` via `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`; rounded cards with hover lift/tilt; `.card__detail[hidden]` stays hidden; smooth max-height/opacity transition on `.is-open`; a `@media (prefers-reduced-motion: reduce)` block disabling transitions/animations; mobile-friendly spacing.

- [ ] **Step 2: Verify visually**
Run: `node -e "const{JSDOM}=require('jsdom');const fs=require('fs');new JSDOM(fs.readFileSync('index.html','utf8'),{resources:'usable'});console.log('parses ok')"`
Then open `index.html` in a browser and confirm: cards render, hover effect, click expands one card, reduced-motion respected (OS setting). Note manual check in commit.

- [ ] **Step 3: Run full test suite (no regressions)**
Run: `npm test`
Expected: all PASS.

- [ ] **Step 4: Commit**
```bash
git add styles.css
git commit -m "Add playful colorful responsive styling"
```

---

### Task 5: deploy.sh (hardened) + deploy tests (TDD)

**Files:**
- Create: `deploy.sh`, `test/deploy.test.js`

**Interfaces:**
- Produces: `deploy.sh` — usage: `./deploy.sh <bucket-name> [--check]`. Bucket may also come from `$S3_BUCKET`. Behavior:
  - No bucket given and `$S3_BUCKET` unset → print usage to stderr, exit 2.
  - Invalid S3 bucket name (not 3–63 chars, not `[a-z0-9.-]`, not start/end alnum, no consecutive dots, not IP-like) → error, exit 3.
  - `index.html` missing in script dir → error, exit 4.
  - `aws` CLI not on PATH → error, exit 5.
  - `--check` → validate everything, print the `aws s3 sync` command that would run, do NOT call aws, exit 0.
  - Otherwise run `aws s3 sync` of the site dir to `s3://<bucket>`, excluding non-site files (`.git/*`, `node_modules/*`, `docs/*`, `test/*`, `*.sh`, `package*.json`, `.gitignore`, `.remember/*`), with `--delete`.

- [ ] **Step 1: Write failing tests `test/deploy.test.js`**
```js
'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, assert } = require('./harness');

const script = path.join(__dirname, '..', 'deploy.sh');

function runDeploy(args, env) {
  try {
    const stdout = execFileSync('bash', [script, ...args], {
      env: Object.assign({}, process.env, env || {}),
      encoding: 'utf8',
    });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

test('no bucket arg and no env exits non-zero with usage', () => {
  const r = runDeploy([], { S3_BUCKET: '' });
  assert.notStrictEqual(r.code, 0);
  assert.ok(/usage/i.test((r.stderr || '') + (r.stdout || '')), 'expected usage message');
});

test('invalid bucket name is rejected', () => {
  const r = runDeploy(['Invalid_Bucket_NAME', '--check']);
  assert.notStrictEqual(r.code, 0);
  assert.ok(/bucket name/i.test((r.stderr || '') + (r.stdout || '')));
});

test('--check with valid bucket prints planned sync and does not deploy', () => {
  const r = runDeploy(['my-valid-bucket-123', '--check']);
  assert.strictEqual(r.code, 0);
  assert.ok(/aws s3 sync/.test(r.stdout), 'expected planned command in output');
  assert.ok(/s3:\/\/my-valid-bucket-123/.test(r.stdout));
  assert.ok(/--exclude/.test(r.stdout) && /--delete/.test(r.stdout));
});

test('bucket via S3_BUCKET env works with --check', () => {
  const r = runDeploy(['--check'], { S3_BUCKET: 'env-bucket-name' });
  assert.strictEqual(r.code, 0);
  assert.ok(/s3:\/\/env-bucket-name/.test(r.stdout));
});
```

- [ ] **Step 2: Run tests to verify they fail**
Run: `npm test`
Expected: deploy tests FAIL — `deploy.sh` missing.

- [ ] **Step 3: Write `deploy.sh`**
```bash
#!/usr/bin/env bash
# Deploy the static site to an AWS S3 static-website bucket.
# Usage: ./deploy.sh <bucket-name> [--check]
#        S3_BUCKET=<bucket-name> ./deploy.sh [--check]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Usage: ./deploy.sh <bucket-name> [--check]" >&2
  echo "       S3_BUCKET=<bucket-name> ./deploy.sh [--check]" >&2
  echo "  --check  validate and print the planned command without deploying" >&2
}

CHECK=0
BUCKET="${S3_BUCKET:-}"
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Error: unknown option: $arg" >&2; usage; exit 2 ;;
    *) BUCKET="$arg" ;;
  esac
done

if [ -z "$BUCKET" ]; then
  echo "Error: no bucket name provided." >&2
  usage
  exit 2
fi

# Validate S3 bucket naming rules.
valid_bucket() {
  local b="$1"
  [ "${#b}" -ge 3 ] && [ "${#b}" -le 63 ] || return 1
  [[ "$b" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ ]] || return 1
  [[ "$b" == *..* ]] && return 1
  [[ "$b" =~ ^([0-9]+\.){3}[0-9]+$ ]] && return 1
  return 0
}
if ! valid_bucket "$BUCKET"; then
  echo "Error: invalid S3 bucket name: '$BUCKET'" >&2
  echo "Bucket names must be 3-63 chars, lowercase letters/numbers/dots/hyphens, start and end alphanumeric, no consecutive dots, not an IP address." >&2
  exit 3
fi

if [ ! -f "$SCRIPT_DIR/index.html" ]; then
  echo "Error: index.html not found in $SCRIPT_DIR" >&2
  exit 4
fi

SYNC_ARGS=(s3 sync "$SCRIPT_DIR/" "s3://$BUCKET/"
  --exclude ".git/*"
  --exclude "node_modules/*"
  --exclude "docs/*"
  --exclude "test/*"
  --exclude ".remember/*"
  --exclude "*.sh"
  --exclude "package.json"
  --exclude "package-lock.json"
  --exclude ".gitignore"
  --exclude "*.md"
  --delete)

if [ "$CHECK" -eq 1 ]; then
  echo "aws ${SYNC_ARGS[*]}"
  echo "(--check: not executing)"
  exit 0
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found on PATH. Install and configure it first." >&2
  exit 5
fi

echo "Deploying to s3://$BUCKET ..."
aws "${SYNC_ARGS[@]}"
echo "Done. If static website hosting is enabled, your site is live at the bucket website endpoint."
```

- [ ] **Step 4: Make executable and run tests to verify they pass**
Run: `chmod +x deploy.sh && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**
```bash
git add deploy.sh test/deploy.test.js
git commit -m "Add hardened S3 deploy script with validation tests"
```

---

### Task 6: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** covering: project overview; local preview (`open index.html`); running tests (`npm install` then `npm test`); how to add a product (copy the `COPY THIS` card block, swap image/title/blurb/tags/links/detail, ensure external links keep `target="_blank" rel="noopener noreferrer"` and images have `alt`); AWS S3 setup steps (create bucket; enable static website hosting w/ index document `index.html`; disable Block Public Access; apply public-read bucket policy — include the JSON policy with a `REPLACE-BUCKET-NAME` marker); deploying (`./deploy.sh <bucket> --check` then `./deploy.sh <bucket>`); security notes (no secrets in repo, public-read is for the site only).

- [ ] **Step 2: Run full suite**
Run: `npm test`
Expected: all PASS.

- [ ] **Step 3: Commit**
```bash
git add README.md
git commit -m "Add README with setup, add-product, and deploy docs"
```

---

## Self-Review

- **Spec coverage:** Hero/grid/expanding detail/footer → Tasks 3–4. Playful colorful + reduced-motion + responsive + a11y → Task 4 + global constraints + Task 2/3 tests. Hardcoded cards + COPY THIS template → Task 3. Images on every product → Task 3 (alt-text test). S3 static hosting + deploy.sh + README → Tasks 5–6. Testing/verification → harness Task 1 + tests in Tasks 2/3/5. All spec sections covered.
- **Placeholder scan:** No TBD/TODO; code shown for every code step. Task 3 Step 4 and Task 4 Step 1 describe required HTML/CSS by explicit acceptance criteria enforced by the Task-3 tests rather than pasting the full long markup — acceptable because the tests are the executable contract. Task 6 likewise gated by content checklist.
- **Type consistency:** `setupShowcase(doc)`/`toggleCard(card, expanded)`; classes `.card`/`.card__toggle`/`.card__detail`/`.is-open` consistent across script.js, tests, index.html, styles.css. Deploy exit codes (2/3/4/5) consistent between script and tests.
