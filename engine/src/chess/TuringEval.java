package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Position evaluation based on Turing's chess evaluation function.
 * Implements the historical evaluation that Alan Turing designed.
 */
public class TuringEval implements Evaluator {
    
    // Material values in centipawns (Turing's values)
    private static final int PAWN_VALUE = 100;
    private static final int KNIGHT_VALUE = 300;
    private static final int BISHOP_VALUE = 350;
    private static final int ROOK_VALUE = 500;
    private static final int QUEEN_VALUE = 1000;
    
    private static final int[] PIECE_VALUES = {
        0, PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE, ROOK_VALUE, QUEEN_VALUE, 0
    };
    
    @Override
    public String getName() {
        return "Turing";
    }
    
    @Override
    public String getDescription() {
        return "Alan Turing's historical evaluation: material + mobility + king safety + pawn advancement";
    }
    
    @Override
    public int evaluate(Position pos) {
        int us = pos.sideToMove();
        int them = opposite(us);
        
        int score = evaluateSide(pos, us) - evaluateSide(pos, them);
        
        // Check bonus (Turing: +0.5 for giving check)
        if (pos.checkers() != 0) {
            score -= 50; // We are in check, opponent gave check
        }
        
        return score;
    }
    
    private int evaluateSide(Position pos, int us) {
        int score = 0;
        long occupied = pos.pieces();
        
        // Material
        score += popcount(pos.pieces(us, PAWN)) * PAWN_VALUE;
        score += popcount(pos.pieces(us, KNIGHT)) * KNIGHT_VALUE;
        score += popcount(pos.pieces(us, BISHOP)) * BISHOP_VALUE;
        score += popcount(pos.pieces(us, ROOK)) * ROOK_VALUE;
        score += popcount(pos.pieces(us, QUEEN)) * QUEEN_VALUE;
        
        // Mobility for each piece type
        long knights = pos.pieces(us, KNIGHT);
        long[] knightsArr = {knights};
        while (knightsArr[0] != 0) {
            int sq = popLsb(knightsArr);
            score += mobility(pos, sq, us, KNIGHT);
            score += defenseBonusPiece(pos, sq, us);
        }
        
        long bishops = pos.pieces(us, BISHOP);
        long[] bishopsArr = {bishops};
        while (bishopsArr[0] != 0) {
            int sq = popLsb(bishopsArr);
            score += mobility(pos, sq, us, BISHOP);
            score += defenseBonusPiece(pos, sq, us);
        }
        
        long rooks = pos.pieces(us, ROOK);
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            score += mobility(pos, sq, us, ROOK);
            score += defenseBonusPiece(pos, sq, us);
        }
        
        long queens = pos.pieces(us, QUEEN);
        long[] queensArr = {queens};
        while (queensArr[0] != 0) {
            int sq = popLsb(queensArr);
            score += mobility(pos, sq, us, QUEEN);
        }
        
        // King mobility and safety
        int ksq = pos.kingSquare(us);
        long kingMoves = kingAttacks(ksq) & ~pos.pieces(us);
        score += (int) (Math.sqrt(popcount(kingMoves)) * 10);
        score += kingSafety(pos, ksq, us);
        
        // Pawn advancement
        score += pawnAdvancement(pos, us);
        
        // Castling bonus
        score += castlingBonus(pos, us);
        
        return score;
    }
    
    private int mobility(Position pos, int sq, int us, int pt) {
        long occupied = pos.pieces();
        long enemies = pos.pieces(opposite(us));
        long attacks;
        
        switch (pt) {
            case KNIGHT: attacks = knightAttacks(sq); break;
            case BISHOP: attacks = bishopAttacks(sq, occupied); break;
            case ROOK:   attacks = rookAttacks(sq, occupied); break;
            case QUEEN:  attacks = queenAttacks(sq, occupied); break;
            default:     return 0;
        }
        
        // Remove squares occupied by own pieces
        attacks &= ~pos.pieces(us);
        
        int moveCount = popcount(attacks & ~enemies);
        int captureCount = popcount(attacks & enemies);
        
        // Turing: sqrt of mobility (captures count double)
        return (int) (Math.sqrt(moveCount + captureCount * 2) * 10);
    }
    
    private int defenseBonusPiece(Position pos, int sq, int us) {
        int defenders = countDefenders(pos, sq, us);
        if (defenders >= 2) return 15;
        if (defenders >= 1) return 10;
        return 0;
    }
    
    private int countDefenders(Position pos, int sq, int us) {
        int defenders = 0;
        long occupied = pos.pieces();
        
        // Pawn defenders
        defenders += popcount(pawnAttacks(opposite(us), sq) & pos.pieces(us, PAWN));
        
        // Knight defenders
        defenders += popcount(knightAttacks(sq) & pos.pieces(us, KNIGHT));
        
        // Bishop/Queen diagonal defenders
        long diagAttackers = bishopAttacks(sq, occupied) & pos.pieces(us, BISHOP, QUEEN);
        defenders += popcount(diagAttackers);
        
        // Rook/Queen line defenders
        long lineAttackers = rookAttacks(sq, occupied) & pos.pieces(us, ROOK, QUEEN);
        defenders += popcount(lineAttackers);
        
        // King defender
        defenders += popcount(kingAttacks(sq) & pos.pieces(us, KING));
        
        return defenders;
    }
    
    private int kingSafety(Position pos, int ksq, int us) {
        long occupied = pos.pieces();
        long attacks = queenAttacks(ksq, occupied) & ~pos.pieces(us);
        return -popcount(attacks);
    }
    
    private int pawnAdvancement(Position pos, int us) {
        int bonus = 0;
        long pawns = pos.pieces(us, PAWN);
        
        long[] pawnsArr = {pawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            int advancement = us == WHITE ? rankOf(sq) - RANK_2 : RANK_7 - rankOf(sq);
            
            // Turing: 0.2 per rank advanced
            bonus += advancement * 20;
            
            // Turing: 0.3 if defended by non-pawn
            int defenders = countDefenders(pos, sq, us);
            int pawnDefenders = popcount(pawnAttacks(opposite(us), sq) & pos.pieces(us, PAWN));
            if (defenders > pawnDefenders) {
                bonus += 30;
            }
        }
        
        return bonus;
    }
    
    private int castlingBonus(Position pos, int us) {
        int bonus = 0;
        int ksq = pos.kingSquare(us);
        
        if (us == WHITE) {
            if (ksq == SQ_G1 || ksq == SQ_C1) {
                bonus += 100; // Already castled
            } else if (ksq == SQ_E1) {
                if (pos.canCastle(WHITE_OO) || pos.canCastle(WHITE_OOO)) {
                    bonus += 100; // Can castle
                }
            }
        } else {
            if (ksq == SQ_G8 || ksq == SQ_C8) {
                bonus += 100;
            } else if (ksq == SQ_E8) {
                if (pos.canCastle(BLACK_OO) || pos.canCastle(BLACK_OOO)) {
                    bonus += 100;
                }
            }
        }
        
        return bonus;
    }
    
    @Override
    public int getPieceValue(int pt) {
        return PIECE_VALUES[pt];
    }
}



