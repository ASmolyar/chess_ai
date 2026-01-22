package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates king safety by counting enemy attacks on the king zone.
 * Measurement = number of enemy attack squares in the king zone (higher = more danger).
 * Use with negative value to penalize exposed kings.
 */
public class KingSafetyTarget implements Target {
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int ksq = ctx.position.kingSquare(ctx.color);
        long occupied = ctx.position.pieces();
        
        // King zone = king's square + all adjacent squares
        long kingZone = kingAttacks(ksq) | (1L << ksq);
        
        // Count enemy attacks on king zone
        int them = opposite(ctx.color);
        long enemyAttacks = 0L;
        
        // Enemy pawn attacks
        long pawns = ctx.position.pieces(them, PAWN);
        long[] pawnsArr = {pawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            enemyAttacks |= pawnAttacks(them, sq);
        }
        
        // Enemy knight attacks
        long knights = ctx.position.pieces(them, KNIGHT);
        long[] knightsArr = {knights};
        while (knightsArr[0] != 0) {
            int sq = popLsb(knightsArr);
            enemyAttacks |= knightAttacks(sq);
        }
        
        // Enemy bishop attacks
        long bishops = ctx.position.pieces(them, BISHOP);
        long[] bishopsArr = {bishops};
        while (bishopsArr[0] != 0) {
            int sq = popLsb(bishopsArr);
            enemyAttacks |= bishopAttacks(sq, occupied);
        }
        
        // Enemy rook attacks
        long rooks = ctx.position.pieces(them, ROOK);
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            enemyAttacks |= rookAttacks(sq, occupied);
        }
        
        // Enemy queen attacks
        long queens = ctx.position.pieces(them, QUEEN);
        long[] queensArr = {queens};
        while (queensArr[0] != 0) {
            int sq = popLsb(queensArr);
            enemyAttacks |= queenAttacks(sq, occupied);
        }
        
        // Count attacks on king zone
        int attacksOnKingZone = popcount(enemyAttacks & kingZone);
        
        result.add(ctx.withSquare(ksq)
                     .withPieceType(KING)
                     .withMeasurement(attacksOnKingZone));
        
        return result;
    }
}



