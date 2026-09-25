# Task9 Asymmetric Shared Visibility Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** During Task9 Shared trials, show both participants the shared cursor and active target through the first acquisition, then alternate per-trial cursor-only and target-only roles while keeping the grid, HUD, green hit feedback, and 50 ms dwell behavior common to both.

**Architecture:** The server chooses explicit participant identities for the two roles from the active pair, using the experiment seed for the first Shared trial and alternating roles on subsequent Shared trials. The assignment and activation sequence travel in the Task9 target trajectory payload and recording metadata. The web sketch receives viewer identity/observer context, derives a pure render policy, and hides only the shared cursor or red active target after sequence 0; green hit feedback remains visible to everyone.

**Tech Stack:** TypeScript, React, p5.js, LiveKit data messages, Node.js test runner via `tsx`.

---

### Task 1: Add deterministic server-side role assignment

**Files:**
- Create: `packages/server/src/experiments/task9/asymmetric-roles.ts`
- Create: `packages/server/src/experiments/task9/asymmetric-roles.test.ts`

**Step 1: Write the failing test**

Test that the helper sorts exactly two participant identities, uses the seed to select the first cursor viewer, alternates the two roles by Shared-trial index, returns the same result for reversed input order, and returns `null` unless two identities are available.

**Step 2: Run test to verify it fails**

Run: `npx tsx packages/server/src/experiments/task9/asymmetric-roles.test.ts`
Expected: FAIL because `assignTask9AsymmetricRoles` does not exist.

**Step 3: Write minimal implementation**

Export `Task9AsymmetricRoles` and `assignTask9AsymmetricRoles(identities, seed, sharedTrialIndex)`. Sort/deduplicate identities, require exactly two, derive a stable initial bit from the integer seed, XOR it with the non-negative trial-index parity, and return `{ cursorIdentity, targetIdentity, activatesAfterSequence: 0 }`. Sequence 0 is the fully visible first target; asymmetry begins when authoritative sequence becomes 1.

**Step 4: Run test to verify it passes**

Run: `npx tsx packages/server/src/experiments/task9/asymmetric-roles.test.ts`
Expected: PASS.

### Task 2: Publish and record the explicit role assignment

**Files:**
- Modify: `packages/server/src/experiments/types.ts`
- Modify: `packages/server/src/agent.ts`
- Modify: `packages/server/src/experiments/task9/experiment.ts`
- Test: `packages/server/src/experiments/task9/asymmetric-roles.test.ts`

**Step 1: Write the failing integration-oriented assertions**

Extend the role test to verify the serialized assignment shape used by Task9 and that Shared-trial indices produce alternating assignments without changing baseline/washout behavior.

**Step 2: Run test to verify it fails**

Run: `npx tsx packages/server/src/experiments/task9/asymmetric-roles.test.ts`
Expected: FAIL on the missing integration helper/shape.

**Step 3: Wire the trial context and payload**

Add `getExperimentParticipantIdentities(): Promise<string[]>` to `TrialContext` and bind it to the existing agent method. In Task9 `runTrialBody`, fetch the active identities only for `phase === 'shared'`, compute `sharedTrialIndex = trialNumber - cursorControlBaselineTrials - 1`, assign roles, and add `asymmetricRoles` to both `gameParams` and recording metadata. If the pair cannot be resolved, omit the assignment and retain symmetric rendering. Do not change the 50 ms dwell or target-authority flow.

**Step 4: Run server tests and typecheck**

Run: `npx tsx packages/server/src/experiments/task9/asymmetric-roles.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

### Task 3: Add a pure participant visibility policy

**Files:**
- Modify: `packages/web/src/experiments/task9/point-to-point.ts`
- Modify: `packages/web/src/experiments/task9/point-to-point.test.ts`

**Step 1: Write failing policy tests**

Add tests for `getTask9AsymmetricVisibility` covering: sequence 0 shows cursor and red/green target to both; after sequence 0 the cursor role sees the shared cursor but no red target; the target role sees the red target but no cursor; cursor-inside-target shows green to both; admin/viewer observers see both; non-Shared phases and absent/invalid assignments remain symmetric.

**Step 2: Run test to verify it fails**

Run: `npx tsx packages/web/src/experiments/task9/point-to-point.test.ts`
Expected: FAIL because the policy helper does not exist.

**Step 3: Implement the policy**

Define the trajectory assignment type and return `{ showSharedCursor, activeTargetFill }`, where `activeTargetFill` is red, green, or `null`. Apply asymmetry only when phase is Shared, authoritative sequence is greater than `activatesAfterSequence`, the viewer is a participant named by the assignment, and the viewer is not an observer. Give green hit feedback precedence over target-role hiding.

**Step 4: Run test to verify it passes**

Run: `npx tsx packages/web/src/experiments/task9/point-to-point.test.ts`
Expected: PASS.

### Task 4: Apply the policy in the p5 rendering pipeline

**Files:**
- Modify: `packages/web/src/experiments/types.ts`
- Modify: `packages/web/src/experiments/TaskStage.tsx`
- Modify: `packages/web/src/experiments/task9/sketch.ts`
- Modify: `packages/web/src/App.tsx`
- Test: `packages/web/src/experiments/task9/point-to-point.test.ts`

**Step 1: Add viewer context**

Add optional `viewerIdentity` and `isObserver` fields to `TaskStageProps` and `SketchScene`. Pass the local participant identity from the main stage and mark admin, ViewerMode, and replay stages as observers.

**Step 2: Apply cursor/target visibility before dots are drawn**

In the Task9 sketch, parse `asymmetricRoles`, call the pure visibility helper using the authoritative sequence and current `inside` state, draw all 19 gray outlines plus an active red/green fill only when allowed, and clear `scene.averages` only for the cursor-hidden participant. Preserve score/time drawing and the existing acquisition update path.

**Step 3: Run focused tests**

Run: `npx tsx packages/web/src/experiments/task9/point-to-point.test.ts`
Expected: PASS, including unchanged 50 ms dwell tests.

### Task 5: Verify the complete change

**Files:**
- Verify all files above.

**Step 1: Run focused server and web tests**

Run: `npx tsx packages/server/src/experiments/task9/asymmetric-roles.test.ts`
Expected: PASS.

Run: `npx tsx packages/web/src/experiments/task9/point-to-point.test.ts`
Expected: PASS.

**Step 2: Run repository checks**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS, with only the pre-existing bundle-size warning if present.

**Step 3: Review the diff**

Run: `git diff --check` and `git diff --stat`
Expected: no whitespace errors; only Task9 role-assignment, viewer-context, tests, and this plan are changed.
