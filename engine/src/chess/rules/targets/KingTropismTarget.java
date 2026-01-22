package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that measures how close pieces are to the enemy king.
 * Useful for attacking positions - pieces closer to enemy king score higher.
 * Returns one context per attacking piece with measurement = distance value.
 */
public class KingTropismTarget implements Target {
    
    private final int pieceType; // Which pieces to consider (-1 = all)
    private final boolean invertScore; // If true, closer = higher score
    
    public KingTropismTarget() {
        this.pieceType = -1;
        this.invertScore = true; // Closer = better by default
    }
    
    public KingTropismTarget(int pieceType) {
        this.pieceType = pieceType;
        this.invertScore = true;
    }
    
    public KingTropismTarget(String pieceTypeName) {
        switch (pieceTypeName.toLowerCase()) {
            case "knight": this.pieceType = KNIGHT; break;
            case "bishop": this.pieceType = BISHOP; break;
            case "rook": this.pieceType = ROOK; break;
            case "queen": this.pieceType = QUEEN; break;
            default: this.pieceType = -1; break;
        }
        this.invertScore = true;
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int opponent = opposite(ctx.color);
        int enemyKingSq = ctx.position.kingSquare(opponent);
        if (enemyKingSq == SQ_NONE) return result;
        
        // Get pieces to evaluate
        long piecesToCheck;
        if (pieceType == -1) {
            piecesToCheck = ctx.position.pieces(ctx.color, KNIGHT) |
                           ctx.position.pieces(ctx.color, BISHOP) |
                           ctx.position.pieces(ctx.color, ROOK) |
                           ctx.position.pieces(ctx.color, QUEEN);
        } else {
            piecesToCheck = ctx.position.pieces(ctx.color, pieceType);
        }
        
        double totalTropism = 0;
        int pieceCount = 0;
        
        long[] pieces = {piecesToCheck};
        while (pieces[0] != 0) {
            int sq = popLsb(pieces);
            int distance = chebyshevDistance(sq, enemyKingSq);
            
            // Invert: max distance is 7, so closer = higher value
            double tropismValue = invertScore ? (7 - distance) : distance;
            totalTropism += tropismValue;
            pieceCount++;
        }
        
        if (pieceCount > 0) {
            // Return average tropism per piece, or total - depends on use case
            result.add(ctx.withMeasurement(totalTropism));
        }
        
        return result;
    }
    
    private int chebyshevDistance(int sq1, int sq2) {
        int file1 = fileOf(sq1);
        int rank1 = rankOf(sq1);
        int file2 = fileOf(sq2);
        int rank2 = rankOf(sq2);
        return Math.max(Math.abs(file1 - file2), Math.abs(rank1 - rank2));
    }
}

