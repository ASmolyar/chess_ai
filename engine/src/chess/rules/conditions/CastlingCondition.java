package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;

/**
 * Condition based on castling status.
 */
public class CastlingCondition implements Condition {
    public enum Status {
        HAS_CASTLED_KINGSIDE,
        HAS_CASTLED_QUEENSIDE,
        HAS_CASTLED_EITHER,
        HAS_NOT_CASTLED,
        CAN_STILL_CASTLE,
        CANNOT_CASTLE,
        LOST_CASTLING_RIGHTS
    }
    
    public enum Player {
        MY, OPPONENT
    }
    
    private final Player player;
    private final Status status;
    
    public CastlingCondition(Player player, Status status) {
        this.player = player;
        this.status = status;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        int color = player == Player.MY ? ctx.color : opposite(ctx.color);
        int kingSquare = ctx.position.kingSquare(color);
        
        int castledKingsideSquare = color == WHITE ? SQ_G1 : SQ_G8;
        int castledQueensideSquare = color == WHITE ? SQ_C1 : SQ_C8;
        int initialKingSquare = color == WHITE ? SQ_E1 : SQ_E8;
        
        boolean hasCastledKingside = kingSquare == castledKingsideSquare;
        boolean hasCastledQueenside = kingSquare == castledQueensideSquare;
        boolean hasCastled = hasCastledKingside || hasCastledQueenside;
        
        int ksCastle = color == WHITE ? WHITE_OO : BLACK_OO;
        int qsCastle = color == WHITE ? WHITE_OOO : BLACK_OOO;
        
        boolean canCastleKingside = ctx.position.canCastle(ksCastle);
        boolean canCastleQueenside = ctx.position.canCastle(qsCastle);
        boolean canCastle = canCastleKingside || canCastleQueenside;
        
        boolean onInitialSquare = kingSquare == initialKingSquare;
        
        switch (status) {
            case HAS_CASTLED_KINGSIDE:
                return hasCastledKingside;
            case HAS_CASTLED_QUEENSIDE:
                return hasCastledQueenside;
            case HAS_CASTLED_EITHER:
                return hasCastled;
            case HAS_NOT_CASTLED:
                return !hasCastled;
            case CAN_STILL_CASTLE:
                return canCastle;
            case CANNOT_CASTLE:
                return !canCastle;
            case LOST_CASTLING_RIGHTS:
                return !canCastle && onInitialSquare && !hasCastled;
            default:
                return false;
        }
    }
}

