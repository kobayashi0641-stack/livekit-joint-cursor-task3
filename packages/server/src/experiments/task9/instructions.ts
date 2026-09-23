import type { ExperimentConfig } from '../../agent-rules.js';

export function generateInstructions(_config: ExperimentConfig): string[] {
  return [
    'Reach as many red targets as possible within the time limit. A point is awarded only after the cursor remains continuously inside the red target for 50 milliseconds.',
    'You will first complete baseline trials using your own cursor and your own score.',
    'After that, you will control a shared cursor with the other participant and earn a shared score.',
    'After each shared-cursor trial, rate your contribution to earning the points.',
    'Finally, you will complete baseline trials again using your own cursor and your own score.',
  ];
}
