'use strict';
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  // Browser auto-init: only when a real document exists and we are NOT being
  // loaded as a CommonJS module (i.e. not under test).
  if (typeof module === 'undefined' &&
      typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        api.setupShowcase(document);
      });
    } else {
      api.setupShowcase(document);
    }
  }
})(this, function () {
  function getToggle(card) {
    return card && typeof card.querySelector === 'function'
      ? card.querySelector('.card__toggle') : null;
  }
  function getDetail(card) {
    return card && typeof card.querySelector === 'function'
      ? card.querySelector('.card__detail') : null;
  }

  function toggleCard(card, expanded) {
    if (!card || !card.classList) return false;
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
      toggleCard(card, false); // start collapsed
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
