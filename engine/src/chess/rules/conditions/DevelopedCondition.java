package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition that checks development status.
 * Can check if pieces have moved from their starting squares.
 */
public class DevelopedCondition implements Condition {
    
    public enum Requirement {
        FULLY_DEVELOPED,   // All minor pieces developed
        MOSTLY_DEVELOPED,  // At least 3 minor pieces developed
        SOME_DEVELOPED,    // At least 1 minor piece developed
        UNDEVELOPED,       // No minor pieces developed
        KNIGHTS_DEVELOPED, // Both knights off starting squares
        BISHOPS_DEVELOPED  // Both bishops off starting squares
    }
    
    public enum Player {
        MY, OPPONENT
    }
    
    private final Player player;
    private final Requirement requirement;
    
    public DevelopedCondition(Player player, Requirement requirement) {
        this.player = player;
        this.requirement = requirement;
    }
    
    /**
     * Constructor accepting string parameters for JSON parsing.
     */
    public DevelopedCondition(String playerName, String requirementName) {
        this.player = parsePlayer(playerName);
        this.requirement = parseRequirement(requirementName);
    }
    
    private static Player parsePlayer(String name) {
        if (name == null) return Player.MY;
        return "opponent".equalsIgnoreCase(name.trim()) ? Player.OPPONENT : Player.MY;
    }
    
    private static Requirement parseRequirement(String name) {
        if (name == null) return Requirement.SOME_DEVELOPED;
        switch (name.toLowerCase().trim()) {
            case "fully": case "fully_developed": case "all": return Requirement.FULLY_DEVELOPED;
            case "mostly": case "mostly_developed": return Requirement.MOSTLY_DEVELOPED;
            case "some": case "some_developed": case "any": return Requirement.SOME_DEVELOPED;
            case "undeveloped": case "none": return Requirement.UNDEVELOPED;
            case "knights": case "knights_developed": return Requirement.KNIGHTS_DEVELOPED;
            case "bishops": case "bishops_developed": return Requirement.BISHOPS_DEVELOPED;
            default: return Requirement.SOME_DEVELOPED;
        }
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        int color = player == Player.MY ? ctx.color : opposite(ctx.color);
        int developed = countDevelopedMinors(ctx, color);
        int knightsDev = countDevelopedKnights(ctx, color);
        int bishopsDev = countDevelopedBishops(ctx, color);
        
        switch (requirement) {
            case FULLY_DEVELOPED:
                return developed >= 4;
            case MOSTLY_DEVELOPED:
                return developed >= 3;
            case SOME_DEVELOPED:
                return developed >= 1;
            case UNDEVELOPED:
                return developed == 0;
            case KNIGHTS_DEVELOPED:
                return knightsDev >= 2;
            case BISHOPS_DEVELOPED:
                return bishopsDev >= 2;
            default:
                return false;
        }
    }
    
    /**
     * Count minor pieces NOT on their starting squares.
     */
    public static int countDevelopedMinors(EvalContext ctx, int color) {
        long startSquares = getMinorStartSquares(color);
        long knights = ctx.position.pieces(color, KNIGHT);
        long bishops = ctx.position.pieces(color, BISHOP);
        long minors = knights | bishops;
        
        // Count pieces NOT on starting squares
        return popcount(minors & ~startSquares);
    }
    
    public static int countDevelopedKnights(EvalContext ctx, int color) {
        long startSquares = getKnightStartSquares(color);
        long knights = ctx.position.pieces(color, KNIGHT);
        return popcount(knights & ~startSquares);
    }
    
    public static int countDevelopedBishops(EvalContext ctx, int color) {
        long startSquares = getBishopStartSquares(color);
        long bishops = ctx.position.pieces(color, BISHOP);
        return popcount(bishops & ~startSquares);
    }
    
    private static long getMinorStartSquares(int color) {
        if (color == WHITE) {
            // b1, c1, f1, g1
            return (1L << SQ_B1) | (1L << SQ_C1) | (1L << SQ_F1) | (1L << SQ_G1);
        } else {
            // b8, c8, f8, g8
            return (1L << SQ_B8) | (1L << SQ_C8) | (1L << SQ_F8) | (1L << SQ_G8);
        }
    }
    
    private static long getKnightStartSquares(int color) {
        if (color == WHITE) {
            return (1L << SQ_B1) | (1L << SQ_G1);
        } else {
            return (1L << SQ_B8) | (1L << SQ_G8);
        }
    }
    
    private static long getBishopStartSquares(int color) {
        if (color == WHITE) {
            return (1L << SQ_C1) | (1L << SQ_F1);
        } else {
            return (1L << SQ_C8) | (1L << SQ_F8);
        }
    }
}



