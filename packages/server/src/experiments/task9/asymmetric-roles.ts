export type Task9AsymmetricRoles = {
  cursorIdentity: string;
  targetIdentity: string;
  activatesAfterSequence: number;
};

export function getTask9SharedTrialIndex(trialNumber: number, baselineTrials: number): number {
  return Math.max(0, Math.floor(trialNumber) - Math.max(0, Math.floor(baselineTrials)) - 1);
}

export function assignTask9AsymmetricRoles(
  identities: string[],
  seed: number,
  sharedTrialIndex: number,
): Task9AsymmetricRoles | null {
  const pair = [...new Set(identities)].sort((a, b) => a.localeCompare(b));
  if (pair.length !== 2) return null;

  const firstCursorIndex = ((Math.floor(seed) >>> 0) & 1)
    ^ (Math.max(0, Math.floor(sharedTrialIndex)) & 1);
  return {
    cursorIdentity: pair[firstCursorIndex],
    targetIdentity: pair[1 - firstCursorIndex],
    activatesAfterSequence: 0,
  };
}
