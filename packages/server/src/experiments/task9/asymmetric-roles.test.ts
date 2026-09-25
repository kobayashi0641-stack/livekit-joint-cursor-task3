import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignTask9AsymmetricRoles,
  getTask9SharedTrialIndex,
} from './asymmetric-roles.js';

test('assigns stable opposite roles to exactly two participants', () => {
  const forward = assignTask9AsymmetricRoles(['participant-b', 'participant-a'], 10, 0);
  const reversed = assignTask9AsymmetricRoles(['participant-a', 'participant-b'], 10, 0);

  assert.deepEqual(forward, reversed);
  assert.deepEqual(
    new Set([forward?.cursorIdentity, forward?.targetIdentity]),
    new Set(['participant-a', 'participant-b']),
  );
  assert.equal(forward?.activatesAfterSequence, 0);
});

test('randomizes the first assignment from the pair seed and alternates every Shared trial', () => {
  const evenFirst = assignTask9AsymmetricRoles(['participant-a', 'participant-b'], 10, 0);
  const oddFirst = assignTask9AsymmetricRoles(['participant-a', 'participant-b'], 11, 0);
  const evenSecond = assignTask9AsymmetricRoles(['participant-a', 'participant-b'], 10, 1);
  const evenThird = assignTask9AsymmetricRoles(['participant-a', 'participant-b'], 10, 2);

  assert.notEqual(evenFirst?.cursorIdentity, oddFirst?.cursorIdentity);
  assert.equal(evenSecond?.cursorIdentity, evenFirst?.targetIdentity);
  assert.equal(evenSecond?.targetIdentity, evenFirst?.cursorIdentity);
  assert.deepEqual(evenThird, evenFirst);
});

test('does not assign asymmetric roles without exactly two unique identities', () => {
  assert.equal(assignTask9AsymmetricRoles([], 10, 0), null);
  assert.equal(assignTask9AsymmetricRoles(['participant-a'], 10, 0), null);
  assert.equal(assignTask9AsymmetricRoles(['participant-a', 'participant-a'], 10, 0), null);
  assert.equal(assignTask9AsymmetricRoles(['a', 'b', 'c'], 10, 0), null);
});

test('derives a zero-based Shared-trial index after baseline trials', () => {
  assert.equal(getTask9SharedTrialIndex(4, 3), 0);
  assert.equal(getTask9SharedTrialIndex(5, 3), 1);
  assert.equal(getTask9SharedTrialIndex(3, 3), 0);
});

test('role assignment is JSON-safe recording and trajectory metadata', () => {
  const roles = assignTask9AsymmetricRoles(['participant-b', 'participant-a'], 11, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(roles)), roles);
});
