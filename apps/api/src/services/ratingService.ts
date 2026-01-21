/**
 * ELO-based rating system for pickleball
 * Uses a modified ELO algorithm optimized for 1v1 and 2v2 games
 */

const DEFAULT_RATING = 1500;
const K_FACTOR = 32; // Rating volatility factor
const MIN_RATING = 100;
const MAX_RATING = 3000;

export const ratingService = {
  /**
   * Calculate expected score (probability of winning)
   */
  calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  },

  /**
   * Calculate new rating after a game
   */
  calculateNewRating(
    currentRating: number,
    opponentRating: number,
    won: boolean,
    kFactor: number = K_FACTOR
  ): number {
    const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
    const actualScore = won ? 1 : 0;

    let newRating = currentRating + kFactor * (actualScore - expectedScore);

    // Clamp rating to valid range
    newRating = Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));

    return Math.round(newRating * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Calculate team average rating
   */
  calculateTeamRating(ratings: number[]): number {
    if (ratings.length === 0) return DEFAULT_RATING;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  },

  /**
   * Calculate rating changes for all players in a game
   */
  calculateGameRatingChanges(
    team1Ratings: number[],
    team2Ratings: number[],
    team1Won: boolean,
    kFactor: number = K_FACTOR
  ): { team1Changes: number[]; team2Changes: number[] } {
    const team1Avg = this.calculateTeamRating(team1Ratings);
    const team2Avg = this.calculateTeamRating(team2Ratings);

    const team1Changes = team1Ratings.map((rating) =>
      this.calculateNewRating(rating, team2Avg, team1Won, kFactor) - rating
    );

    const team2Changes = team2Ratings.map((rating) =>
      this.calculateNewRating(rating, team1Avg, !team1Won, kFactor) - rating
    );

    return { team1Changes, team2Changes };
  },

  /**
   * Get K-factor based on player's games played (provisional period)
   */
  getKFactor(gamesPlayed: number): number {
    if (gamesPlayed < 10) {
      return 40; // Higher volatility for new players
    } else if (gamesPlayed < 30) {
      return 32;
    } else {
      return 24; // More stable for experienced players
    }
  },

  /**
   * Determine skill level from rating
   */
  getSkillLevelFromRating(rating: number): string {
    if (rating < 1200) return 'beginner';
    if (rating < 1400) return 'intermediate';
    if (rating < 1600) return 'advanced';
    if (rating < 1800) return 'expert';
    return 'pro';
  },

  /**
   * Get rating range for skill level
   */
  getRatingRangeForSkillLevel(skillLevel: string): { min: number; max: number } {
    switch (skillLevel) {
      case 'beginner':
        return { min: MIN_RATING, max: 1199 };
      case 'intermediate':
        return { min: 1200, max: 1399 };
      case 'advanced':
        return { min: 1400, max: 1599 };
      case 'expert':
        return { min: 1600, max: 1799 };
      case 'pro':
        return { min: 1800, max: MAX_RATING };
      default:
        return { min: MIN_RATING, max: MAX_RATING };
    }
  },

  /**
   * Calculate rating confidence based on games played
   */
  calculateRatingConfidence(gamesPlayed: number): number {
    // Confidence increases with more games, maxing at ~95% after 50 games
    return Math.min(0.95, 1 - Math.exp(-gamesPlayed / 15));
  },

  /**
   * Calculate rating deviation (uncertainty)
   */
  calculateRatingDeviation(
    gamesPlayed: number,
    daysSinceLastGame: number
  ): number {
    const baseDeviation = 350; // Starting deviation
    const minDeviation = 50; // Minimum deviation

    // Deviation decreases with games played
    let deviation = baseDeviation * Math.exp(-gamesPlayed / 20);

    // Deviation increases with inactivity
    if (daysSinceLastGame > 0) {
      deviation += daysSinceLastGame * 2;
    }

    return Math.max(minDeviation, deviation);
  },

  /**
   * Calculate match quality (how balanced the game should be)
   */
  calculateMatchQuality(team1Ratings: number[], team2Ratings: number[]): number {
    const team1Avg = this.calculateTeamRating(team1Ratings);
    const team2Avg = this.calculateTeamRating(team2Ratings);

    const expectedScore = this.calculateExpectedScore(team1Avg, team2Avg);

    // Match quality is highest when expected score is 0.5 (50/50)
    // Returns value between 0 and 1
    return 1 - Math.abs(0.5 - expectedScore) * 2;
  },

  /**
   * Suggest handicap for unbalanced games
   */
  suggestHandicap(
    team1Ratings: number[],
    team2Ratings: number[]
  ): { strongerTeam: 1 | 2; handicapPoints: number } | null {
    const team1Avg = this.calculateTeamRating(team1Ratings);
    const team2Avg = this.calculateTeamRating(team2Ratings);
    const ratingDiff = Math.abs(team1Avg - team2Avg);

    if (ratingDiff < 100) {
      return null; // No handicap needed
    }

    const strongerTeam = team1Avg > team2Avg ? 1 : 2;
    // Suggest 1 point handicap per 100 rating difference
    const handicapPoints = Math.floor(ratingDiff / 100);

    return { strongerTeam, handicapPoints };
  },
};
