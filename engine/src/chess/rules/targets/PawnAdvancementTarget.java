package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target for pawn advancement evaluation.
 * Measurement = rank advancement (0-6 from starting position).
 */
public class PawnAdvancementTarget implements Target {
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long pawns = ctx.position.pieces(ctx.color, PAWN);
        long[] pawnsArr = {pawns};
        
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            int rank = rankOf(sq);
            
            // Calculate advancement (0-6)
            int advancement = ctx.color == WHITE ? rank - RANK_2 : RANK_7 - rank;
            
            result.add(ctx.withSquare(sq)
                         .withPieceType(PAWN)
                         .withMeasurement(advancement));
        }
        
        return result;
    }
}

