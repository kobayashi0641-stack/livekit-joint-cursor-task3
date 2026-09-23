export type Task9Point = { x: number; y: number };

export type Task9DwellState = {
  enteredAt: number | null;
  scored: boolean;
};

export type Task9Clock = {
  phase: 'countdown' | 'running' | 'complete';
  countdown: number | null;
  remainingSeconds: number;
};

export type Task9RenderState = {
  showTask: boolean;
  showCursors: boolean;
  targetFill: '#dc2626' | '#16a34a';
};

export type Task9TrialState = {
  trialKey: string;
  seed: number;
  identityKey: string;
  sequence: number;
  score: number;
  targetIndex: number;
  targetPresentedAt: number;
  dwell: Task9DwellState;
};

export type Task9Acquisition = {
  trialKey: string;
  identityKey: string;
  sequence: number;
  score: number;
  targetIndex: number;
  nextTargetIndex: number;
  targetPresentedAt: number;
  acquiredAt: number;
  movementTimeMs: number;
  dwellMs: number;
};

export function advanceTask9SharedTargetParams(
  params: Record<string, unknown>,
  acquisition: Task9Acquisition,
  now: number,
): Record<string, unknown> | null {
  if (
    params.task9PointToPoint !== true
    || params.phase !== 'shared'
    || params.trialKey !== acquisition.trialKey
  ) {
    return null;
  }
  const sequence = Number(params.sequence ?? 0);
  const score = Number(params.score ?? 0);
  // The server's initial trial payload carries the shared seed but not the
  // derived grid index. The first acquisition therefore supplies the current
  // index; every authoritative update after that includes it explicitly.
  const targetIndex = Number(params.targetIndex ?? acquisition.targetIndex);
  if (
    !Number.isFinite(sequence)
    || !Number.isFinite(score)
    || !Number.isFinite(targetIndex)
    || acquisition.sequence !== sequence
    || acquisition.targetIndex !== targetIndex
  ) {
    return null;
  }
  return {
    ...params,
    sequence: sequence + 1,
    score: score + 1,
    targetIndex: acquisition.nextTargetIndex,
    targetPresentedAt: now,
  };
}

export function shouldShowTask9SharedFeedback(
  selectedByAdmin: boolean,
  enabled: boolean,
  phase: string | undefined,
): boolean {
  return selectedByAdmin && enabled && phase === 'shared';
}

export function isTask9CompletionMessage(text: string): boolean {
  return /^Trial \d+ of \d+ is complete\./.test(text.trim());
}

const INNER_RADIUS = 0.18;

/**
 * Thirteen vertices from a triangular lattice: the origin, its six nearest
 * neighbours, and the six next-nearest neighbours. The latter are rotated
 * 30 degrees and sit at sqrt(3) times the nearest-neighbour distance.
 */
export function createTask9TargetGrid(): Task9Point[] {
  const center = { x: 0.5, y: 0.5 };
  const ring = (radius: number, offsetDegrees: number) => Array.from({ length: 6 }, (_, index) => {
    const angle = ((offsetDegrees + index * 60) * Math.PI) / 180;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });
  return [center, ...ring(INNER_RADIUS, 0), ...ring(INNER_RADIUS * Math.sqrt(3), 30)];
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

/** Select a repeatable target. Sequence zero excludes the center start point. */
export function selectNextTargetIndex(
  seed: number,
  sequence: number,
  previousIndex: number | null,
  _identity: string,
): number {
  const count = createTask9TargetGrid().length;
  const mixed = mix32((Math.floor(seed) >>> 0) ^ Math.imul(sequence + 1, 0x9e3779b1));
  if (previousIndex === null) {
    return 1 + (mixed % (count - 1));
  }
  const offset = 1 + (mixed % (count - 1));
  return (previousIndex + offset) % count;
}

export function getTask9RenderState(
  phase: Task9Clock['phase'],
  cursorInsideTarget: boolean,
): Task9RenderState {
  const running = phase === 'running';
  return {
    showTask: running,
    showCursors: running,
    targetFill: cursorInsideTarget ? '#16a34a' : '#dc2626',
  };
}

export function updateDwellState(
  state: Task9DwellState,
  inside: boolean,
  now: number,
  requiredMs: number,
): Task9DwellState {
  if (state.scored) return state;
  if (!inside) return { enteredAt: null, scored: false };
  const enteredAt = state.enteredAt ?? now;
  return {
    enteredAt,
    scored: now - enteredAt >= Math.max(0, requiredMs),
  };
}

export function getTask9Clock(
  elapsedMs: number,
  countdownMs: number,
  durationMs: number,
): Task9Clock {
  const elapsed = Math.max(0, elapsedMs);
  const countdownDuration = Math.max(0, countdownMs);
  const trialDuration = Math.max(0, durationMs);
  if (elapsed < countdownDuration) {
    return {
      phase: 'countdown',
      countdown: Math.max(1, Math.ceil((countdownDuration - elapsed) / 1000)),
      remainingSeconds: Math.ceil(trialDuration / 1000),
    };
  }
  const trialElapsed = elapsed - countdownDuration;
  if (trialElapsed >= trialDuration) {
    return { phase: 'complete', countdown: null, remainingSeconds: 0 };
  }
  return {
    phase: 'running',
    countdown: null,
    remainingSeconds: Math.max(0, Math.ceil((trialDuration - trialElapsed) / 1000)),
  };
}

export function createTask9TrialState(
  trialKey: string,
  seed: number,
  identityKey: string,
  now: number,
): Task9TrialState {
  return {
    trialKey,
    seed,
    identityKey,
    sequence: 0,
    score: 0,
    targetIndex: selectNextTargetIndex(seed, 0, null, identityKey),
    targetPresentedAt: now,
    dwell: { enteredAt: null, scored: false },
  };
}

export function updateTask9TrialHit(
  state: Task9TrialState,
  inside: boolean,
  now: number,
  requiredDwellMs: number,
  mode: 'solo' | 'shared',
): { state: Task9TrialState; acquisition: Task9Acquisition | null } {
  const previousDwell = state.dwell;
  const dwell = updateDwellState(previousDwell, inside, now, requiredDwellMs);
  if (!dwell.scored || previousDwell.scored) {
    return { state: { ...state, dwell }, acquisition: null };
  }

  const nextSequence = state.sequence + 1;
  const nextTargetIndex = selectNextTargetIndex(
    state.seed,
    nextSequence,
    state.targetIndex,
    state.identityKey,
  );
  const acquisition: Task9Acquisition = {
    trialKey: state.trialKey,
    identityKey: state.identityKey,
    sequence: state.sequence,
    score: state.score + 1,
    targetIndex: state.targetIndex,
    nextTargetIndex,
    targetPresentedAt: state.targetPresentedAt,
    acquiredAt: now,
    movementTimeMs: Math.max(0, now - state.targetPresentedAt),
    dwellMs: Math.max(0, now - (dwell.enteredAt ?? now)),
  };
  if (mode === 'shared') {
    return { state: { ...state, dwell }, acquisition };
  }
  return {
    state: {
      ...state,
      sequence: nextSequence,
      score: state.score + 1,
      targetIndex: nextTargetIndex,
      targetPresentedAt: now,
      dwell: { enteredAt: null, scored: false },
    },
    acquisition,
  };
}

export function syncTask9AuthoritativeState(
  state: Task9TrialState,
  authoritative: Pick<Task9TrialState, 'sequence' | 'score' | 'targetIndex' | 'targetPresentedAt'>,
): Task9TrialState {
  if (authoritative.sequence <= state.sequence) return state;
  return {
    ...state,
    ...authoritative,
    dwell: { enteredAt: null, scored: false },
  };
}
