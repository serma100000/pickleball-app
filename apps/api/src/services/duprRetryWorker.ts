/**
 * DUPR Retry Worker
 * Periodically retries failed DUPR match submissions that are in 'pending_retry' status.
 * Designed to be called via setInterval from the server entry point.
 */

import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { duprService, isDuprRetryableError } from './duprService.js';

const { duprMatchSubmissions } = schema;

const DUPR_MAX_RETRIES = 3;

/**
 * Process all submissions in 'pending_retry' status with retryCount < max.
 * For each, attempt resubmission via duprService.createMatch().
 * On success: update to 'submitted'.
 * On retryable failure: increment retryCount; if max reached, set to 'failed'.
 * On non-retryable failure: set to 'failed' immediately.
 */
export async function retryFailedSubmissions(): Promise<void> {
  try {
    // Query submissions eligible for retry
    const pendingRetries = await db
      .select()
      .from(duprMatchSubmissions)
      .where(eq(duprMatchSubmissions.status, 'pending_retry'));

    if (pendingRetries.length === 0) return;

    console.log(`[dupr-retry] Processing ${pendingRetries.length} pending retries`);

    for (const submission of pendingRetries) {
      const payload = submission.payload as Record<string, unknown>;
      const retryCount = (payload.retryCount as number) || 0;

      // Safety check: if retryCount already at max, mark as failed
      if (retryCount >= DUPR_MAX_RETRIES) {
        await db
          .update(duprMatchSubmissions)
          .set({
            status: 'failed',
            errorMessage: `Max retries (${DUPR_MAX_RETRIES}) exceeded`,
            updatedAt: new Date(),
          })
          .where(eq(duprMatchSubmissions.id, submission.id));
        console.log(`[dupr-retry] Submission ${submission.id} exceeded max retries, marked failed`);
        continue;
      }

      try {
        // The payload is already in DUPR's API format (teamA/teamB, format, matchDate, etc.)
        const { retryCount: _rc, ...matchPayload } = payload;
        const result = await duprService.createMatch(matchPayload as any);

        // Success - update to submitted
        await db
          .update(duprMatchSubmissions)
          .set({
            status: 'submitted',
            duprMatchId: result.matchId,
            submittedAt: new Date(),
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(duprMatchSubmissions.id, submission.id));

        console.log(`[dupr-retry] Submission ${submission.id} succeeded on retry ${retryCount + 1}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const newRetryCount = retryCount + 1;

        if (isDuprRetryableError(err) && newRetryCount < DUPR_MAX_RETRIES) {
          // Still retryable, increment count and keep in pending_retry
          await db
            .update(duprMatchSubmissions)
            .set({
              status: 'pending_retry',
              errorMessage,
              payload: { ...payload, retryCount: newRetryCount },
              updatedAt: new Date(),
            })
            .where(eq(duprMatchSubmissions.id, submission.id));

          console.log(`[dupr-retry] Submission ${submission.id} failed retry ${newRetryCount}, will retry again`);
        } else {
          // Max retries reached or non-retryable error
          await db
            .update(duprMatchSubmissions)
            .set({
              status: 'failed',
              errorMessage: `${errorMessage} (after ${newRetryCount} retries)`,
              payload: { ...payload, retryCount: newRetryCount },
              updatedAt: new Date(),
            })
            .where(eq(duprMatchSubmissions.id, submission.id));

          console.log(`[dupr-retry] Submission ${submission.id} permanently failed after ${newRetryCount} retries`);
        }
      }
    }
  } catch (err) {
    console.error('[dupr-retry] Worker error:', err);
  }
}
