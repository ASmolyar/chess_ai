package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that measures space advantage (control of squares in enemy territory).
 * Space is typically defined as squares on ranks 4-6 for white and 3-5 for black,
 * that are behind your pawn chain and controlled by your pieces.
 * Returns one context with measurement = space advantage.
 */
public class SpaceAdvantageTarget implements Target {

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int spaceScore = calculateSpace(ctx);
        result.add(ctx.withMeasurement(spaceScore));
        
        return result;
    }
    
    private int calculateSpace(EvalContext ctx) {
        int color = ctx.color;
        long myPawns = ctx.position.pieces(color, PAWN);
        
        // Define the space area (ranks 2-4 for white's space, 5-7 for black's space)
        // These are the ranks where having control matters
        long spaceArea;
        if (color == WHITE) {
            spaceArea = RANK_BB[RANK_2] | RANK_BB[RANK_3] | RANK_BB[RANK_4];
        } else {
            spaceArea = RANK_BB[RANK_5] | RANK_BB[RANK_6] | RANK_BB[RANK_7];
        }
        
        // Exclude files with no friendly pawns (less relevant space)
        long relevantFiles = 0L;
        for (int f = FILE_A; f <= FILE_H; f++) {
            if ((myPawns & FILE_BB[f]) != 0) {
                relevantFiles |= FILE_BB[f];
            }
        }
        
        // Also include central files always
        relevantFiles |= FILE_BB[FILE_C] | FILE_BB[FILE_D] | FILE_BB[FILE_E] | FILE_BB[FILE_F];
        
        spaceArea &= relevantFiles;
        
        // Count squares we control (attacked by our pieces but not blocked by our pawns)
        int controlledSquares = 0;
        long blocked = myPawns;
        
        // Add squares behind our pawns
        long behindPawns = 0L;
        long[] pawnsCopy = {myPawns};
        while (pawnsCopy[0] != 0) {
            int sq = popLsb(pawnsCopy);
            int file = fileOf(sq);
            int rank = rankOf(sq);
            
            if (color == WHITE) {
                // Squares behind (lower rank) white pawns
                for (int r = RANK_1; r < rank; r++) {
                    behindPawns |= (1L << makeSquare(file, r));
                }
            } else {
                // Squares behind (higher rank) black pawns
                for (int r = RANK_8; r > rank; r--) {
                    behindPawns |= (1L << makeSquare(file, r));
                }
            }
        }
        
        // Count safe squares in our space area
        long safeSquares = spaceArea & behindPawns & ~blocked;
        
        // Also count squares we attack in the space area
        long attacked = 0L;
        long allPieces = ctx.position.pieces();
        
        // Add pawn attacks
        long[] myPawnsCopy = {myPawns};
        while (myPawnsCopy[0] != 0) {
            int sq = popLsb(myPawnsCopy);
            attacked |= pawnAttacks(color, sq);
        }
        
        // Add piece attacks
        long knights = ctx.position.pieces(color, KNIGHT);
        long[] knightsCopy = {knights};
        while (knightsCopy[0] != 0) {
            attacked |= knightAttacks(popLsb(knightsCopy));
        }
        
        long bishops = ctx.position.pieces(color, BISHOP);
        long[] bishopsCopy = {bishops};
        while (bishopsCopy[0] != 0) {
            attacked |= bishopAttacks(popLsb(bishopsCopy), allPieces);
        }
        
        long rooks = ctx.position.pieces(color, ROOK);
        long[] rooksCopy = {rooks};
        while (rooksCopy[0] != 0) {
            attacked |= rookAttacks(popLsb(rooksCopy), allPieces);
        }
        
        long queens = ctx.position.pieces(color, QUEEN);
        long[] queensCopy = {queens};
        while (queensCopy[0] != 0) {
            int sq = popLsb(queensCopy);
            attacked |= bishopAttacks(sq, allPieces) | rookAttacks(sq, allPieces);
        }
        
        // Space = safe squares + attacked squares in space area
        long spaceSquares = (safeSquares | (attacked & spaceArea)) & ~blocked;
        controlledSquares = popcount(spaceSquares);
        
        return controlledSquares;
    }
}

