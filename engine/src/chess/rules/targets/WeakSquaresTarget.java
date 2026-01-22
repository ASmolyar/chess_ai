package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that counts weak squares in the enemy camp.
 * A weak square is one that cannot be defended by pawns.
 * Returns one context with measurement = count of weak squares found.
 */
public class WeakSquaresTarget implements Target {
    
    public enum SquareRegion {
        KING_ZONE,    // Squares around opponent's king
        CENTER,       // Central squares
        CAMP          // Opponent's half of the board
    }
    
    private final SquareRegion region;
    
    public WeakSquaresTarget() {
        this.region = SquareRegion.CAMP;
    }
    
    public WeakSquaresTarget(SquareRegion region) {
        this.region = region;
    }
    
    public WeakSquaresTarget(String regionName) {
        switch (regionName.toLowerCase()) {
            case "king_zone": this.region = SquareRegion.KING_ZONE; break;
            case "center": this.region = SquareRegion.CENTER; break;
            default: this.region = SquareRegion.CAMP; break;
        }
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int opponent = opposite(ctx.color);
        long opponentPawns = ctx.position.pieces(opponent, PAWN);
        
        // Get the region to check
        long squaresToCheck = getRegionMask(ctx);
        
        int weakCount = 0;
        long[] squares = {squaresToCheck};
        while (squares[0] != 0) {
            int sq = popLsb(squares);
            
            if (isWeakSquare(sq, opponent, opponentPawns)) {
                weakCount++;
            }
        }
        
        if (weakCount > 0) {
            result.add(ctx.withMeasurement(weakCount));
        }
        
        return result;
    }
    
    private long getRegionMask(EvalContext ctx) {
        int opponent = opposite(ctx.color);
        
        switch (region) {
            case KING_ZONE:
                int oppKingSq = ctx.position.kingSquare(opponent);
                if (oppKingSq == SQ_NONE) return 0L;
                return kingAttacks(oppKingSq) | (1L << oppKingSq);
                
            case CENTER:
                return (1L << SQ_C3) | (1L << SQ_D3) | (1L << SQ_E3) | (1L << SQ_F3) |
                       (1L << SQ_C4) | (1L << SQ_D4) | (1L << SQ_E4) | (1L << SQ_F4) |
                       (1L << SQ_C5) | (1L << SQ_D5) | (1L << SQ_E5) | (1L << SQ_F5) |
                       (1L << SQ_C6) | (1L << SQ_D6) | (1L << SQ_E6) | (1L << SQ_F6);
                
            case CAMP:
            default:
                // Opponent's half of the board
                if (ctx.color == WHITE) {
                    // Check ranks 5-8 (opponent's territory for white)
                    return RANK_BB[RANK_5] | RANK_BB[RANK_6] | RANK_BB[RANK_7] | RANK_BB[RANK_8];
                } else {
                    // Check ranks 1-4 (opponent's territory for black)
                    return RANK_BB[RANK_1] | RANK_BB[RANK_2] | RANK_BB[RANK_3] | RANK_BB[RANK_4];
                }
        }
    }
    
    /**
     * Check if a square is weak (cannot be defended by the opponent's pawns).
     */
    private boolean isWeakSquare(int sq, int defender, long defenderPawns) {
        int file = fileOf(sq);
        int rank = rankOf(sq);
        
        // Check if any pawn on adjacent files can defend this square
        // For white pawns, they attack diagonally forward (higher rank)
        // For black pawns, they attack diagonally backward (lower rank)
        
        for (int f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
            if (f == file) continue;
            
            // Check all ranks where a pawn could be to defend this square
            if (defender == WHITE) {
                // White pawn on rank-1 attacks squares on rank
                int pawnRank = rank - 1;
                if (pawnRank >= RANK_2 && pawnRank <= RANK_7) {
                    if ((defenderPawns & (1L << makeSquare(f, pawnRank))) != 0) {
                        return false; // Can be defended
                    }
                }
                // Also check if pawns could advance to defend
                for (int pr = RANK_2; pr < rank; pr++) {
                    if ((defenderPawns & (1L << makeSquare(f, pr))) != 0) {
                        return false; // A pawn could potentially defend
                    }
                }
            } else {
                // Black pawn on rank+1 attacks squares on rank
                int pawnRank = rank + 1;
                if (pawnRank >= RANK_2 && pawnRank <= RANK_7) {
                    if ((defenderPawns & (1L << makeSquare(f, pawnRank))) != 0) {
                        return false; // Can be defended
                    }
                }
                // Also check if pawns could advance to defend
                for (int pr = RANK_7; pr > rank; pr--) {
                    if ((defenderPawns & (1L << makeSquare(f, pr))) != 0) {
                        return false; // A pawn could potentially defend
                    }
                }
            }
        }
        
        return true; // No pawn can defend this square
    }
}

