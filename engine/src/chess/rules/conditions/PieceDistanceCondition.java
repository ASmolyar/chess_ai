package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition based on distance between pieces (Manhattan distance).
 */
public class PieceDistanceCondition implements Condition {
    public enum Comparison {
        LESS_THAN, LESS_EQUAL, GREATER_THAN, GREATER_EQUAL, EXACTLY
    }
    
    private final int piece1Type;
    private final int piece1Color; // relative: 0=my, 1=opponent
    private final int piece2Type;
    private final int piece2Color;
    private final Comparison comparison;
    private final int distance;
    
    public PieceDistanceCondition(int piece1Type, int piece1Color,
                                  int piece2Type, int piece2Color,
                                  Comparison comparison, int distance) {
        this.piece1Type = piece1Type;
        this.piece1Color = piece1Color;
        this.piece2Type = piece2Type;
        this.piece2Color = piece2Color;
        this.comparison = comparison;
        this.distance = distance;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        int color1 = piece1Color == 0 ? ctx.color : opposite(ctx.color);
        int color2 = piece2Color == 0 ? ctx.color : opposite(ctx.color);
        
        // Get piece positions
        long pieces1 = ctx.position.pieces(color1, piece1Type);
        long pieces2 = ctx.position.pieces(color2, piece2Type);
        
        if (pieces1 == 0 || pieces2 == 0) {
            return false;
        }
        
        // Find minimum distance between any pair
        int minDist = Integer.MAX_VALUE;
        long[] p1Arr = {pieces1};
        while (p1Arr[0] != 0) {
            int sq1 = popLsb(p1Arr);
            long[] p2Arr = {pieces2};
            while (p2Arr[0] != 0) {
                int sq2 = popLsb(p2Arr);
                int dist = manhattanDistance(sq1, sq2);
                minDist = Math.min(minDist, dist);
            }
        }
        
        switch (comparison) {
            case LESS_THAN:
                return minDist < distance;
            case LESS_EQUAL:
                return minDist <= distance;
            case GREATER_THAN:
                return minDist > distance;
            case GREATER_EQUAL:
                return minDist >= distance;
            case EXACTLY:
                return minDist == distance;
            default:
                return false;
        }
    }
    
    private int manhattanDistance(int sq1, int sq2) {
        int file1 = fileOf(sq1);
        int rank1 = rankOf(sq1);
        int file2 = fileOf(sq2);
        int rank2 = rankOf(sq2);
        return Math.abs(file1 - file2) + Math.abs(rank1 - rank2);
    }
}

