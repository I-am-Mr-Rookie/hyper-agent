import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateSubmission } from '../src/api/middleware/validation.js';

// Offline unit checks; run with `node --test tests/validation.test.js`.
function validate(body) {
  let status = 200;
  const req = { body };
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  validateSubmission(req, res, () => {});
  return { status, value: req.validatedBody };
}

describe('validateSubmission resource limits', () => {
  it('rejects memory_limit 0, which Docker treats as unlimited memory', () => {
    assert.strictEqual(validate({ language_id: 71, source_code: 'print(1)', memory_limit: 0 }).status, 422);
  });

  it('accepts a normal memory limit', () => {
    assert.strictEqual(validate({ language_id: 71, source_code: 'print(1)', memory_limit: 128000 }).status, 200);
  });
});

describe('validateSubmission callback_url', () => {
  for (const url of ['http://169.254.170.2/v2/credentials', 'http://0.0.0.0:80/', 'http://0.1.2.3/', 'http://2130706433/']) {
    it(`blocks link-local/unspecified/loopback target ${url}`, () => {
      assert.strictEqual(validate({ language_id: 71, source_code: 'x', callback_url: url }).status, 422);
    });
  }

  it('allows a public https callback', () => {
    assert.strictEqual(validate({ language_id: 71, source_code: 'x', callback_url: 'https://example.com/hook' }).status, 200);
  });
});
