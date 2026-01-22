package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that detects if a player has the bishop pair.
 * Returns one context with measurement = 1 if player has both bishops, 0 otherwise.
 */
public class BishopPairTarget implements Target {

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long myBishops = ctx.position.pieces(ctx.color, BISHOP);
        int bishopCount = popcount(myBishops);
        
        if (bishopCount >= 2) {
            // Check that we have bishops on both colors
            long lightSquares = 0x55AA55AA55AA55AAL; // Light squares
            long darkSquares = 0xAA55AA55AA55AA55L;  // Dark squares
            
            boolean hasLightBishop = (myBishops & lightSquares) != 0;
            boolean hasDarkBishop = (myBishops & darkSquares) != 0;
            
            if (hasLightBishop && hasDarkBishop) {
                result.add(ctx.withMeasurement(1.0));
            }
        }
        
        return result;
    }
}

