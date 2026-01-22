package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Condition that checks the state of a file (open, semi-open, closed).
 * Open = no pawns, Semi-open = only opponent pawns, Closed = pawns from both sides.
 */
public class FileStateCondition implements Condition {
    
    public enum FileState {
        OPEN,           // No pawns on file
        SEMI_OPEN,      // Only enemy pawns (good for rooks)
        CLOSED,         // Pawns from both sides
        HAS_MY_PAWN,    // Has at least one of my pawns
        HAS_ENEMY_PAWN  // Has at least one enemy pawn
    }
    
    private final int file;  // 0-7 for a-h, or -1 for "any"
    private final FileState requiredState;
    
    public FileStateCondition(int file, FileState requiredState) {
        this.file = file;
        this.requiredState = requiredState;
    }
    
    /**
     * Constructor accepting string parameters for JSON parsing.
     * @param fileName File letter (a-h) or "any"
     * @param stateName "open", "semi_open", "closed", "has_my_pawn", "has_enemy_pawn"
     */
    public FileStateCondition(String fileName, String stateName) {
        this.file = parseFile(fileName);
        this.requiredState = parseState(stateName);
    }
    
    private static int parseFile(String name) {
        if (name == null || name.isEmpty()) return -1;
        name = name.toLowerCase().trim();
        if (name.equals("any")) return -1;
        if (name.length() == 1) {
            char c = name.charAt(0);
            if (c >= 'a' && c <= 'h') {
                return c - 'a';
            }
        }
        return -1;
    }
    
    private static FileState parseState(String name) {
        if (name == null) return FileState.OPEN;
        switch (name.toLowerCase().trim()) {
            case "open": return FileState.OPEN;
            case "semi_open": case "semiopen": case "half_open": return FileState.SEMI_OPEN;
            case "closed": return FileState.CLOSED;
            case "has_my_pawn": case "my_pawn": return FileState.HAS_MY_PAWN;
            case "has_enemy_pawn": case "enemy_pawn": return FileState.HAS_ENEMY_PAWN;
            default: return FileState.OPEN;
        }
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        if (file == -1) {
            // Check if ANY file matches
            for (int f = 0; f < 8; f++) {
                if (checkFile(ctx, f)) return true;
            }
            return false;
        }
        return checkFile(ctx, file);
    }
    
    private boolean checkFile(EvalContext ctx, int f) {
        long fileMask = FILE_A << f;
        long myPawns = ctx.position.pieces(ctx.color, PAWN) & fileMask;
        long enemyPawns = ctx.position.pieces(opposite(ctx.color), PAWN) & fileMask;
        
        boolean hasMyPawn = myPawns != 0;
        boolean hasEnemyPawn = enemyPawns != 0;
        
        switch (requiredState) {
            case OPEN:
                return !hasMyPawn && !hasEnemyPawn;
            case SEMI_OPEN:
                return !hasMyPawn && hasEnemyPawn;
            case CLOSED:
                return hasMyPawn && hasEnemyPawn;
            case HAS_MY_PAWN:
                return hasMyPawn;
            case HAS_ENEMY_PAWN:
                return hasEnemyPawn;
            default:
                return false;
        }
    }
    
    /**
     * File masks for external use.
     */
    public static final long FILE_A = 0x0101010101010101L;
    public static final long FILE_B = FILE_A << 1;
    public static final long FILE_C = FILE_A << 2;
    public static final long FILE_D = FILE_A << 3;
    public static final long FILE_E = FILE_A << 4;
    public static final long FILE_F = FILE_A << 5;
    public static final long FILE_G = FILE_A << 6;
    public static final long FILE_H = FILE_A << 7;
}



