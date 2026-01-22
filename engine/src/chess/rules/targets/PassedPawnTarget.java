package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import chess.rules.conditions.HasPassedCondition;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that selects passed pawns and measures their advancement.
 * Measurement = rank (1-6 for white, higher = closer to promotion).
 */
public class PassedPawnTarget implements Target {
    
    public enum MeasureType {
        RANK,           // How far advanced (0-6, higher = further)
        DISTANCE,       // Squares from promotion (1-6, lower = closer)
        SQUARED_RANK,   // rank^2 for exponential bonus
        PROTECTED       // 1 if passed pawn is protected, 0 otherwise
    }
    
    private final MeasureType measureType;
    
    public PassedPawnTarget(MeasureType measureType) {
        this.measureType = measureType;
    }
    
    public PassedPawnTarget() {
        this.measureType = MeasureType.RANK;
    }
    
    /**
     * Constructor accepting string for JSON parsing.
     */
    public PassedPawnTarget(String typeName) {
        this.measureType = parseType(typeName);
    }
    
    private static MeasureType parseType(String name) {
        if (name == null) return MeasureType.RANK;
        switch (name.toLowerCase().trim()) {
            case "rank": case "advancement": return MeasureType.RANK;
            case "distance": case "promotion_distance": return MeasureType.DISTANCE;
            case "squared": case "squared_rank": return MeasureType.SQUARED_RANK;
            case "protected": case "defended": return MeasureType.PROTECTED;
            default: return MeasureType.RANK;
        }
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        int us = ctx.color;
        int them = opposite(us);
        long myPawns = ctx.position.pieces(us, PAWN);
        long theirPawns = ctx.position.pieces(them, PAWN);
        long myPiecesCopy = ctx.position.pieces(us);
        
        long[] pawnsArr = {myPawns};
        while (pawnsArr[0] != 0) {
            int sq = popLsb(pawnsArr);
            
            if (HasPassedCondition.isPassedPawn(sq, us, theirPawns)) {
                int rank = rankOf(sq);
                double measurement;
                
                switch (measureType) {
                    case RANK:
                        // For white: rank 1-6 -> advancement 0-5
                        // For black: rank 6-1 -> advancement 0-5
                        measurement = us == WHITE ? rank - 1 : 6 - rank;
                        break;
                    case DISTANCE:
                        // Squares from promotion
                        measurement = us == WHITE ? 7 - rank : rank;
                        break;
                    case SQUARED_RANK:
                        int adv = us == WHITE ? rank - 1 : 6 - rank;
                        measurement = adv * adv;
                        break;
                    case PROTECTED:
                        // Check if protected by another pawn
                        long defenders = pawnAttacks(them, sq) & myPawns;
                        measurement = defenders != 0 ? 1.0 : 0.0;
                        break;
                    default:
                        measurement = 0;
                }
                
                result.add(ctx.withSquare(sq)
                             .withPieceType(PAWN)
                             .withMeasurement(measurement));
            }
        }
        
        return result;
    }
}



