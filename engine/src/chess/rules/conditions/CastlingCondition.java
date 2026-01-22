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
    
    /**
     * Constructor accepting string parameters for JSON parsing.
     */
    public CastlingCondition(String playerName, String statusName) {
        this.player = parsePlayer(playerName);
        this.status = parseStatus(statusName);
    }
    
    private static Player parsePlayer(String name) {
        if (name == null) return Player.MY;
        switch (name.toLowerCase().trim()) {
            case "my": return Player.MY;
            case "opponent": case "enemy": return Player.OPPONENT;
            default: return Player.MY;
        }
    }
    
    private static Status parseStatus(String name) {
        if (name == null) return Status.HAS_CASTLED_EITHER;
        switch (name.toLowerCase().trim()) {
            case "has_castled_kingside": case "castled_kingside": case "kingside": return Status.HAS_CASTLED_KINGSIDE;
            case "has_castled_queenside": case "castled_queenside": case "queenside": return Status.HAS_CASTLED_QUEENSIDE;
            case "has_castled_either": case "castled": case "has_castled": return Status.HAS_CASTLED_EITHER;
            case "has_not_castled": case "not_castled": return Status.HAS_NOT_CASTLED;
            case "can_still_castle": case "can_castle": return Status.CAN_STILL_CASTLE;
            case "cannot_castle": return Status.CANNOT_CASTLE;
            case "lost_castling_rights": case "lost_rights": return Status.LOST_CASTLING_RIGHTS;
            default: return Status.HAS_CASTLED_EITHER;
        }
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

