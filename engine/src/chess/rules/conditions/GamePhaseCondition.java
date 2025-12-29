package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition based on game phase (opening, middlegame, endgame).
 */
public class GamePhaseCondition implements Condition {
    public enum Phase {
        OPENING,        // < 10 moves
        EARLY_MIDDLE,   // 10-20 moves
        MIDDLEGAME,     // 20-40 moves
        ENDGAME,        // queens off or low material
        LATE_ENDGAME    // very low material
    }
    
    private final Phase phase;
    
    public GamePhaseCondition(Phase phase) {
        this.phase = phase;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        Phase currentPhase = detectPhase(ctx);
        return currentPhase == phase;
    }
    
    private Phase detectPhase(EvalContext ctx) {
        int moveCount = ctx.position.fullMoveNumber();
        
        // Count material
        int totalMaterial = 0;
        totalMaterial += popcount(ctx.position.pieces(PAWN)) * 100;
        totalMaterial += popcount(ctx.position.pieces(KNIGHT)) * 300;
        totalMaterial += popcount(ctx.position.pieces(BISHOP)) * 300;
        totalMaterial += popcount(ctx.position.pieces(ROOK)) * 500;
        totalMaterial += popcount(ctx.position.pieces(QUEEN)) * 900;
        
        boolean queensOff = popcount(ctx.position.pieces(QUEEN)) == 0;
        
        // Endgame detection
        if (queensOff || totalMaterial < 3900) {
            if (totalMaterial < 1500) {
                return Phase.LATE_ENDGAME;
            }
            return Phase.ENDGAME;
        }
        
        // Opening/middlegame by move count
        if (moveCount < 10) {
            return Phase.OPENING;
        } else if (moveCount < 20) {
            return Phase.EARLY_MIDDLE;
        } else {
            return Phase.MIDDLEGAME;
        }
    }
}

