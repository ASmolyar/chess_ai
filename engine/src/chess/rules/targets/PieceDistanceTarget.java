package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that measures distance between pieces.
 * Returns one context per piece1 with measurement = distance to closest piece2.
 */
public class PieceDistanceTarget implements Target {
    public enum DistanceType {
        MANHATTAN, CHEBYSHEV
    }
    
    private final int piece1Type;
    private final int piece1Color; // 0=my, 1=opponent
    private final int piece2Type;
    private final int piece2Color;
    private final DistanceType distanceType;
    
    public PieceDistanceTarget(int piece1Type, int piece1Color,
                               int piece2Type, int piece2Color,
                               DistanceType distanceType) {
        this.piece1Type = piece1Type;
        this.piece1Color = piece1Color;
        this.piece2Type = piece2Type;
        this.piece2Color = piece2Color;
        this.distanceType = distanceType;
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int color1 = piece1Color == 0 ? ctx.color : opposite(ctx.color);
        int color2 = piece2Color == 0 ? ctx.color : opposite(ctx.color);
        
        long pieces1 = ctx.position.pieces(color1, piece1Type);
        long pieces2 = ctx.position.pieces(color2, piece2Type);
        
        if (pieces2 == 0) {
            return result; // No target pieces
        }
        
        long[] p1Arr = {pieces1};
        while (p1Arr[0] != 0) {
            int sq1 = popLsb(p1Arr);
            
            // Find minimum distance to any piece2
            int minDist = Integer.MAX_VALUE;
            long[] p2Arr = {pieces2};
            while (p2Arr[0] != 0) {
                int sq2 = popLsb(p2Arr);
                int dist = calculateDistance(sq1, sq2);
                minDist = Math.min(minDist, dist);
            }
            
            result.add(ctx.withSquare(sq1)
                         .withPieceType(piece1Type)
                         .withMeasurement(minDist));
        }
        
        return result;
    }
    
    private int calculateDistance(int sq1, int sq2) {
        int file1 = fileOf(sq1);
        int rank1 = rankOf(sq1);
        int file2 = fileOf(sq2);
        int rank2 = rankOf(sq2);
        
        switch (distanceType) {
            case MANHATTAN:
                return Math.abs(file1 - file2) + Math.abs(rank1 - rank2);
            case CHEBYSHEV:
                return Math.max(Math.abs(file1 - file2), Math.abs(rank1 - rank2));
            default:
                return 0;
        }
    }
}

