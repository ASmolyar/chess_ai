package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition that checks if a side has passed pawns.
 * A passed pawn has no enemy pawns blocking its path or on adjacent files ahead.
 */
public class HasPassedCondition implements Condition {
    
    public enum Requirement {
        ANY,        // Has at least one passed pawn
        NONE,       // Has no passed pawns
        MULTIPLE    // Has 2+ passed pawns
    }
    
    public enum Player {
        MY, OPPONENT
    }
    
    private final Player player;
    private final Requirement requirement;
    
    public HasPassedCondition(Player player, Requirement requirement) {
        this.player = player;
        this.requirement = requirement;
    }
    
    /**
     * Constructor accepting string parameters for JSON parsing.
     */
    public HasPassedCondition(String playerName, String requirementName) {
        this.player = parsePlayer(playerName);
        this.requirement = parseRequirement(requirementName);
    }
    
    private static Player parsePlayer(String name) {
        if (name == null) return Player.MY;
        return "opponent".equalsIgnoreCase(name.trim()) ? Player.OPPONENT : Player.MY;
    }
    
    private static Requirement parseRequirement(String name) {
        if (name == null) return Requirement.ANY;
        switch (name.toLowerCase().trim()) {
            case "any": case "has": return Requirement.ANY;
            case "none": case "no": return Requirement.NONE;
            case "multiple": case "many": return Requirement.MULTIPLE;
            default: return Requirement.ANY;
        }
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        int color = player == Player.MY ? ctx.color : opposite(ctx.color);
        int passedCount = countPassedPawns(ctx, color);
        
        switch (requirement) {
            case ANY:
                return passedCount >= 1;
            case NONE:
                return passedCount == 0;
            case MULTIPLE:
                return passedCount >= 2;
            default:
                return false;
        }
    }
    
    /**
     * Count passed pawns for the given color.
     */
    public static int countPassedPawns(EvalContext ctx, int color) {
        int count = 0;
        int them = opposite(color);
        long myPawns = ctx.position.pieces(color, PAWN);
        long theirPawns = ctx.position.pieces(them, PAWN);
        
        long[] pawnsArr = {myPawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            if (isPassedPawn(sq, color, theirPawns)) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * Check if a pawn on sq is passed.
     */
    public static boolean isPassedPawn(int sq, int color, long enemyPawns) {
        int file = fileOf(sq);
        int rank = rankOf(sq);
        
        // Create mask for squares ahead on same file and adjacent files
        long blockMask = 0L;
        
        if (color == WHITE) {
            // White pawn: check ranks ahead (rank+1 to 7)
            for (int r = rank + 1; r <= 7; r++) {
                if (file > 0) blockMask |= 1L << (r * 8 + file - 1);
                blockMask |= 1L << (r * 8 + file);
                if (file < 7) blockMask |= 1L << (r * 8 + file + 1);
            }
        } else {
            // Black pawn: check ranks ahead (rank-1 to 0)
            for (int r = rank - 1; r >= 0; r--) {
                if (file > 0) blockMask |= 1L << (r * 8 + file - 1);
                blockMask |= 1L << (r * 8 + file);
                if (file < 7) blockMask |= 1L << (r * 8 + file + 1);
            }
        }
        
        return (enemyPawns & blockMask) == 0;
    }
}



