package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that identifies outpost pieces (knights or bishops on squares
 * that cannot be attacked by enemy pawns).
 * Returns one context per outpost piece with measurement = 1.
 */
public class OutpostTarget implements Target {
    
    private final int pieceType; // KNIGHT, BISHOP, or -1 for either
    
    public OutpostTarget() {
        this.pieceType = -1; // Any minor piece
    }
    
    public OutpostTarget(int pieceType) {
        this.pieceType = pieceType;
    }
    
    public OutpostTarget(String pieceTypeName) {
        switch (pieceTypeName.toLowerCase()) {
            case "knight": this.pieceType = KNIGHT; break;
            case "bishop": this.pieceType = BISHOP; break;
            default: this.pieceType = -1; break;
        }
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int opponent = opposite(ctx.color);
        long opponentPawns = ctx.position.pieces(opponent, PAWN);
        
        // Get pieces to check
        long piecesToCheck = 0L;
        if (pieceType == -1) {
            piecesToCheck = ctx.position.pieces(ctx.color, KNIGHT) | 
                           ctx.position.pieces(ctx.color, BISHOP);
        } else {
            piecesToCheck = ctx.position.pieces(ctx.color, pieceType);
        }
        
        long[] pieces = {piecesToCheck};
        while (pieces[0] != 0) {
            int sq = popLsb(pieces);
            
            if (isOutpost(sq, ctx.color, opponentPawns)) {
                int pt = pieceType != -1 ? pieceType : 
                         ((ctx.position.pieces(ctx.color, KNIGHT) & (1L << sq)) != 0 ? KNIGHT : BISHOP);
                result.add(ctx.withSquare(sq).withPieceType(pt).withMeasurement(1.0));
            }
        }
        
        return result;
    }
    
    /**
     * Check if a square is an outpost for the given color.
     * An outpost is a square that cannot be attacked by enemy pawns.
     */
    private boolean isOutpost(int sq, int color, long opponentPawns) {
        int file = fileOf(sq);
        int rank = rankOf(sq);
        
        // Must be in enemy territory (rank 4-6 for white, rank 3-5 for black)
        if (color == WHITE) {
            if (rank < RANK_4 || rank > RANK_6) return false;
        } else {
            if (rank < RANK_3 || rank > RANK_5) return false;
        }
        
        // Check if any enemy pawn can attack this square
        // This means checking adjacent files ahead of the square
        long attackingPawnsMask = 0L;
        
        // For white outposts, check if black pawns on adjacent files
        // can ever move to attack this square (they are on higher ranks)
        // For black outposts, check if white pawns can attack (lower ranks)
        
        for (int f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
            if (f == file) continue; // Adjacent files only
            
            for (int r = 0; r < RANK_NB; r++) {
                // For white: enemy pawns that could attack are on ranks >= sq rank
                // For black: enemy pawns that could attack are on ranks <= sq rank
                if (color == WHITE && r > rank) {
                    attackingPawnsMask |= (1L << makeSquare(f, r));
                } else if (color == BLACK && r < rank) {
                    attackingPawnsMask |= (1L << makeSquare(f, r));
                }
            }
        }
        
        // If no enemy pawns can attack this square, it's an outpost
        return (opponentPawns & attackingPawnsMask) == 0;
    }
}

