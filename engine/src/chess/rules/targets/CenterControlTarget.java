package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that measures control of central squares.
 * Measurement = number of center squares attacked/occupied.
 */
public class CenterControlTarget implements Target {
    
    public enum CenterType {
        CORE,           // e4, d4, e5, d5 (4 squares)
        EXTENDED,       // Core + c3-f3, c4-f4, c5-f5, c6-f6 (16 squares)
        OCCUPATION,     // Pieces ON center squares
        ATTACKS         // Attacks TO center squares
    }
    
    private final CenterType centerType;
    
    // Center masks
    private static final long CORE_CENTER = 
        (1L << SQ_D4) | (1L << SQ_E4) | (1L << SQ_D5) | (1L << SQ_E5);
    
    private static final long EXTENDED_CENTER = CORE_CENTER |
        (1L << SQ_C3) | (1L << SQ_D3) | (1L << SQ_E3) | (1L << SQ_F3) |
        (1L << SQ_C4) | (1L << SQ_F4) |
        (1L << SQ_C5) | (1L << SQ_F5) |
        (1L << SQ_C6) | (1L << SQ_D6) | (1L << SQ_E6) | (1L << SQ_F6);
    
    public CenterControlTarget(CenterType centerType) {
        this.centerType = centerType;
    }
    
    public CenterControlTarget() {
        this.centerType = CenterType.CORE;
    }
    
    /**
     * Constructor accepting string for JSON parsing.
     */
    public CenterControlTarget(String typeName) {
        this.centerType = parseType(typeName);
    }
    
    private static CenterType parseType(String name) {
        if (name == null) return CenterType.CORE;
        switch (name.toLowerCase().trim()) {
            case "core": case "main": case "small": return CenterType.CORE;
            case "extended": case "big": case "large": return CenterType.EXTENDED;
            case "occupation": case "occupy": case "pieces": return CenterType.OCCUPATION;
            case "attacks": case "attack": case "control": return CenterType.ATTACKS;
            default: return CenterType.CORE;
        }
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long centerMask = (centerType == CenterType.EXTENDED) ? EXTENDED_CENTER : CORE_CENTER;
        int measurement;
        
        switch (centerType) {
            case OCCUPATION:
                measurement = popcount(ctx.position.pieces(ctx.color) & centerMask);
                break;
            case ATTACKS:
                measurement = countCenterAttacks(ctx, centerMask);
                break;
            default:
                // Combined: occupation + attacks
                int occ = popcount(ctx.position.pieces(ctx.color) & centerMask);
                int att = countCenterAttacks(ctx, centerMask);
                measurement = occ + att;
                break;
        }
        
        result.add(ctx.withMeasurement(measurement));
        return result;
    }
    
    private int countCenterAttacks(EvalContext ctx, long centerMask) {
        int attacks = 0;
        long occupied = ctx.position.pieces();
        int us = ctx.color;
        
        // Count center squares attacked by each piece type
        long[] centerArr = {centerMask};
        while (centerArr[0] != 0) {
            int sq = popLsb(centerArr);
            
            // Pawn attacks
            long pawnAtk = pawnAttacks(opposite(us), sq) & ctx.position.pieces(us, PAWN);
            if (pawnAtk != 0) attacks++;
            
            // Knight attacks
            long knightAtk = knightAttacks(sq) & ctx.position.pieces(us, KNIGHT);
            if (knightAtk != 0) attacks++;
            
            // Bishop attacks
            long bishopAtk = bishopAttacks(sq, occupied) & ctx.position.pieces(us, BISHOP);
            if (bishopAtk != 0) attacks++;
            
            // Rook attacks
            long rookAtk = rookAttacks(sq, occupied) & ctx.position.pieces(us, ROOK);
            if (rookAtk != 0) attacks++;
            
            // Queen attacks
            long queenAtk = queenAttacks(sq, occupied) & ctx.position.pieces(us, QUEEN);
            if (queenAtk != 0) attacks++;
            
            // King attacks
            long kingAtk = kingAttacks(sq) & ctx.position.pieces(us, KING);
            if (kingAtk != 0) attacks++;
        }
        
        return attacks;
    }
}



