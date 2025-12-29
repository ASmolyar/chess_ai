package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Customizable evaluation function with configurable weights.
 * Frontend can adjust all weights to experiment with different evaluation strategies.
 */
public class CustomEval implements Evaluator {
    
    // Configurable piece values
    private int pawnValue = 100;
    private int knightValue = 320;
    private int bishopValue = 330;
    private int rookValue = 500;
    private int queenValue = 900;
    
    // Configurable feature weights (in centipawns)
    private int mobilityWeight = 10;      // Multiplied by sqrt(moves)
    private int kingSafetyWeight = 1;     // Penalty per attack on king area
    private int pawnAdvanceWeight = 20;   // Bonus per rank advanced
    private int centerControlWeight = 10; // Bonus for controlling center
    private int bishopPairBonus = 50;     // Bonus for having both bishops
    private int rookOnOpenFileBonus = 25; // Bonus for rook on open file
    private int passedPawnBonus = 50;     // Bonus for passed pawns
    private int doubledPawnPenalty = 20;  // Penalty for doubled pawns
    private int isolatedPawnPenalty = 15; // Penalty for isolated pawns
    private int castlingBonus = 60;       // Bonus for castling rights / having castled
    
    @Override
    public String getName() {
        return "Custom";
    }
    
    @Override
    public String getDescription() {
        return "Customizable evaluation with adjustable weights for all features";
    }
    
    // Setters for piece values
    public void setPawnValue(int value) { this.pawnValue = value; }
    public void setKnightValue(int value) { this.knightValue = value; }
    public void setBishopValue(int value) { this.bishopValue = value; }
    public void setRookValue(int value) { this.rookValue = value; }
    public void setQueenValue(int value) { this.queenValue = value; }
    
    // Setters for feature weights
    public void setMobilityWeight(int weight) { this.mobilityWeight = weight; }
    public void setKingSafetyWeight(int weight) { this.kingSafetyWeight = weight; }
    public void setPawnAdvanceWeight(int weight) { this.pawnAdvanceWeight = weight; }
    public void setCenterControlWeight(int weight) { this.centerControlWeight = weight; }
    public void setBishopPairBonus(int bonus) { this.bishopPairBonus = bonus; }
    public void setRookOnOpenFileBonus(int bonus) { this.rookOnOpenFileBonus = bonus; }
    public void setPassedPawnBonus(int bonus) { this.passedPawnBonus = bonus; }
    public void setDoubledPawnPenalty(int penalty) { this.doubledPawnPenalty = penalty; }
    public void setIsolatedPawnPenalty(int penalty) { this.isolatedPawnPenalty = penalty; }
    public void setCastlingBonus(int bonus) { this.castlingBonus = bonus; }
    
    /**
     * Configure all weights from a JSON-like parameter object.
     */
    public void configure(
        int pawnValue, int knightValue, int bishopValue, int rookValue, int queenValue,
        int mobilityWeight, int kingSafetyWeight, int pawnAdvanceWeight,
        int centerControlWeight, int bishopPairBonus, int rookOnOpenFileBonus,
        int passedPawnBonus, int doubledPawnPenalty, int isolatedPawnPenalty, int castlingBonus
    ) {
        this.pawnValue = pawnValue;
        this.knightValue = knightValue;
        this.bishopValue = bishopValue;
        this.rookValue = rookValue;
        this.queenValue = queenValue;
        this.mobilityWeight = mobilityWeight;
        this.kingSafetyWeight = kingSafetyWeight;
        this.pawnAdvanceWeight = pawnAdvanceWeight;
        this.centerControlWeight = centerControlWeight;
        this.bishopPairBonus = bishopPairBonus;
        this.rookOnOpenFileBonus = rookOnOpenFileBonus;
        this.passedPawnBonus = passedPawnBonus;
        this.doubledPawnPenalty = doubledPawnPenalty;
        this.isolatedPawnPenalty = isolatedPawnPenalty;
        this.castlingBonus = castlingBonus;
    }
    
    @Override
    public int evaluate(Position pos) {
        int us = pos.sideToMove();
        int them = opposite(us);
        
        int score = evaluateSide(pos, us) - evaluateSide(pos, them);
        
        return score;
    }
    
    private int evaluateSide(Position pos, int us) {
        int score = 0;
        long occupied = pos.pieces();
        
        // Material
        score += popcount(pos.pieces(us, PAWN)) * pawnValue;
        score += popcount(pos.pieces(us, KNIGHT)) * knightValue;
        score += popcount(pos.pieces(us, BISHOP)) * bishopValue;
        score += popcount(pos.pieces(us, ROOK)) * rookValue;
        score += popcount(pos.pieces(us, QUEEN)) * queenValue;
        
        // Bishop pair bonus
        if (popcount(pos.pieces(us, BISHOP)) >= 2) {
            score += bishopPairBonus;
        }
        
        // Mobility
        score += evaluateMobility(pos, us);
        
        // King safety
        score += evaluateKingSafety(pos, us);
        
        // Pawn structure
        score += evaluatePawns(pos, us);
        
        // Rooks on open files
        score += evaluateRooks(pos, us);
        
        // Center control
        score += evaluateCenterControl(pos, us);
        
        // Castling
        score += evaluateCastling(pos, us);
        
        return score;
    }
    
    private int evaluateMobility(Position pos, int us) {
        int score = 0;
        long occupied = pos.pieces();
        
        // Knight mobility
        long knights = pos.pieces(us, KNIGHT);
        long[] knightsArr = {knights};
        while (knightsArr[0] != 0) {
            int sq = popLsb(knightsArr);
            long attacks = knightAttacks(sq) & ~pos.pieces(us);
            score += (int) (Math.sqrt(popcount(attacks)) * mobilityWeight);
        }
        
        // Bishop mobility
        long bishops = pos.pieces(us, BISHOP);
        long[] bishopsArr = {bishops};
        while (bishopsArr[0] != 0) {
            int sq = popLsb(bishopsArr);
            long attacks = bishopAttacks(sq, occupied) & ~pos.pieces(us);
            score += (int) (Math.sqrt(popcount(attacks)) * mobilityWeight);
        }
        
        // Rook mobility
        long rooks = pos.pieces(us, ROOK);
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            long attacks = rookAttacks(sq, occupied) & ~pos.pieces(us);
            score += (int) (Math.sqrt(popcount(attacks)) * mobilityWeight);
        }
        
        // Queen mobility
        long queens = pos.pieces(us, QUEEN);
        long[] queensArr = {queens};
        while (queensArr[0] != 0) {
            int sq = popLsb(queensArr);
            long attacks = queenAttacks(sq, occupied) & ~pos.pieces(us);
            score += (int) (Math.sqrt(popcount(attacks)) * mobilityWeight);
        }
        
        return score;
    }
    
    private int evaluateKingSafety(Position pos, int us) {
        int ksq = pos.kingSquare(us);
        long occupied = pos.pieces();
        
        // Count opponent attacks on squares around king
        long kingZone = kingAttacks(ksq) | (1L << ksq);
        long enemyAttacks = 0L;
        int them = opposite(us);
        
        // Enemy queen attacks
        long queens = pos.pieces(them, QUEEN);
        long[] queensArr = {queens};
        while (queensArr[0] != 0) {
            int sq = popLsb(queensArr);
            enemyAttacks |= queenAttacks(sq, occupied);
        }
        
        // Enemy rook attacks
        long rooks = pos.pieces(them, ROOK);
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            enemyAttacks |= rookAttacks(sq, occupied);
        }
        
        // Enemy bishop attacks
        long bishops = pos.pieces(them, BISHOP);
        long[] bishopsArr = {bishops};
        while (bishopsArr[0] != 0) {
            int sq = popLsb(bishopsArr);
            enemyAttacks |= bishopAttacks(sq, occupied);
        }
        
        // Enemy knight attacks
        long knights = pos.pieces(them, KNIGHT);
        long[] knightsArr = {knights};
        while (knightsArr[0] != 0) {
            int sq = popLsb(knightsArr);
            enemyAttacks |= knightAttacks(sq);
        }
        
        int attacksOnKing = popcount(enemyAttacks & kingZone);
        return -attacksOnKing * kingSafetyWeight;
    }
    
    private int evaluatePawns(Position pos, int us) {
        int score = 0;
        long ourPawns = pos.pieces(us, PAWN);
        long theirPawns = pos.pieces(opposite(us), PAWN);
        
        long[] pawnsArr = {ourPawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            int file = fileOf(sq);
            int rank = rankOf(sq);
            
            // Pawn advancement
            int advancement = us == WHITE ? rank - RANK_2 : RANK_7 - rank;
            score += advancement * pawnAdvanceWeight;
            
            // Doubled pawns - use FILE_BB array
            long fileMask = FILE_BB[file];
            if (popcount(ourPawns & fileMask) > 1) {
                score -= doubledPawnPenalty;
            }
            
            // Isolated pawns
            long adjacentFiles = 0L;
            if (file > 0) adjacentFiles |= FILE_BB[file - 1];
            if (file < 7) adjacentFiles |= FILE_BB[file + 1];
            if ((ourPawns & adjacentFiles) == 0) {
                score -= isolatedPawnPenalty;
            }
            
            // Passed pawns
            long passedMask;
            if (us == WHITE) {
                passedMask = (fileMask | adjacentFiles) & ~((1L << (sq + 8)) - 1);
            } else {
                passedMask = (fileMask | adjacentFiles) & ((1L << sq) - 1);
            }
            if ((theirPawns & passedMask) == 0) {
                score += passedPawnBonus + advancement * 10; // More bonus for advanced passed pawns
            }
        }
        
        return score;
    }
    
    private int evaluateRooks(Position pos, int us) {
        int score = 0;
        long ourPawns = pos.pieces(us, PAWN);
        long theirPawns = pos.pieces(opposite(us), PAWN);
        long allPawns = ourPawns | theirPawns;
        
        long rooks = pos.pieces(us, ROOK);
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            int file = fileOf(sq);
            long fileMask = FILE_BB[file];
            
            // Open file (no pawns)
            if ((allPawns & fileMask) == 0) {
                score += rookOnOpenFileBonus;
            }
            // Semi-open file (no friendly pawns)
            else if ((ourPawns & fileMask) == 0) {
                score += rookOnOpenFileBonus / 2;
            }
        }
        
        return score;
    }
    
    private int evaluateCenterControl(Position pos, int us) {
        int score = 0;
        long occupied = pos.pieces();
        
        // Center squares: d4, e4, d5, e5
        long center = (1L << SQ_D4) | (1L << SQ_E4) | (1L << SQ_D5) | (1L << SQ_E5);
        // Extended center: c3-f3, c4-f4, c5-f5, c6-f6
        long extendedCenter = center | 
            (1L << SQ_C3) | (1L << SQ_D3) | (1L << SQ_E3) | (1L << SQ_F3) |
            (1L << SQ_C4) | (1L << SQ_F4) |
            (1L << SQ_C5) | (1L << SQ_F5) |
            (1L << SQ_C6) | (1L << SQ_D6) | (1L << SQ_E6) | (1L << SQ_F6);
        
        // Pieces in center
        score += popcount(pos.pieces(us) & center) * centerControlWeight;
        score += popcount(pos.pieces(us) & extendedCenter) * (centerControlWeight / 2);
        
        // Pawns attacking center
        long ourPawns = pos.pieces(us, PAWN);
        long pawnAttacks = 0L;
        long[] pawnsArr = {ourPawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            pawnAttacks |= pawnAttacks(us, sq);
        }
        score += popcount(pawnAttacks & center) * (centerControlWeight / 2);
        
        return score;
    }
    
    private int evaluateCastling(Position pos, int us) {
        int ksq = pos.kingSquare(us);
        
        if (us == WHITE) {
            if (ksq == SQ_G1 || ksq == SQ_C1) {
                return castlingBonus; // Already castled
            } else if (ksq == SQ_E1) {
                if (pos.canCastle(WHITE_OO) || pos.canCastle(WHITE_OOO)) {
                    return castlingBonus / 2; // Can still castle
                }
            }
        } else {
            if (ksq == SQ_G8 || ksq == SQ_C8) {
                return castlingBonus;
            } else if (ksq == SQ_E8) {
                if (pos.canCastle(BLACK_OO) || pos.canCastle(BLACK_OOO)) {
                    return castlingBonus / 2;
                }
            }
        }
        
        return 0;
    }
    
    @Override
    public int getPieceValue(int pt) {
        switch (pt) {
            case PAWN: return pawnValue;
            case KNIGHT: return knightValue;
            case BISHOP: return bishopValue;
            case ROOK: return rookValue;
            case QUEEN: return queenValue;
            default: return 0;
        }
    }
    
    /**
     * Get current configuration as JSON string.
     */
    public String getConfigJson() {
        return String.format(
            "{\"pawnValue\":%d,\"knightValue\":%d,\"bishopValue\":%d,\"rookValue\":%d,\"queenValue\":%d," +
            "\"mobilityWeight\":%d,\"kingSafetyWeight\":%d,\"pawnAdvanceWeight\":%d," +
            "\"centerControlWeight\":%d,\"bishopPairBonus\":%d,\"rookOnOpenFileBonus\":%d," +
            "\"passedPawnBonus\":%d,\"doubledPawnPenalty\":%d,\"isolatedPawnPenalty\":%d,\"castlingBonus\":%d}",
            pawnValue, knightValue, bishopValue, rookValue, queenValue,
            mobilityWeight, kingSafetyWeight, pawnAdvanceWeight,
            centerControlWeight, bishopPairBonus, rookOnOpenFileBonus,
            passedPawnBonus, doubledPawnPenalty, isolatedPawnPenalty, castlingBonus
        );
    }
}

