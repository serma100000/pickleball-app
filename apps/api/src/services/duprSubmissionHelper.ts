import { db, schema } from '../db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { duprService } from './duprService.js';

const { duprAccounts, duprMatchSubmissions } = schema;

interface SubmitToDuprParams {
  gameId?: string;
  tournamentMatchId?: string;
  leagueMatchId?: string;
  matchType: 'SINGLES' | 'DOUBLES';
  team1UserIds: string[];
  team2UserIds: string[];
  scores: { team1Score: number; team2Score: number }[];
  playedAt: string;
  eventName?: string;
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

  // Build payload
  const payload = {
    matchType: params.matchType,
    team1Players: params.team1UserIds.map((uid) => ({ duprId: accountMap.get(uid)! })),
    team2Players: params.team2UserIds.map((uid) => ({ duprId: accountMap.get(uid)! })),
    scores: params.scores,
    playedAt: params.playedAt,
    eventName: params.eventName,
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
    const result = await duprService.createMatch({
      matchType: params.matchType,
      team1Players: payload.team1Players,
      team2Players: payload.team2Players,
      scores: params.scores,
      playedAt: params.playedAt,
      eventName: params.eventName,
    });

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
    // 5b. Update record to 'failed' with errorMessage
    const errorMessage = err instanceof Error ? err.message : String(err);
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
