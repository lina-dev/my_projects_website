'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, assert } = require('./harness');

const script = path.join(__dirname, '..', 'deploy.sh');

function runDeploy(args, env) {
  try {
    const stdout = execFileSync('bash', [script].concat(args), {
      env: Object.assign({}, process.env, env || {}),
      encoding: 'utf8',
    });
    return { code: 0, stdout: stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

test('no bucket arg and no env exits non-zero with usage', () => {
  const r = runDeploy([], { S3_BUCKET: '' });
  assert.notStrictEqual(r.code, 0);
  assert.ok(/usage/i.test(r.stderr + r.stdout), 'expected usage message');
});

test('invalid bucket name is rejected', () => {
  const r = runDeploy(['Invalid_Bucket_NAME', '--check']);
  assert.notStrictEqual(r.code, 0);
  assert.ok(/bucket name/i.test(r.stderr + r.stdout), 'expected bucket-name error');
});

test('IP-address-like bucket name is rejected', () => {
  const r = runDeploy(['192.168.0.1', '--check']);
  assert.notStrictEqual(r.code, 0);
});

test('--check with valid bucket prints planned sync and does not deploy', () => {
  const r = runDeploy(['my-valid-bucket-123', '--check']);
  assert.strictEqual(r.code, 0);
  assert.ok(/aws s3 sync/.test(r.stdout), 'expected planned command');
  assert.ok(/s3:\/\/my-valid-bucket-123/.test(r.stdout), 'expected bucket uri');
  assert.ok(/--exclude/.test(r.stdout) && /--delete/.test(r.stdout), 'expected exclude+delete');
});

test('bucket via S3_BUCKET env works with --check', () => {
  const r = runDeploy(['--check'], { S3_BUCKET: 'env-bucket-name' });
  assert.strictEqual(r.code, 0);
  assert.ok(/s3:\/\/env-bucket-name/.test(r.stdout), 'expected env bucket uri');
});

test('unknown option is rejected', () => {
  const r = runDeploy(['--bogus'], { S3_BUCKET: 'env-bucket-name' });
  assert.notStrictEqual(r.code, 0);
});
