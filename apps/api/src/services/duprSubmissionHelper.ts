import { randomUUID } from 'crypto';
import { db, schema } from '../db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { duprService, isDuprRetryableError } from './duprService.js';

const DUPR_MAX_RETRIES = 3;

const { duprAccounts, duprMatchSubmissions } = schema;

interface SubmitToDuprParams {
  gameId?: string;
  tournamentMatchId?: string;
  leagueMatchId?: string;
  format: 'SINGLES' | 'DOUBLES';
  team1UserIds: string[];
  team2UserIds: string[];
  scores: { team1Score: number; team2Score: number }[];
  matchDate: string;
  event?: string;
  submittedByUserId: string;
}

export async function submitMatchToDupr(params: SubmitToDuprParams) {
  const allUserIds = [...params.team1UserIds, ...params.team2UserIds];

  // 1. Look up all players' DUPR IDs from duprAccounts
  const accounts = await db.query.duprAccounts.findMany({
    where: inArray(duprAccounts.userId, allUserIds),
  });

  const accountMap = new Map(accounts.map((a) => [a.userId, a.duprId]));

  // 2. Validate all have linked accounts
  const missingUsers = allUserIds.filter((uid) => !accountMap.has(uid));
  if (missingUsers.length > 0) {
    return {
      success: false,
      error: `Players missing DUPR accounts: ${missingUsers.join(', ')}`,
    };
  }

  // Build teamA/teamB with player DUPR IDs and game scores
  const team1DuprIds = params.team1UserIds.map((uid) => accountMap.get(uid)!);
  const team2DuprIds = params.team2UserIds.map((uid) => accountMap.get(uid)!);

  const teamA: Record<string, string | number> = {
    player1: team1DuprIds[0],
  };
  if (team1DuprIds[1]) {
    teamA.player2 = team1DuprIds[1];
  }

  const teamB: Record<string, string | number> = {
    player1: team2DuprIds[0],
  };
  if (team2DuprIds[1]) {
    teamB.player2 = team2DuprIds[1];
  }

  // Map scores array to game1-game5 on each team
  params.scores.forEach((score, idx) => {
    const gameKey = `game${idx + 1}` as string;
    teamA[gameKey] = score.team1Score;
    teamB[gameKey] = score.team2Score;
  });

  const identifier = `paddleup-${randomUUID()}`;

  // Build DUPR API payload
  const payload = {
    format: params.format,
    matchDate: params.matchDate,
    event: params.event ?? 'PaddleUp Match',
    identifier,
    teamA,
    teamB,
    matchSource: 'PARTNER' as const,
  };

  // 3. Insert pending record into duprMatchSubmissions
  const [submission] = await db
    .insert(duprMatchSubmissions)
    .values({
      gameId: params.gameId || null,
      tournamentMatchId: params.tournamentMatchId || null,
      leagueMatchId: params.leagueMatchId || null,
      submittedBy: params.submittedByUserId,
      status: 'pending',
      payload,
    })
    .returning();

  try {
    // 4. Call duprService.createMatch() (real DUPR API)
    const result = await duprService.createMatch(payload);

    // 5. Update record to 'submitted' with duprMatchId
    await db
      .update(duprMatchSubmissions)
      .set({
        status: 'submitted',
        duprMatchId: result.matchId,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(duprMatchSubmissions.id, submission.id));

    return {
      success: true,
      submissionId: submission.id,
      duprMatchId: result.matchId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const retryable = isDuprRetryableError(err);
    const currentRetryCount = (payload as Record<string, unknown>).retryCount as number || 0;

    if (retryable && currentRetryCount < DUPR_MAX_RETRIES) {
      // 5b. Mark as pending_retry so the retry worker picks it up
      await db
        .update(duprMatchSubmissions)
        .set({
          status: 'pending_retry',
          errorMessage,
          payload: { ...payload, retryCount: currentRetryCount + 1 },
          updatedAt: new Date(),
        })
        .where(eq(duprMatchSubmissions.id, submission.id));

      return {
        success: false,
        submissionId: submission.id,
        error: errorMessage,
        pendingRetry: true,
      };
    }

    // 5c. Non-retryable or max retries exceeded: mark as failed
    await db
      .update(duprMatchSubmissions)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(duprMatchSubmissions.id, submission.id));

    return {
      success: false,
      submissionId: submission.id,
      error: errorMessage,
    };
  }
}
