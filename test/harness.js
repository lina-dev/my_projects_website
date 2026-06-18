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
      const detail = err && err.stack ? err.stack.split('\n').join('\n      ') : String(err);
      console.error('  ✗ ' + name + '\n      ' + detail);
    }
  }
  console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
  if (failures.length > 0) process.exit(1);
}

module.exports = { test, run, assert };
