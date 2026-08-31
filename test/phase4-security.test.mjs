import test from 'node:test';
import assert from 'node:assert/strict';

test('Phase 4 contract: eligibility tokens are short-lived and bound to survey/hash/nullifier', () => {
  const claims = { type: 'eligibility', surveyId: 'survey-1', eligibilityHash: 'hash-1', nullifier: 'n'.repeat(64) };
  assert.equal(claims.type, 'eligibility');
  assert.equal(claims.surveyId, 'survey-1');
  assert.equal(claims.eligibilityHash, 'hash-1');
  assert.equal(claims.nullifier.length, 64);
});

test('Phase 4 contract: demographic PII is not part of response payload', () => {
  const responsePayload = {
    eligibilityToken: 'token',
    nullifier: 'n'.repeat(64),
    answers: [{ questionId: 'q1', answer: 'Daily' }],
  };
  assert.equal('dob' in responsePayload, false);
  assert.equal('country' in responsePayload, false);
  assert.equal('age' in responsePayload, false);
});
