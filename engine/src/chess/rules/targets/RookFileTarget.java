package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that evaluates rooks based on their file type.
 * Returns one context per rook with measurement indicating file quality.
 */
public class RookFileTarget implements Target {
    
    public enum FileType {
        OPEN,           // No pawns on file - measurement = 1
        SEMI_OPEN,      // Only enemy pawns - measurement = 1
        CLOSED,         // Friendly pawns blocking - measurement = 1
        QUALITY         // Open = 2, semi-open = 1, closed = 0
    }
    
    private final FileType fileType;
    
    public RookFileTarget(FileType fileType) {
        this.fileType = fileType;
    }
    
    public RookFileTarget() {
        this.fileType = FileType.QUALITY;
    }
    
    /**
     * Constructor accepting string for JSON parsing.
     */
    public RookFileTarget(String typeName) {
        this.fileType = parseType(typeName);
    }
    
    private static FileType parseType(String name) {
        if (name == null) return FileType.QUALITY;
        switch (name.toLowerCase().trim()) {
            case "open": return FileType.OPEN;
            case "semi_open": case "semiopen": case "half_open": return FileType.SEMI_OPEN;
            case "closed": return FileType.CLOSED;
            case "quality": case "all": return FileType.QUALITY;
            default: return FileType.QUALITY;
        }
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long rooks = ctx.position.pieces(ctx.color, ROOK);
        long myPawns = ctx.position.pieces(ctx.color, PAWN);
        long enemyPawns = ctx.position.pieces(opposite(ctx.color), PAWN);
        
        long[] rooksArr = {rooks};
        while (rooksArr[0] != 0) {
            int sq = popLsb(rooksArr);
            int file = fileOf(sq);
            long fileMask = FILE_A << file;
            
            boolean hasMyPawn = (myPawns & fileMask) != 0;
            boolean hasEnemyPawn = (enemyPawns & fileMask) != 0;
            
            boolean isOpen = !hasMyPawn && !hasEnemyPawn;
            boolean isSemiOpen = !hasMyPawn && hasEnemyPawn;
            boolean isClosed = hasMyPawn;
            
            double measurement = 0;
            boolean include = false;
            
            switch (fileType) {
                case OPEN:
                    if (isOpen) {
                        measurement = 1;
                        include = true;
                    }
                    break;
                case SEMI_OPEN:
                    if (isSemiOpen) {
                        measurement = 1;
                        include = true;
                    }
                    break;
                case CLOSED:
                    if (isClosed) {
                        measurement = 1;
                        include = true;
                    }
                    break;
                case QUALITY:
                    include = true;
                    if (isOpen) measurement = 2;
                    else if (isSemiOpen) measurement = 1;
                    else measurement = 0;
                    break;
            }
            
            if (include) {
                result.add(ctx.withSquare(sq)
                             .withPieceType(ROOK)
                             .withMeasurement(measurement));
            }
        }
        
        return result;
    }
    
    private static final long FILE_A = 0x0101010101010101L;
}



