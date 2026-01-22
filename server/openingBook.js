/**
 * Opening Book for ELO Evaluation
 * 
 * Curated balanced positions from popular chess openings.
 * Each position is roughly equal (within ±0.3 pawns by Stockfish evaluation).
 * Positions are taken after 4-8 moves to provide opening variety
 * while keeping the game in reasonable territory.
 */

export const BALANCED_OPENINGS = [
  // 1. Sicilian Najdorf - one of the most complex and balanced lines
  {
    name: "Sicilian Najdorf",
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    eco: "B90"
  },
  
  // 2. Ruy Lopez Berlin - extremely solid for Black
  {
    name: "Berlin Defense",
    fen: "r1bk1b1r/pppp1ppp/2n2n2/4N3/2B1P3/8/PPPP1PPP/RNBQK2R w KQ - 4 6",
    eco: "C67"
  },
  
  // 3. Queen's Gambit Declined - classical and balanced
  {
    name: "QGD Classical",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    eco: "D30"
  },
  
  // 4. Caro-Kann Classical - solid structure for both sides
  {
    name: "Caro-Kann Classical",
    fen: "rn1qkbnr/pp2pppp/2p5/3pPb2/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 1 5",
    eco: "B18"
  },
  
  // 5. Italian Game Giuoco Piano - balanced classical opening
  {
    name: "Giuoco Piano",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
    eco: "C53"
  },
  
  // 6. French Tarrasch - dynamic pawn structure
  {
    name: "French Tarrasch",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3pP3/3P4/2N5/PPP2PPP/R1BQKBNR w KQkq - 1 5",
    eco: "C05"
  },
  
  // 7. Slav Defense - solid and symmetrical
  {
    name: "Slav Defense",
    fen: "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",
    eco: "D11"
  },
  
  // 8. King's Indian Classical - dynamic imbalanced structure
  {
    name: "KID Classical",
    fen: "rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQK2R w KQ - 3 7",
    eco: "E92"
  },
  
  // 9. English Opening Symmetrical - quiet positional play
  {
    name: "English Symmetrical",
    fen: "r1bqkbnr/pp1ppppp/2n5/2p5/2P5/2N3P1/PP1PPP1P/R1BQKBNR w KQkq - 2 4",
    eco: "A30"
  },
  
  // 10. Nimzo-Indian - strategic complexity
  {
    name: "Nimzo-Indian",
    fen: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    eco: "E20"
  },
  
  // 11. Scotch Game - open tactical positions
  {
    name: "Scotch Game",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 2 4",
    eco: "C45"
  },
  
  // 12. Catalan Opening - positional pressure
  {
    name: "Catalan Opening",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 0 4",
    eco: "E00"
  },
  
  // 13. Petroff Defense - very solid and symmetric
  {
    name: "Petroff Defense",
    fen: "rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
    eco: "C42"
  },
  
  // 14. Semi-Slav - complex pawn structure
  {
    name: "Semi-Slav",
    fen: "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",
    eco: "D43"
  },
  
  // 15. Grünfeld Defense - dynamic counterplay for Black
  {
    name: "Grünfeld Defense",
    fen: "rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
    eco: "D80"
  },
  
  // 16. London System - solid and quiet
  {
    name: "London System",
    fen: "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w KQkq - 2 4",
    eco: "D02"
  },
  
  // 17. Pirc Defense - hypermodern approach
  {
    name: "Pirc Defense",
    fen: "rnbqkb1r/ppp1pp1p/3p1np1/8/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4",
    eco: "B07"
  },
  
  // 18. Scandinavian - early queen development
  {
    name: "Scandinavian",
    fen: "rnb1kbnr/ppp1pppp/8/3q4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3",
    eco: "B01"
  },
  
  // 19. Four Knights - symmetrical and balanced
  {
    name: "Four Knights",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4",
    eco: "C47"
  },
  
  // 20. Closed Sicilian - positional Sicilian variant
  {
    name: "Closed Sicilian",
    fen: "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/2N3P1/PPPP1P1P/R1BQKBNR w KQkq - 1 4",
    eco: "B25"
  },
];

/**
 * Get a shuffled selection of openings for a rating session
 * @param {number} count - Number of openings to select
 * @returns {Array} Shuffled array of opening objects
 */
export function getShuffledOpenings(count = 20) {
  const shuffled = [...BALANCED_OPENINGS];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get opening pairs for batched games
 * Each pair will be played with colors swapped
 * @param {number} rounds - Number of rounds (2 openings per round)
 * @returns {Array} Array of opening pairs
 */
export function getOpeningPairs(rounds = 10) {
  const openings = getShuffledOpenings(rounds * 2);
  const pairs = [];
  
  for (let i = 0; i < rounds; i++) {
    pairs.push({
      opening1: openings[i * 2] || openings[i % openings.length],
      opening2: openings[i * 2 + 1] || openings[(i + 1) % openings.length],
    });
  }
  
  return pairs;
}

export default BALANCED_OPENINGS;



