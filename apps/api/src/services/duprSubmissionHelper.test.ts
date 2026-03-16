/**
 * DUPR Submission Helper Tests
 *
 * Tests cover: submitMatchToDupr with all players having DUPR accounts (success),
 * with missing DUPR accounts (returns error), and when the DUPR API fails
 * (records 'failed' status).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock: database
// ---------------------------------------------------------------------------
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      duprAccounts: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
  schema: {
    duprAccounts: {
      userId: 'user_id',
    },
    duprMatchSubmissions: {
      id: 'id',
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock: DUPR service
// ---------------------------------------------------------------------------
vi.mock('./duprService.js', () => ({
  duprService: {
    createMatch: vi.fn(),
  },
  isDuprRetryableError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { db } from '../db/index.js';
import { duprService, isDuprRetryableError } from './duprService.js';
import { submitMatchToDupr } from './duprSubmissionHelper.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseParams = {
  gameId: 'game-001',
  matchType: 'SINGLES' as const,
  team1UserIds: ['user-1'],
  team2UserIds: ['user-2'],
  scores: [{ team1Score: 11, team2Score: 7 }],
  playedAt: '2025-01-20T14:00:00Z',
  submittedByUserId: 'user-1',
};

const mockDuprAccounts = [
  { userId: 'user-1', duprId: 'DUPR-001' },
  { userId: 'user-2', duprId: 'DUPR-002' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('submitMatchToDupr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit match successfully when all players have DUPR accounts', async () => {
    // All players have linked DUPR accounts
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue(mockDuprAccounts);

    // Insert returns a submission record
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-001' }]),
      }),
    } as any);

    // DUPR API succeeds
    vi.mocked(duprService.createMatch).mockResolvedValue({
      matchId: 'dupr-match-001',
      status: 'SUCCESS',
    });

    // Update call for status change
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(true);
    expect(result.submissionId).toBe('sub-001');
    expect(result.duprMatchId).toBe('dupr-match-001');
    expect(duprService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchType: 'SINGLES',
        team1Players: [{ duprId: 'DUPR-001' }],
        team2Players: [{ duprId: 'DUPR-002' }],
        scores: [{ team1Score: 11, team2Score: 7 }],
        playedAt: '2025-01-20T14:00:00Z',
      })
    );
    // Verify the submission record was updated to 'submitted'
    expect(db.update).toHaveBeenCalled();
  });

  it('should return error when some players are missing DUPR accounts', async () => {
    // Only one player has a DUPR account; the other is missing
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue([
      { userId: 'user-1', duprId: 'DUPR-001' },
    ]);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Players missing DUPR accounts');
    expect(result.error).toContain('user-2');
    // Should NOT have called createMatch or inserted a submission
    expect(duprService.createMatch).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should return error when no players have DUPR accounts', async () => {
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue([]);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Players missing DUPR accounts');
    expect(result.error).toContain('user-1');
    expect(result.error).toContain('user-2');
    expect(duprService.createMatch).not.toHaveBeenCalled();
  });

  it('should record failed status when DUPR API fails', async () => {
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue(mockDuprAccounts);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-fail' }]),
      }),
    } as any);

    // DUPR API throws an error
    vi.mocked(duprService.createMatch).mockRejectedValue(
      new Error('DUPR API connection refused')
    );

    // Not retryable => should go straight to 'failed'
    vi.mocked(isDuprRetryableError).mockReturnValue(false);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(false);
    expect(result.submissionId).toBe('sub-fail');
    expect(result.error).toContain('DUPR API connection refused');
    // Verify the status was updated to 'failed' in the DB
    expect(db.update).toHaveBeenCalled();
  });

  it('should handle doubles match with 4 players', async () => {
    const doublesParams = {
      ...baseParams,
      matchType: 'DOUBLES' as const,
      team1UserIds: ['user-1', 'user-3'],
      team2UserIds: ['user-2', 'user-4'],
    };

    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue([
      { userId: 'user-1', duprId: 'DUPR-001' },
      { userId: 'user-2', duprId: 'DUPR-002' },
      { userId: 'user-3', duprId: 'DUPR-003' },
      { userId: 'user-4', duprId: 'DUPR-004' },
    ]);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-doubles' }]),
      }),
    } as any);

    vi.mocked(duprService.createMatch).mockResolvedValue({
      matchId: 'dupr-match-doubles',
      status: 'SUCCESS',
    });

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(doublesParams);

    expect(result.success).toBe(true);
    expect(duprService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        matchType: 'DOUBLES',
        team1Players: [{ duprId: 'DUPR-001' }, { duprId: 'DUPR-003' }],
        team2Players: [{ duprId: 'DUPR-002' }, { duprId: 'DUPR-004' }],
      })
    );
  });

  it('should include optional tournamentMatchId and eventName', async () => {
    const tournamentParams = {
      ...baseParams,
      gameId: undefined,
      tournamentMatchId: 'tm-001',
      eventName: 'Spring Tournament 2025',
    };

    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue(mockDuprAccounts);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-tourn' }]),
      }),
    } as any);

    vi.mocked(duprService.createMatch).mockResolvedValue({
      matchId: 'dupr-match-tourn',
      status: 'SUCCESS',
    });

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(tournamentParams);

    expect(result.success).toBe(true);
    expect(duprService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Spring Tournament 2025',
      })
    );
  });

  it('should mark as pending_retry when error is retryable', async () => {
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue(mockDuprAccounts);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-retry' }]),
      }),
    } as any);

    vi.mocked(duprService.createMatch).mockRejectedValue(
      new Error('DUPR service temporarily unavailable')
    );
    vi.mocked(isDuprRetryableError).mockReturnValue(true);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(false);
    expect(result.submissionId).toBe('sub-retry');
    expect(result.error).toContain('temporarily unavailable');
    expect(result.pendingRetry).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it('should handle non-Error thrown by DUPR API', async () => {
    vi.mocked(db.query.duprAccounts.findMany).mockResolvedValue(mockDuprAccounts);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'sub-nonerr' }]),
      }),
    } as any);

    // Throw a string instead of an Error
    vi.mocked(duprService.createMatch).mockRejectedValue('network failure');
    vi.mocked(isDuprRetryableError).mockReturnValue(false);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const result = await submitMatchToDupr(baseParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('network failure');
  });
});
