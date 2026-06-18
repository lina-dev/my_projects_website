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

function load() {
  // Fresh require each time to avoid cross-test module state.
  delete require.cache[require.resolve('../script.js')];
  return require('../script.js');
}

test('setupShowcase wires all cards and sets aria-expanded=false', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load();
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
  const { setupShowcase } = load();
  setupShowcase(doc);
  const card = doc.getElementById('c1');
  const toggle = card.querySelector('.card__toggle');
  toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), true);
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(card.querySelector('.card__detail').hasAttribute('hidden'), false);
  toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), false);
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
});

test('Enter and Space keys toggle the card', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase } = load();
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
  const { setupShowcase } = load();
  setupShowcase(doc);
  doc.getElementById('c1').querySelector('.card__toggle')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(doc.getElementById('c1').classList.contains('is-open'), true);
  assert.strictEqual(doc.getElementById('c2').classList.contains('is-open'), false);
});

test('clicking a link inside the detail does not toggle the card', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { setupShowcase, toggleCard } = load();
  setupShowcase(doc);
  const card = doc.getElementById('c1');
  toggleCard(card, true);
  const link = card.querySelector('a.ext');
  link.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.strictEqual(card.classList.contains('is-open'), true);
});

test('setupShowcase is null-safe with no cards', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { setupShowcase } = load();
  assert.strictEqual(setupShowcase(dom.window.document), 0);
  assert.strictEqual(setupShowcase(null), 0);
});

test('toggleCard returns the new boolean state and is null-safe', () => {
  const { window } = makeDom();
  const doc = window.document;
  const { toggleCard } = load();
  const card = doc.getElementById('c1');
  assert.strictEqual(toggleCard(card, true), true);
  assert.strictEqual(toggleCard(card), false);
  assert.strictEqual(toggleCard(null), false);
});
