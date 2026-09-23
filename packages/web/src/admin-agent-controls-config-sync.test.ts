import assert from 'node:assert/strict';
import test from 'node:test';

import {
  POINT_TO_POINT_ADMIN_DEFAULTS,
  shouldSyncAgentConfigFromStatus,
} from './admin-agent-controls-config-sync.js';
import task9Sketch from './experiments/task9/sketch.js';

test('main admin auto-start config syncs only on the initial idle status load', () => {
  assert.equal(shouldSyncAgentConfigFromStatus(false, 'idle'), true);
  assert.equal(shouldSyncAgentConfigFromStatus(false, 'running'), false);
  assert.equal(shouldSyncAgentConfigFromStatus(true, 'idle'), false);
});

test('main admin and Task9 use the point-to-point 3/5/2, 30-second defaults', () => {
  assert.deepEqual(POINT_TO_POINT_ADMIN_DEFAULTS, {
    taskType: 'task9',
    cursorControlBaselineTrials: 3,
    cursorControlSharedTrials: 5,
    cursorControlWashoutTrials: 2,
    cursorControlAdaptationTrials: 0,
    trialDurationSeconds: 30,
    instructionDurationMs: 4000,
  });
  assert.deepEqual(
    {
      baseline: task9Sketch.defaults?.cursorControlBaselineTrials,
      shared: task9Sketch.defaults?.cursorControlSharedTrials,
      washout: task9Sketch.defaults?.cursorControlWashoutTrials,
      seconds: task9Sketch.defaults?.trialDurationSeconds,
    },
    { baseline: 3, shared: 5, washout: 2, seconds: 30 },
  );
});
