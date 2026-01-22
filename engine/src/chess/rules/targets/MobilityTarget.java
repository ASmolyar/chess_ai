package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates piece mobility.
 * Can weight captures differently than regular moves.
 */
public class MobilityTarget implements Target {
    private final int pieceType;
    private final double captureWeight;
    
    public MobilityTarget(int pieceType, double captureWeight) {
        this.pieceType = pieceType;
        this.captureWeight = captureWeight;
    }
    
    /**
     * Constructor accepting string piece type name.
     */
    public MobilityTarget(String pieceTypeName, double captureWeight) {
        this.pieceType = pieceTypeFromString(pieceTypeName);
        this.captureWeight = captureWeight;
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long pieces = ctx.position.pieces(ctx.color, pieceType);
        long[] piecesArr = {pieces};
        long occupied = ctx.position.pieces();
        long enemies = ctx.position.pieces(opposite(ctx.color));
        
        while (piecesArr[0] != 0) {
            int sq = popLsb(piecesArr);
            
            long attacks = getAttacks(sq, pieceType, occupied);
            attacks &= ~ctx.position.pieces(ctx.color); // Remove own pieces
            
            int moveCount = popcount(attacks & ~enemies);
            int captureCount = popcount(attacks & enemies);
            
            double mobility = moveCount + captureCount * captureWeight;
            
            result.add(ctx.withSquare(sq)
                         .withPieceType(pieceType)
                         .withMeasurement(mobility));
        }
        
        return result;
    }
    
    private long getAttacks(int sq, int pt, long occupied) {
        switch (pt) {
            case KNIGHT: return knightAttacks(sq);
            case BISHOP: return bishopAttacks(sq, occupied);
            case ROOK:   return rookAttacks(sq, occupied);
            case QUEEN:  return queenAttacks(sq, occupied);
            case KING:   return kingAttacks(sq);
            default:     return 0L;
        }
    }
}

