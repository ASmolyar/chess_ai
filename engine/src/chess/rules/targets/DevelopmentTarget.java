package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import chess.rules.conditions.DevelopedCondition;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that measures piece development.
 * Measurement = number of developed pieces based on the specified type.
 */
public class DevelopmentTarget implements Target {
    
    public enum DevelopType {
        ALL_MINORS,     // Count all developed knights + bishops
        KNIGHTS,        // Count developed knights only
        BISHOPS,        // Count developed bishops only
        CENTRAL_KNIGHTS, // Knights on c3/f3/c6/f6 or better
        FIANCHETTO      // Bishops on g2/b2/g7/b7
    }
    
    private final DevelopType developType;
    
    // Good knight squares
    private static final long WHITE_GOOD_KNIGHT_SQ = 
        (1L << SQ_C3) | (1L << SQ_F3) | (1L << SQ_D4) | (1L << SQ_E4) |
        (1L << SQ_D5) | (1L << SQ_E5) | (1L << SQ_C5) | (1L << SQ_F5);
    private static final long BLACK_GOOD_KNIGHT_SQ = 
        (1L << SQ_C6) | (1L << SQ_F6) | (1L << SQ_D5) | (1L << SQ_E5) |
        (1L << SQ_D4) | (1L << SQ_E4) | (1L << SQ_C4) | (1L << SQ_F4);
    
    // Fianchetto squares
    private static final long WHITE_FIANCHETTO = (1L << SQ_G2) | (1L << SQ_B2);
    private static final long BLACK_FIANCHETTO = (1L << SQ_G7) | (1L << SQ_B7);
    
    public DevelopmentTarget(DevelopType developType) {
        this.developType = developType;
    }
    
    public DevelopmentTarget() {
        this.developType = DevelopType.ALL_MINORS;
    }
    
    /**
     * Constructor accepting string for JSON parsing.
     */
    public DevelopmentTarget(String typeName) {
        this.developType = parseType(typeName);
    }
    
    private static DevelopType parseType(String name) {
        if (name == null) return DevelopType.ALL_MINORS;
        switch (name.toLowerCase().trim()) {
            case "all_minors": case "minors": case "all": return DevelopType.ALL_MINORS;
            case "knights": return DevelopType.KNIGHTS;
            case "bishops": return DevelopType.BISHOPS;
            case "central_knights": case "centralized": return DevelopType.CENTRAL_KNIGHTS;
            case "fianchetto": case "fianchettoed": return DevelopType.FIANCHETTO;
            default: return DevelopType.ALL_MINORS;
        }
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int measurement = 0;
        int us = ctx.color;
        
        switch (developType) {
            case ALL_MINORS:
                measurement = DevelopedCondition.countDevelopedMinors(ctx, us);
                break;
            case KNIGHTS:
                measurement = DevelopedCondition.countDevelopedKnights(ctx, us);
                break;
            case BISHOPS:
                measurement = DevelopedCondition.countDevelopedBishops(ctx, us);
                break;
            case CENTRAL_KNIGHTS:
                long goodSq = us == WHITE ? WHITE_GOOD_KNIGHT_SQ : BLACK_GOOD_KNIGHT_SQ;
                measurement = popcount(ctx.position.pieces(us, KNIGHT) & goodSq);
                break;
            case FIANCHETTO:
                long fianchetto = us == WHITE ? WHITE_FIANCHETTO : BLACK_FIANCHETTO;
                measurement = popcount(ctx.position.pieces(us, BISHOP) & fianchetto);
                break;
        }
        
        result.add(ctx.withMeasurement(measurement));
        return result;
    }
}



