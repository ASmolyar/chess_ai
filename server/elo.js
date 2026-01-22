/**
 * ELO Rating Calculator
 * Calculates ELO rating based on match results against known-rated opponents
 */

export class EloCalculator {
  constructor() {
    // K-factor for rating calculations
    this.K = 32;
  }

  /**
   * Calculate expected score based on rating difference
   * @param {number} ratingA - Player's rating
   * @param {number} ratingB - Opponent's rating
   * @returns {number} Expected score (0-1)
   */
  expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Calculate performance rating from results against rated opponents
   * Uses the inverse of the expected score formula
   * @param {Array} results - Array of { opponentElo, result } objects
   * @returns {Object} { elo, confidence, wins, losses, draws }
   */
  calculateFromResults(results) {
    if (!results || results.length === 0) {
      return { elo: null, confidence: 'N/A', wins: 0, losses: 0, draws: 0 };
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const r of results) {
      if (r.result === 'win') wins++;
      else if (r.result === 'loss') losses++;
      else draws++;
    }

    const totalGames = results.length;
    const totalScore = wins + (draws * 0.5);
    const scorePercentage = totalScore / totalGames;

    // Calculate average opponent rating
    const avgOpponentElo = results.reduce((sum, r) => sum + r.opponentElo, 0) / totalGames;

    // Use performance rating formula
    // Performance = Avg Opponent Rating + 400 * (W - L) / N
    // Or more precisely, find rating where expected score = actual score
    
    let estimatedElo;
    
    if (scorePercentage >= 0.99) {
      // Near perfect score - estimate based on highest opponent beaten
      const maxDefeated = Math.max(...results.filter(r => r.result === 'win').map(r => r.opponentElo));
      estimatedElo = maxDefeated + 200;
    } else if (scorePercentage <= 0.01) {
      // Near zero score - estimate based on lowest opponent
      const minLostTo = Math.min(...results.filter(r => r.result === 'loss').map(r => r.opponentElo));
      estimatedElo = minLostTo - 200;
    } else {
      // Binary search for rating that gives the correct expected score
      estimatedElo = this.findRatingByScore(results, scorePercentage, avgOpponentElo);
    }

    // Round to nearest 10
    estimatedElo = Math.round(estimatedElo / 10) * 10;

    // Calculate confidence based on number of games and consistency
    const confidence = this.calculateConfidence(results, estimatedElo);

    return {
      elo: estimatedElo,
      confidence,
      wins,
      losses,
      draws
    };
  }

  /**
   * Binary search to find rating that produces expected score matching actual score
   */
  findRatingByScore(results, targetScore, initialGuess) {
    let low = 100;
    let high = 3500;
    let mid = initialGuess;

    for (let i = 0; i < 50; i++) {
      mid = (low + high) / 2;
      
      // Calculate expected score at this rating
      let expectedTotal = 0;
      for (const r of results) {
        expectedTotal += this.expectedScore(mid, r.opponentElo);
      }
      const expectedAvg = expectedTotal / results.length;

      if (Math.abs(expectedAvg - targetScore) < 0.001) {
        break;
      }

      if (expectedAvg < targetScore) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return mid;
  }

  /**
   * Calculate confidence interval string based on results consistency
   */
  calculateConfidence(results, estimatedElo) {
    if (results.length < 5) {
      return '±200 (few games)';
    }

    // Group results by opponent ELO ranges
    const brackets = {};
    for (const r of results) {
      const bracket = Math.floor(r.opponentElo / 200) * 200;
      if (!brackets[bracket]) {
        brackets[bracket] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }
      brackets[bracket].total++;
      if (r.result === 'win') brackets[bracket].wins++;
      else if (r.result === 'loss') brackets[bracket].losses++;
      else brackets[bracket].draws++;
    }

    // Find where the transition from mostly winning to mostly losing occurs
    const sortedBrackets = Object.entries(brackets).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    let transitionStart = null;
    let transitionEnd = null;

    for (const [bracket, stats] of sortedBrackets) {
      const winRate = (stats.wins + stats.draws * 0.5) / stats.total;
      const elo = parseInt(bracket);
      
      if (winRate >= 0.7 && transitionStart === null) {
        transitionStart = elo;
      }
      if (winRate <= 0.3 && transitionStart !== null && transitionEnd === null) {
        transitionEnd = elo;
        break;
      }
    }

    // Estimate confidence based on transition sharpness
    if (transitionStart !== null && transitionEnd !== null) {
      const spread = (transitionEnd - transitionStart) / 2;
      return `±${Math.round(spread)}`;
    }

    // Default confidence based on game count
    if (results.length >= 20) {
      return '±100';
    } else if (results.length >= 10) {
      return '±150';
    } else {
      return '±200';
    }
  }

  /**
   * Calculate new ELO after a single game (for incremental updates)
   */
  updateRating(currentRating, opponentRating, actualScore) {
    const expected = this.expectedScore(currentRating, opponentRating);
    return Math.round(currentRating + this.K * (actualScore - expected));
  }
}



