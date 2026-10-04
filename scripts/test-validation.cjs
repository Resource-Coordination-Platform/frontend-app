// Run with Node.js 24: npm run test:unit
const { test } = require('node:test'); // Defines each test.
const assert = require('node:assert/strict'); // Compares actual and expected results.

// Import the REAL functions used by the mobile app's forms.
const { validateEmail, validatePassword, validatePhone } = require('../utils/validation.ts');

test('U01: valid email is accepted', () => {
  const result = validateEmail('student@example.com'); // Input
  assert.equal(result.isValid, true); // Expected: accepted
});

test('U02: email without @ and domain is rejected', () => {
  const result = validateEmail('student');
  assert.equal(result.isValid, false); // Expected: rejected
  assert.ok(result.error); // An error message must also be returned.
});

test('U03: empty email is rejected', () => {
  const result = validateEmail('');
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});

test('U04: empty password is rejected', () => {
  const result = validatePassword('');
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});

test('U05: 9-character password is rejected (below minimum)', () => {
  const result = validatePassword('Abcdef12!'); // 9 characters
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});

test('U06: 10-character password is accepted (at minimum)', () => {
  const result = validatePassword('Abcdef123!'); // 10 characters
  assert.equal(result.isValid, true);
});

test('U07: valid local phone number is accepted', () => {
  const result = validatePhone('0771234567');
  assert.equal(result.isValid, true);
});

test('U08: phone number containing letters is rejected', () => {
  const result = validatePhone('077ABC4567');
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});
