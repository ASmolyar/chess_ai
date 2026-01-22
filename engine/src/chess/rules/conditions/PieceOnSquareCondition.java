package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;

/**
 * Condition that checks if a specific piece type is on one of the given squares.
 * Useful for detecting fianchettoed bishops, centralized knights, etc.
 */
public class PieceOnSquareCondition implements Condition {
    
    public enum Player {
        MY, OPPONENT, EITHER
    }
    
    private final int pieceType;
    private final Player player;
    private final long squareMask;
    
    public PieceOnSquareCondition(int pieceType, Player player, long squareMask) {
        this.pieceType = pieceType;
        this.player = player;
        this.squareMask = squareMask;
    }
    
    /**
     * Constructor accepting string parameters for JSON parsing.
     * @param pieceTypeName Piece type (pawn, knight, bishop, rook, queen, king)
     * @param playerName "my", "opponent", or "either"
     * @param squares Comma-separated list of squares like "e4,d4,e5,d5" or "g2,b2"
     */
    public PieceOnSquareCondition(String pieceTypeName, String playerName, String squares) {
        this.pieceType = pieceTypeFromString(pieceTypeName);
        this.player = parsePlayer(playerName);
        this.squareMask = parseSquares(squares);
    }
    
    private static Player parsePlayer(String name) {
        if (name == null) return Player.MY;
        switch (name.toLowerCase().trim()) {
            case "my": return Player.MY;
            case "opponent": case "enemy": return Player.OPPONENT;
            case "either": case "any": case "both": return Player.EITHER;
            default: return Player.MY;
        }
    }
    
    /**
     * Parse comma-separated square names into a bitboard mask.
     */
    public static long parseSquares(String squares) {
        if (squares == null || squares.isEmpty()) return 0L;
        
        long mask = 0L;
        String[] parts = squares.replace("\"", "").split("[,\\s]+");
        
        for (String sq : parts) {
            sq = sq.trim().toLowerCase();
            if (sq.length() >= 2) {
                int file = sq.charAt(0) - 'a';
                int rank = sq.charAt(1) - '1';
                if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                    mask |= 1L << (rank * 8 + file);
                }
            }
        }
        return mask;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        long pieces;
        
        switch (player) {
            case MY:
                pieces = ctx.position.pieces(ctx.color, pieceType);
                break;
            case OPPONENT:
                pieces = ctx.position.pieces(opposite(ctx.color), pieceType);
                break;
            case EITHER:
                pieces = ctx.position.pieces(pieceType);
                break;
            default:
                pieces = 0L;
        }
        
        return (pieces & squareMask) != 0;
    }
}



