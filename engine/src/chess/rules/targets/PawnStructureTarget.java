package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates pawn structure features.
 * Returns measurement based on the structure type being analyzed.
 */
public class PawnStructureTarget implements Target {
    
    public enum StructureType {
        DOUBLED,      // Count doubled pawns (negative for evaluation)
        ISOLATED,     // Count isolated pawns (no friendly pawns on adjacent files)
        CONNECTED,    // Count connected pawns (defended by another pawn)
        BACKWARD,     // Count backward pawns (behind pawns on adjacent files)
        PHALANX       // Count pawn pairs side-by-side
    }
    
    private final StructureType structureType;
    
    public PawnStructureTarget(StructureType structureType) {
        this.structureType = structureType;
    }
    
    /**
     * Constructor accepting string for JSON parsing.
     */
    public PawnStructureTarget(String typeName) {
        this.structureType = parseType(typeName);
    }
    
    private static StructureType parseType(String name) {
        if (name == null) return StructureType.DOUBLED;
        switch (name.toLowerCase().trim()) {
            case "doubled": return StructureType.DOUBLED;
            case "isolated": return StructureType.ISOLATED;
            case "connected": return StructureType.CONNECTED;
            case "backward": return StructureType.BACKWARD;
            case "phalanx": return StructureType.PHALANX;
            default: return StructureType.DOUBLED;
        }
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long myPawns = ctx.position.pieces(ctx.color, PAWN);
        int count = 0;
        
        switch (structureType) {
            case DOUBLED:
                count = countDoubledPawns(myPawns);
                break;
            case ISOLATED:
                count = countIsolatedPawns(myPawns);
                break;
            case CONNECTED:
                count = countConnectedPawns(myPawns, ctx.color);
                break;
            case BACKWARD:
                count = countBackwardPawns(myPawns, ctx.color,
                    ctx.position.pieces(opposite(ctx.color), PAWN));
                break;
            case PHALANX:
                count = countPhalanxPawns(myPawns);
                break;
        }
        
        // Return single context with the count as measurement
        result.add(ctx.withMeasurement(count));
        return result;
    }
    
    /**
     * Count doubled pawns (multiple pawns on same file).
     */
    public static int countDoubledPawns(long pawns) {
        int doubled = 0;
        for (int file = 0; file < 8; file++) {
            long fileMask = FILE_A << file;
            int pawnsOnFile = popcount(pawns & fileMask);
            if (pawnsOnFile > 1) {
                doubled += pawnsOnFile - 1; // Extra pawns on file
            }
        }
        return doubled;
    }
    
    /**
     * Count isolated pawns (no friendly pawns on adjacent files).
     */
    public static int countIsolatedPawns(long pawns) {
        int isolated = 0;
        for (int file = 0; file < 8; file++) {
            long fileMask = FILE_A << file;
            if ((pawns & fileMask) == 0) continue;
            
            // Check adjacent files
            long adjFiles = 0L;
            if (file > 0) adjFiles |= FILE_A << (file - 1);
            if (file < 7) adjFiles |= FILE_A << (file + 1);
            
            if ((pawns & adjFiles) == 0) {
                isolated += popcount(pawns & fileMask);
            }
        }
        return isolated;
    }
    
    /**
     * Count connected pawns (defended by another pawn).
     */
    public static int countConnectedPawns(long pawns, int color) {
        int connected = 0;
        long[] pawnsArr = {pawns};
        long pawnsCopy = pawns;
        
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            // Check if defended by a pawn (pawn attacks from behind)
            long defenders = pawnAttacks(opposite(color), sq) & pawnsCopy;
            if (defenders != 0) {
                connected++;
            }
        }
        return connected;
    }
    
    /**
     * Count backward pawns (behind pawns on adjacent files, can't be safely pushed).
     */
    public static int countBackwardPawns(long myPawns, int color, long enemyPawns) {
        int backward = 0;
        long[] pawnsArr = {myPawns};
        
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            int file = fileOf(sq);
            int rank = rankOf(sq);
            
            // Check if all friendly pawns on adjacent files are ahead
            boolean isBackward = true;
            
            // Check adjacent files
            for (int adjFile = Math.max(0, file - 1); adjFile <= Math.min(7, file + 1); adjFile++) {
                if (adjFile == file) continue;
                
                long adjFileMask = FILE_A << adjFile;
                long adjPawns = myPawns & adjFileMask;
                
                if (adjPawns != 0) {
                    // Check if any adjacent pawn is behind or at same rank
                    long[] adjArr = {adjPawns};
                    while (adjArr[0] != 0) {
                        int adjSq = popLsb(adjArr);
                        int adjRank = rankOf(adjSq);
                        
                        boolean adjBehind = (color == WHITE) ? adjRank <= rank : adjRank >= rank;
                        if (adjBehind) {
                            isBackward = false;
                            break;
                        }
                    }
                }
            }
            
            // Also check if push square is controlled by enemy pawn
            if (isBackward) {
                int pushSq = color == WHITE ? sq + 8 : sq - 8;
                if (pushSq >= 0 && pushSq < 64) {
                    long pushAttackers = pawnAttacks(opposite(color), pushSq) & enemyPawns;
                    isBackward = pushAttackers != 0;
                }
            }
            
            if (isBackward) backward++;
        }
        return backward;
    }
    
    /**
     * Count phalanx pawns (side by side).
     */
    public static int countPhalanxPawns(long pawns) {
        int phalanx = 0;
        long[] pawnsArr = {pawns};
        
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            int file = fileOf(sq);
            
            // Check right neighbor only (to avoid double counting)
            if (file < 7) {
                if ((pawns & (1L << (sq + 1))) != 0) {
                    phalanx++;
                }
            }
        }
        return phalanx;
    }
    
    // File masks
    private static final long FILE_A = 0x0101010101010101L;
}



