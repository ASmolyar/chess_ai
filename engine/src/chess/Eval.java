package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Static utility class for position evaluation.
 * Delegates to TuringEval for backwards compatibility.
 * 
 * @deprecated Use Evaluator interface and specific implementations instead.
 */
public class Eval {
    
    // Singleton TuringEval instance for static methods
    private static final TuringEval turingEval = new TuringEval();
    
    // Material values for backwards compatibility
    private static final int PAWN_VALUE = 100;
    private static final int KNIGHT_VALUE = 300;
    private static final int BISHOP_VALUE = 350;
    private static final int ROOK_VALUE = 500;
    private static final int QUEEN_VALUE = 1000;
    
    private static final int[] PIECE_VALUES = {
        0, PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE, ROOK_VALUE, QUEEN_VALUE, 0
    };
    
    /**
     * Evaluate position from the perspective of the side to move.
     * @deprecated Use Evaluator.evaluate() instead
     */
    public static int evaluate(Position pos) {
        return turingEval.evaluate(pos);
    }
    
    /**
     * Simple material-only evaluation.
     */
    public static int materialEvaluate(Position pos) {
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
    
    /**
     * @deprecated Use Evaluator.getPieceValue() instead
     */
    public static int getPieceValue(int pt) {
        return PIECE_VALUES[pt];
    }
}
