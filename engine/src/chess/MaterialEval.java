package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Simple material-only evaluation.
 * Good baseline to compare more sophisticated evaluations against.
 */
public class MaterialEval implements Evaluator {
    
    // Standard piece values
    private static final int PAWN_VALUE = 100;
    private static final int KNIGHT_VALUE = 320;
    private static final int BISHOP_VALUE = 330;
    private static final int ROOK_VALUE = 500;
    private static final int QUEEN_VALUE = 900;
    
    private static final int[] PIECE_VALUES = {
        0, PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE, ROOK_VALUE, QUEEN_VALUE, 0
    };
    
    @Override
    public String getName() {
        return "Material";
    }
    
    @Override
    public String getDescription() {
        return "Simple material-only evaluation - counts piece values only";
    }
    
    @Override
    public int evaluate(Position pos) {
        int us = pos.sideToMove();
        int them = opposite(us);
        int score = 0;
        
        score += popcount(pos.pieces(us, PAWN)) * PAWN_VALUE;
        score += popcount(pos.pieces(us, KNIGHT)) * KNIGHT_VALUE;
        score += popcount(pos.pieces(us, BISHOP)) * BISHOP_VALUE;
        score += popcount(pos.pieces(us, ROOK)) * ROOK_VALUE;
        score += popcount(pos.pieces(us, QUEEN)) * QUEEN_VALUE;
        
        score -= popcount(pos.pieces(them, PAWN)) * PAWN_VALUE;
        score -= popcount(pos.pieces(them, KNIGHT)) * KNIGHT_VALUE;
        score -= popcount(pos.pieces(them, BISHOP)) * BISHOP_VALUE;
        score -= popcount(pos.pieces(them, ROOK)) * ROOK_VALUE;
        score -= popcount(pos.pieces(them, QUEEN)) * QUEEN_VALUE;
        
        return score;
    }
    
    @Override
    public int getPieceValue(int pt) {
        return PIECE_VALUES[pt];
    }
}



