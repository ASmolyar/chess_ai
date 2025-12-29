package chess.rules;

import chess.RuleBasedEvaluator;
import chess.rules.conditions.*;
import chess.rules.targets.*;
import chess.rules.values.*;

import static chess.Types.*;

/**
 * Simple builder for creating rules from string-based configuration.
 * This provides a simplified API for building rules without JSON parsing.
 * 
 * Example usage:
 * SimpleRuleBuilder.material("pawns", PAWN, 100)
 * SimpleRuleBuilder.mobility("knights", KNIGHT, 10, 2.0)
 * SimpleRuleBuilder.distance("king_pawn_distance", KING, PAWN, ">", 3, -10)
 */
public class SimpleRuleBuilder {
    
    /**
     * Create a simple material rule.
     */
    public static Rule material(String id, int pieceType, int value) {
        String name = pieceTypeName(pieceType) + " Material";
        return new Rule(
            id,
            name,
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(pieceType),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    /**
     * Create a mobility rule with optional capture weight.
     */
    public static Rule mobility(String id, int pieceType, int baseValue, double captureWeight) {
        String name = pieceTypeName(pieceType) + " Mobility";
        return new Rule(
            id,
            name,
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(pieceType, captureWeight),
            new ScaledValueCalculator(baseValue, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        );
    }
    
    /**
     * Create a defense bonus rule.
     */
    public static Rule defense(String id, int pieceType, int minDefenders, int value) {
        String name = pieceTypeName(pieceType) + " Defense Bonus";
        return new Rule(
            id,
            name,
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(pieceType, minDefenders),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    /**
     * Create a piece distance rule.
     * @param comparison ">" | "<" | ">=" | "<=" | "=="
     */
    public static Rule distanceCondition(String id, String name,
                                        int piece1Type, int piece1Color,
                                        int piece2Type, int piece2Color,
                                        String comparison, int threshold,
                                        int value) {
        PieceDistanceCondition.Comparison comp;
        switch (comparison) {
            case ">": comp = PieceDistanceCondition.Comparison.GREATER_THAN; break;
            case "<": comp = PieceDistanceCondition.Comparison.LESS_THAN; break;
            case ">=": comp = PieceDistanceCondition.Comparison.GREATER_EQUAL; break;
            case "<=": comp = PieceDistanceCondition.Comparison.LESS_EQUAL; break;
            case "==": comp = PieceDistanceCondition.Comparison.EXACTLY; break;
            default: throw new IllegalArgumentException("Invalid comparison: " + comparison);
        }
        
        return new Rule(
            id,
            name,
            "positional",
            new PieceDistanceCondition(piece1Type, piece1Color, 
                                      piece2Type, piece2Color, 
                                      comp, threshold),
            new GlobalTarget(),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    /**
     * Create a piece distance target that scales value by distance.
     */
    public static Rule distanceScaled(String id, String name,
                                     int piece1Type, int piece1Color,
                                     int piece2Type, int piece2Color,
                                     int valuePerSquare) {
        return new Rule(
            id,
            name,
            "positional",
            AlwaysCondition.instance(),
            new PieceDistanceTarget(piece1Type, piece1Color,
                                   piece2Type, piece2Color,
                                   PieceDistanceTarget.DistanceType.MANHATTAN),
            new ScaledValueCalculator(valuePerSquare, 1.0, 
                                     ScaledValueCalculator.ScaleType.LINEAR),
            1.0
        );
    }
    
    /**
     * Create a castling bonus rule.
     */
    public static Rule castlingBonus(String id, String status, int value) {
        CastlingCondition.Status stat;
        switch (status) {
            case "has_castled": 
                stat = CastlingCondition.Status.HAS_CASTLED_EITHER; 
                break;
            case "can_castle": 
                stat = CastlingCondition.Status.CAN_STILL_CASTLE; 
                break;
            default: 
                throw new IllegalArgumentException("Invalid status: " + status);
        }
        
        return new Rule(
            id,
            "Castling: " + status,
            "king_safety",
            new CastlingCondition(CastlingCondition.Player.MY, stat),
            new GlobalTarget(),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    /**
     * Create a game phase condition rule.
     */
    public static Rule gamePhaseRule(String id, String name, String phase,
                                    Target target, ValueCalculator value,
                                    String category) {
        GamePhaseCondition.Phase p;
        switch (phase) {
            case "opening": p = GamePhaseCondition.Phase.OPENING; break;
            case "middlegame": p = GamePhaseCondition.Phase.MIDDLEGAME; break;
            case "endgame": p = GamePhaseCondition.Phase.ENDGAME; break;
            case "late_endgame": p = GamePhaseCondition.Phase.LATE_ENDGAME; break;
            default: throw new IllegalArgumentException("Invalid phase: " + phase);
        }
        
        return new Rule(
            id,
            name,
            category,
            new GamePhaseCondition(p),
            target,
            value,
            1.0
        );
    }
    
    /**
     * Create a pawn advancement rule.
     */
    public static Rule pawnAdvancement(String id, int valuePerRank) {
        return new Rule(
            id,
            "Pawn Advancement",
            "pawn_structure",
            AlwaysCondition.instance(),
            new PawnAdvancementTarget(),
            new ScaledValueCalculator(valuePerRank, 1.0, 
                                     ScaledValueCalculator.ScaleType.LINEAR),
            1.0
        );
    }
    
    /**
     * Create a check bonus rule.
     */
    public static Rule checkBonus(String id, int value) {
        return new Rule(
            id,
            "Giving Check",
            "threats",
            AlwaysCondition.instance(),
            new CheckTarget(),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    /**
     * Create a global bonus rule (applies once per position).
     */
    public static Rule globalBonus(String id, String name, String category,
                                   Condition condition, int value) {
        return new Rule(
            id,
            name,
            category,
            condition,
            new GlobalTarget(),
            new FixedValueCalculator(value),
            1.0
        );
    }
    
    private static String pieceTypeName(int pieceType) {
        switch (pieceType) {
            case PAWN: return "Pawn";
            case KNIGHT: return "Knight";
            case BISHOP: return "Bishop";
            case ROOK: return "Rook";
            case QUEEN: return "Queen";
            case KING: return "King";
            default: return "Unknown";
        }
    }
}

