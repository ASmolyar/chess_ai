package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates defended pieces.
 * Counts number of defenders for each piece of a given type.
 */
public class DefenseTarget implements Target {
    private final int pieceType;
    private final int minDefenders;
    
    public DefenseTarget(int pieceType, int minDefenders) {
        this.pieceType = pieceType;
        this.minDefenders = minDefenders;
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long pieces = ctx.position.pieces(ctx.color, pieceType);
        long[] piecesArr = {pieces};
        
        while (piecesArr[0] != 0) {
            int sq = popLsb(piecesArr);
            int defenders = countDefenders(ctx, sq);
            
            if (defenders >= minDefenders) {
                result.add(ctx.withSquare(sq)
                             .withPieceType(pieceType)
                             .withMeasurement(defenders));
            }
        }
        
        return result;
    }
    
    private int countDefenders(EvalContext ctx, int sq) {
        int defenders = 0;
        long occupied = ctx.position.pieces();
        int us = ctx.color;
        
        // Pawn defenders
        defenders += popcount(pawnAttacks(opposite(us), sq) & ctx.position.pieces(us, PAWN));
        
        // Knight defenders
        defenders += popcount(knightAttacks(sq) & ctx.position.pieces(us, KNIGHT));
        
        // Bishop/Queen diagonal defenders
        long diagAttackers = bishopAttacks(sq, occupied) & 
                           (ctx.position.pieces(us, BISHOP) | ctx.position.pieces(us, QUEEN));
        defenders += popcount(diagAttackers);
        
        // Rook/Queen line defenders
        long lineAttackers = rookAttacks(sq, occupied) & 
                           (ctx.position.pieces(us, ROOK) | ctx.position.pieces(us, QUEEN));
        defenders += popcount(lineAttackers);
        
        // King defender
        defenders += popcount(kingAttacks(sq) & ctx.position.pieces(us, KING));
        
        return defenders;
    }
}

