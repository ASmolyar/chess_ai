package chess.rules;

import chess.RuleBasedEvaluator;
import chess.rules.conditions.*;
import chess.rules.targets.*;
import chess.rules.values.*;

import static chess.Types.*;

/**
 * Builder that creates a rule-based version of Turing's evaluation function.
 * This demonstrates how to construct complex evaluators from rules.
 */
public class TuringEvalBuilder {
    
    public static RuleBasedEvaluator build() {
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        
        builder.name("Turing (Rule-Based)")
               .description("Alan Turing's evaluation implemented with rules");
        
        // Set all category weights to 1.0 (no scaling)
        builder.setCategoryWeight("material", 1.0);
        builder.setCategoryWeight("mobility", 1.0);
        builder.setCategoryWeight("piece_coordination", 1.0);
        builder.setCategoryWeight("king_safety", 1.0);
        builder.setCategoryWeight("pawn_structure", 1.0);
        builder.setCategoryWeight("threats", 1.0);
        
        // Material rules
        addMaterialRules(builder);
        
        // Mobility rules (with captures counting double)
        addMobilityRules(builder);
        
        // Defense rules
        addDefenseRules(builder);
        
        // Pawn rules
        addPawnRules(builder);
        
        // Castling rules
        addCastlingRules(builder);
        
        // Check bonus
        addCheckRule(builder);
        
        return builder.build();
    }
    
    private static void addMaterialRules(RuleBasedEvaluator.Builder builder) {
        // Pawns
        builder.addRule(new Rule(
            "turing_pawn_material",
            "Pawn Material",
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100),
            1.0
        ));
        
        // Knights
        builder.addRule(new Rule(
            "turing_knight_material",
            "Knight Material",
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(KNIGHT),
            new FixedValueCalculator(300),
            1.0
        ));
        
        // Bishops
        builder.addRule(new Rule(
            "turing_bishop_material",
            "Bishop Material",
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(BISHOP),
            new FixedValueCalculator(350),
            1.0
        ));
        
        // Rooks
        builder.addRule(new Rule(
            "turing_rook_material",
            "Rook Material",
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(ROOK),
            new FixedValueCalculator(500),
            1.0
        ));
        
        // Queens
        builder.addRule(new Rule(
            "turing_queen_material",
            "Queen Material",
            "material",
            AlwaysCondition.instance(),
            new SimpleMaterialTarget(QUEEN),
            new FixedValueCalculator(1000),
            1.0
        ));
    }
    
    private static void addMobilityRules(RuleBasedEvaluator.Builder builder) {
        // Knights: sqrt(mobility) * 10, captures count double
        builder.addRule(new Rule(
            "turing_knight_mobility",
            "Knight Mobility",
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(KNIGHT, 2.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        ));
        
        // Bishops
        builder.addRule(new Rule(
            "turing_bishop_mobility",
            "Bishop Mobility",
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(BISHOP, 2.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        ));
        
        // Rooks
        builder.addRule(new Rule(
            "turing_rook_mobility",
            "Rook Mobility",
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(ROOK, 2.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        ));
        
        // Queens
        builder.addRule(new Rule(
            "turing_queen_mobility",
            "Queen Mobility",
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(QUEEN, 2.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        ));
        
        // King
        builder.addRule(new Rule(
            "turing_king_mobility",
            "King Mobility",
            "mobility",
            AlwaysCondition.instance(),
            new MobilityTarget(KING, 1.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0
        ));
    }
    
    private static void addDefenseRules(RuleBasedEvaluator.Builder builder) {
        // Knights defended by 1+ pieces: +10
        builder.addRule(new Rule(
            "turing_knight_defense_1",
            "Knight Defense (1+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(KNIGHT, 1),
            new FixedValueCalculator(10),
            1.0
        ));
        
        // Knights defended by 2+ pieces: +5 more (total 15)
        builder.addRule(new Rule(
            "turing_knight_defense_2",
            "Knight Defense (2+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(KNIGHT, 2),
            new FixedValueCalculator(5),
            1.0
        ));
        
        // Same for bishops
        builder.addRule(new Rule(
            "turing_bishop_defense_1",
            "Bishop Defense (1+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(BISHOP, 1),
            new FixedValueCalculator(10),
            1.0
        ));
        
        builder.addRule(new Rule(
            "turing_bishop_defense_2",
            "Bishop Defense (2+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(BISHOP, 2),
            new FixedValueCalculator(5),
            1.0
        ));
        
        // Same for rooks
        builder.addRule(new Rule(
            "turing_rook_defense_1",
            "Rook Defense (1+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(ROOK, 1),
            new FixedValueCalculator(10),
            1.0
        ));
        
        builder.addRule(new Rule(
            "turing_rook_defense_2",
            "Rook Defense (2+)",
            "piece_coordination",
            AlwaysCondition.instance(),
            new DefenseTarget(ROOK, 2),
            new FixedValueCalculator(5),
            1.0
        ));
    }
    
    private static void addPawnRules(RuleBasedEvaluator.Builder builder) {
        // Pawn advancement: 20 centipawns per rank
        builder.addRule(new Rule(
            "turing_pawn_advancement",
            "Pawn Advancement",
            "pawn_structure",
            AlwaysCondition.instance(),
            new PawnAdvancementTarget(),
            new ScaledValueCalculator(20, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0
        ));
        
        // Pawns defended by pieces (not pawns): +30
        // This is trickier - we need a special target that checks for non-pawn defenders
        // For now, use DefenseTarget with minDefenders=1 and lower value
        // (This is approximate - real Turing eval checks for non-pawn defenders specifically)
        builder.addRule(new Rule(
            "turing_pawn_defended",
            "Pawns Defended by Pieces",
            "pawn_structure",
            AlwaysCondition.instance(),
            new DefenseTarget(PAWN, 1),
            new FixedValueCalculator(15),
            1.0
        ));
    }
    
    private static void addCastlingRules(RuleBasedEvaluator.Builder builder) {
        // Has castled: +100
        builder.addRule(new Rule(
            "turing_has_castled",
            "Has Castled",
            "king_safety",
            new CastlingCondition(CastlingCondition.Player.MY, 
                                 CastlingCondition.Status.HAS_CASTLED_EITHER),
            new GlobalTarget(),
            new FixedValueCalculator(100),
            1.0
        ));
        
        // Can still castle: +100
        builder.addRule(new Rule(
            "turing_can_castle",
            "Can Still Castle",
            "king_safety",
            new LogicalCondition(
                LogicalCondition.Operator.AND,
                java.util.Arrays.asList(
                    new CastlingCondition(CastlingCondition.Player.MY,
                                         CastlingCondition.Status.CAN_STILL_CASTLE),
                    new CastlingCondition(CastlingCondition.Player.MY,
                                         CastlingCondition.Status.HAS_NOT_CASTLED)
                )
            ),
            new GlobalTarget(),
            new FixedValueCalculator(100),
            1.0
        ));
    }
    
    private static void addCheckRule(RuleBasedEvaluator.Builder builder) {
        // Giving check: +50
        builder.addRule(new Rule(
            "turing_giving_check",
            "Giving Check",
            "threats",
            AlwaysCondition.instance(),
            new CheckTarget(),
            new FixedValueCalculator(50),
            1.0
        ));
    }
}

