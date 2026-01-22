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
    
    /**
     * Constructor accepting string phase name for JSON parsing.
     */
    public GamePhaseCondition(String phaseName) {
        this.phase = parsePhase(phaseName);
    }
    
    private static Phase parsePhase(String name) {
        if (name == null) return Phase.MIDDLEGAME;
        switch (name.toLowerCase().trim()) {
            case "opening": return Phase.OPENING;
            case "early_middle": case "earlymiddle": case "early": return Phase.EARLY_MIDDLE;
            case "middlegame": case "middle": return Phase.MIDDLEGAME;
            case "endgame": case "end": return Phase.ENDGAME;
            case "late_endgame": case "lateendgame": case "late": return Phase.LATE_ENDGAME;
            default: return Phase.MIDDLEGAME;
        }
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        Phase currentPhase = detectPhase(ctx);
        return currentPhase == phase;
    }
    
    private Phase detectPhase(EvalContext ctx) {
        int totalMaterial = countMaterial(ctx);
        
        boolean queensOff = popcount(ctx.position.piecesByType(QUEEN)) == 0;
        
        // Endgame detection based on material
        if (queensOff || totalMaterial < 3900) {
            if (totalMaterial < 1500) {
                return Phase.LATE_ENDGAME;
            }
            return Phase.ENDGAME;
        }
        
        // Estimate game phase from minor pieces developed (less minor pieces on back rank = more developed)
        // Check if most minor pieces are off their starting squares
        int developedPieces = countDevelopedMinorPieces(ctx);
        
        if (developedPieces < 2) {
            return Phase.OPENING;
        } else if (developedPieces < 6) {
            return Phase.EARLY_MIDDLE;
        } else {
            return Phase.MIDDLEGAME;
        }
    }
    
    private int countMaterial(EvalContext ctx) {
        int material = 0;
        material += popcount(ctx.position.piecesByType(PAWN)) * 100;
        material += popcount(ctx.position.piecesByType(KNIGHT)) * 300;
        material += popcount(ctx.position.piecesByType(BISHOP)) * 300;
        material += popcount(ctx.position.piecesByType(ROOK)) * 500;
        material += popcount(ctx.position.piecesByType(QUEEN)) * 900;
        return material;
    }
    
    private int countDevelopedMinorPieces(EvalContext ctx) {
        // Starting squares for minor pieces
        long whiteMinorStarts = (1L << SQ_B1) | (1L << SQ_C1) | (1L << SQ_F1) | (1L << SQ_G1);
        long blackMinorStarts = (1L << SQ_B8) | (1L << SQ_C8) | (1L << SQ_F8) | (1L << SQ_G8);
        
        long whiteMinors = ctx.position.pieces(WHITE, KNIGHT) | ctx.position.pieces(WHITE, BISHOP);
        long blackMinors = ctx.position.pieces(BLACK, KNIGHT) | ctx.position.pieces(BLACK, BISHOP);
        
        // Count pieces NOT on starting squares
        int developed = 0;
        developed += popcount(whiteMinors & ~whiteMinorStarts);
        developed += popcount(blackMinors & ~blackMinorStarts);
        
        return developed;
    }
}

