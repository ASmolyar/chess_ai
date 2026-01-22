package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates pawn chains (diagonal pawn structures).
 * A pawn chain is a series of pawns that defend each other diagonally.
 * Returns contexts for pawns that are part of chains.
 */
public class PawnChainTarget implements Target {
    
    public enum ChainRole {
        BASE,    // Pawn at the base of the chain (not defended by another pawn)
        MEMBER,  // Pawn in the middle of a chain
        HEAD,    // Pawn at the head of the chain (defends but not defended)
        ANY      // Any pawn in a chain
    }
    
    private final ChainRole role;
    
    public PawnChainTarget() {
        this.role = ChainRole.ANY;
    }
    
    public PawnChainTarget(ChainRole role) {
        this.role = role;
    }
    
    public PawnChainTarget(String roleName) {
        switch (roleName.toLowerCase()) {
            case "base": this.role = ChainRole.BASE; break;
            case "member": this.role = ChainRole.MEMBER; break;
            case "head": this.role = ChainRole.HEAD; break;
            default: this.role = ChainRole.ANY; break;
        }
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long myPawns = ctx.position.pieces(ctx.color, PAWN);
        
        long[] pawns = {myPawns};
        while (pawns[0] != 0) {
            int sq = popLsb(pawns);
            
            boolean defendsOther = defendsAnotherPawn(sq, ctx.color, myPawns);
            boolean isDefended = isDefendedByPawn(sq, ctx.color, myPawns);
            
            ChainRole pawnRole;
            if (defendsOther && isDefended) {
                pawnRole = ChainRole.MEMBER;
            } else if (defendsOther && !isDefended) {
                pawnRole = ChainRole.HEAD;
            } else if (!defendsOther && isDefended) {
                pawnRole = ChainRole.BASE;
            } else {
                continue; // Not part of a chain
            }
            
            if (role == ChainRole.ANY || role == pawnRole) {
                result.add(ctx.withSquare(sq).withPieceType(PAWN).withMeasurement(1.0));
            }
        }
        
        return result;
    }
    
    /**
     * Check if this pawn defends another pawn.
     */
    private boolean defendsAnotherPawn(int sq, int color, long myPawns) {
        int file = fileOf(sq);
        int rank = rankOf(sq);
        
        // White pawns defend forward-diagonally, black pawns defend backward-diagonally
        int defendedRank = (color == WHITE) ? rank + 1 : rank - 1;
        if (defendedRank < RANK_1 || defendedRank > RANK_8) return false;
        
        // Check diagonals
        if (file > FILE_A) {
            int leftDiag = makeSquare(file - 1, defendedRank);
            if ((myPawns & (1L << leftDiag)) != 0) return true;
        }
        if (file < FILE_H) {
            int rightDiag = makeSquare(file + 1, defendedRank);
            if ((myPawns & (1L << rightDiag)) != 0) return true;
        }
        
        return false;
    }
    
    /**
     * Check if this pawn is defended by another pawn.
     */
    private boolean isDefendedByPawn(int sq, int color, long myPawns) {
        int file = fileOf(sq);
        int rank = rankOf(sq);
        
        // White pawns are defended by pawns on lower ranks, black by higher ranks
        int defenderRank = (color == WHITE) ? rank - 1 : rank + 1;
        if (defenderRank < RANK_1 || defenderRank > RANK_8) return false;
        
        // Check diagonals
        if (file > FILE_A) {
            int leftDiag = makeSquare(file - 1, defenderRank);
            if ((myPawns & (1L << leftDiag)) != 0) return true;
        }
        if (file < FILE_H) {
            int rightDiag = makeSquare(file + 1, defenderRank);
            if ((myPawns & (1L << rightDiag)) != 0) return true;
        }
        
        return false;
    }
}

