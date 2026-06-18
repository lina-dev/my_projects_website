'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { test, assert } = require('./harness');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'index.html');
function raw() {
  return fs.readFileSync(htmlPath, 'utf8');
}
function doc() {
  return new JSDOM(raw()).window.document;
}

test('index.html exists and has a non-empty title', () => {
  const d = doc();
  const title = d.querySelector('title');
  assert.ok(title, 'missing <title>');
  assert.ok(title.textContent.trim().length > 0, 'empty title');
});

test('has lang attribute and charset/viewport meta', () => {
  const d = doc();
  assert.ok(d.documentElement.getAttribute('lang'), 'missing lang');
  assert.ok(d.querySelector('meta[charset]'), 'missing charset meta');
  assert.ok(d.querySelector('meta[name="viewport"]'), 'missing viewport meta');
});

test('has at least one product card with a title, image, and link', () => {
  const d = doc();
  const cards = d.querySelectorAll('.product-grid .card');
  assert.ok(cards.length >= 1, 'expected >=1 card');
  for (const c of cards) {
    assert.ok(c.querySelector('.card__title'), 'card missing .card__title');
    assert.ok(c.querySelector('.card__image'), 'card missing .card__image');
    assert.ok(c.querySelector('.card__links a'), 'card missing a link');
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
  assert.ok(links.length >= 1, 'expected at least one external link');
  for (const a of links) {
    assert.strictEqual(a.getAttribute('target'), '_blank',
      'external link missing target=_blank: ' + a.getAttribute('href'));
    const rel = a.getAttribute('rel') || '';
    assert.ok(/noopener/.test(rel) && /noreferrer/.test(rel),
      'external link missing rel noopener noreferrer: ' + a.getAttribute('href'));
  }
});

test('loads styles.css and deferred script.js', () => {
  const d = doc();
  assert.ok(d.querySelector('link[rel="stylesheet"][href="styles.css"]'),
    'missing styles.css link');
  const s = d.querySelector('script[src="script.js"]');
  assert.ok(s, 'missing script.js');
  assert.ok(s.hasAttribute('defer'), 'script.js should be deferred');
});

test('contains the COPY THIS card template comment', () => {
  assert.ok(/COPY THIS/i.test(raw()), 'missing card template comment marker');
});

test('no inline event handler attributes', () => {
  assert.ok(!/\son[a-z]+\s*=/.test(raw()), 'inline event handler attribute found');
});
