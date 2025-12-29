package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition based on piece count.
 */
public class MaterialCondition implements Condition {
    public enum Comparison {
        EXACTLY, AT_LEAST, AT_MOST, MORE_THAN, LESS_THAN
    }
    
    public enum Player {
        MY, OPPONENT, BOTH
    }
    
    private final int pieceType;
    private final Player player;
    private final Comparison comparison;
    private final int count;
    
    public MaterialCondition(int pieceType, Player player, Comparison comparison, int count) {
        this.pieceType = pieceType;
        this.player = player;
        this.comparison = comparison;
        this.count = count;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        int actualCount = 0;
        
        switch (player) {
            case MY:
                actualCount = popcount(ctx.position.pieces(ctx.color, pieceType));
                break;
            case OPPONENT:
                actualCount = popcount(ctx.position.pieces(opposite(ctx.color), pieceType));
                break;
            case BOTH:
                actualCount = popcount(ctx.position.pieces(pieceType));
                break;
        }
        
        switch (comparison) {
            case EXACTLY:
                return actualCount == count;
            case AT_LEAST:
                return actualCount >= count;
            case AT_MOST:
                return actualCount <= count;
            case MORE_THAN:
                return actualCount > count;
            case LESS_THAN:
                return actualCount < count;
            default:
                return false;
        }
    }
}

