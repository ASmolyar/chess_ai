package chess.rules;

import chess.*;

/**
 * Test/example class demonstrating the rule-based evaluator.
 * 
 * This class can be run standalone to test the rule system.
 * It creates evaluators and compares them against test positions.
 */
public class RuleEvalTest {
    
    public static void main(String[] args) {
        System.out.println("=== Rule-Based Evaluator Test ===\n");
        
        // Initialize bitboard attack tables
        Bitboard.init();
        
        // Test 1: Create Turing eval from rules
        testTuringEval();
        
        // Test 2: Create simple custom eval
        testSimpleEval();
        
        // Test 3: Test distance-based rules
        testDistanceRules();
        
        // Test 4: Test new Easy features
        testEasyFeatures();
        
        System.out.println("\n=== All Tests Complete ===");
    }
    
    /**
     * Test 1: Verify Turing evaluation can be built from rules.
     */
    private static void testTuringEval() {
        System.out.println("Test 1: Turing Evaluation (Rule-Based)");
        System.out.println("----------------------------------------");
        
        // Create rule-based Turing eval
        RuleBasedEvaluator turingRules = TuringEvalBuilder.build();
        
        // Create original Turing eval for comparison
        TuringEval turingOrig = new TuringEval();
        
        // Create a test position (starting position)
        Position pos = new Position();
        
        System.out.println("Evaluator: " + turingRules.getName());
        System.out.println("Description: " + turingRules.getDescription());
        System.out.println("Number of rules: " + turingRules.getRules().size());
        System.out.println("\nStarting position evaluation:");
        System.out.println("  Rule-based: " + turingRules.evaluate(pos) + " centipawns");
        System.out.println("  Original:   " + turingOrig.evaluate(pos) + " centipawns");
        System.out.println("  (Note: May differ slightly due to implementation details)");
        System.out.println();
    }
    
    /**
     * Test 2: Create a simple custom evaluator.
     */
    private static void testSimpleEval() {
        System.out.println("Test 2: Simple Custom Evaluator");
        System.out.println("--------------------------------");
        
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        builder.name("Simple Test Eval");
        
        // Just material
        builder.addRule(SimpleRuleBuilder.material("pawns", Types.PAWN, 100));
        builder.addRule(SimpleRuleBuilder.material("knights", Types.KNIGHT, 320));
        builder.addRule(SimpleRuleBuilder.material("bishops", Types.BISHOP, 330));
        builder.addRule(SimpleRuleBuilder.material("rooks", Types.ROOK, 500));
        builder.addRule(SimpleRuleBuilder.material("queens", Types.QUEEN, 900));
        
        RuleBasedEvaluator eval = builder.build();
        
        Position pos = new Position();
        int score = eval.evaluate(pos);
        
        System.out.println("Evaluator: " + eval.getName());
        System.out.println("Rules: " + eval.getRules().size());
        System.out.println("Starting position: " + score + " centipawns");
        System.out.println("  (Should be 0 - equal material)");
        System.out.println();
    }
    
    /**
     * Test 3: Test distance-based rules.
     */
    private static void testDistanceRules() {
        System.out.println("Test 3: Distance-Based Rules");
        System.out.println("-----------------------------");
        
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        builder.name("Distance Test");
        
        // Material
        builder.addRule(SimpleRuleBuilder.material("pawns", Types.PAWN, 100));
        builder.addRule(SimpleRuleBuilder.material("kings", Types.KING, 0));
        
        // King-pawn distance penalty: -5 per square
        builder.addRule(SimpleRuleBuilder.distanceScaled(
            "king_pawn_dist",
            "King-Pawn Distance",
            Types.KING, 0,  // my king
            Types.PAWN, 1,  // opponent pawns
            -5              // -5 per square
        ));
        
        RuleBasedEvaluator eval = builder.build();
        
        Position pos = new Position();
        
        System.out.println("Evaluator: " + eval.getName());
        System.out.println("Rules: " + eval.getRules().size());
        System.out.println("Starting position: " + eval.evaluate(pos) + " centipawns");
        System.out.println();
    }
    
    /**
     * Test 4: Test new Easy features (pawn structure, rook files, development, etc.)
     */
    private static void testEasyFeatures() {
        System.out.println("Test 4: Easy Features (Pawn Structure, Development, etc.)");
        System.out.println("----------------------------------------------------------");
        
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        builder.name("Easy Features Test");
        
        // Material base
        builder.addRule(SimpleRuleBuilder.material("pawns", Types.PAWN, 100));
        builder.addRule(SimpleRuleBuilder.material("knights", Types.KNIGHT, 320));
        builder.addRule(SimpleRuleBuilder.material("bishops", Types.BISHOP, 330));
        builder.addRule(SimpleRuleBuilder.material("rooks", Types.ROOK, 500));
        builder.addRule(SimpleRuleBuilder.material("queens", Types.QUEEN, 900));
        
        // Pawn structure
        builder.addRule(SimpleRuleBuilder.doubledPawns("doubled", -20));
        builder.addRule(SimpleRuleBuilder.isolatedPawns("isolated", -15));
        builder.addRule(SimpleRuleBuilder.connectedPawns("connected", 10));
        builder.addRule(SimpleRuleBuilder.passedPawns("passed", 20));
        
        // Rook activity
        builder.addRule(SimpleRuleBuilder.rookOnOpenFile("rook_open", 25));
        builder.addRule(SimpleRuleBuilder.rookOnSemiOpenFile("rook_semi", 15));
        
        // Development & center
        builder.addRule(SimpleRuleBuilder.development("dev", 15));
        builder.addRule(SimpleRuleBuilder.centerControl("center", 10));
        builder.addRule(SimpleRuleBuilder.centralKnight("central_knight", 20));
        builder.addRule(SimpleRuleBuilder.fianchetto("fianchetto", 15));
        
        RuleBasedEvaluator eval = builder.build();
        
        Position pos = new Position();
        
        System.out.println("Evaluator: " + eval.getName());
        System.out.println("Rules: " + eval.getRules().size());
        System.out.println("Starting position: " + eval.evaluate(pos) + " centipawns");
        System.out.println("  (Should be 0 - symmetrical position)");
        System.out.println();
        
        // Test with e4 opening
        pos.setFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
        System.out.println("After 1.e4: " + eval.evaluate(pos) + " centipawns (from Black's view)");
        System.out.println("  (Should be slightly negative - White has center control)");
        System.out.println();
    }
    
    /**
     * Example: Building a custom evaluator programmatically.
     */
    public static RuleBasedEvaluator buildCustomEval() {
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        
        builder.name("Custom Evaluator")
               .description("Material + Mobility + Tactics");
        
        // Material with slightly higher piece values
        builder.addRule(SimpleRuleBuilder.material("pawns", Types.PAWN, 110));
        builder.addRule(SimpleRuleBuilder.material("knights", Types.KNIGHT, 330));
        builder.addRule(SimpleRuleBuilder.material("bishops", Types.BISHOP, 340));
        builder.addRule(SimpleRuleBuilder.material("rooks", Types.ROOK, 520));
        builder.addRule(SimpleRuleBuilder.material("queens", Types.QUEEN, 950));
        
        // Mobility (captures count 1.5x)
        builder.addRule(SimpleRuleBuilder.mobility("knight_mob", Types.KNIGHT, 10, 1.5));
        builder.addRule(SimpleRuleBuilder.mobility("bishop_mob", Types.BISHOP, 10, 1.5));
        builder.addRule(SimpleRuleBuilder.mobility("rook_mob", Types.ROOK, 10, 1.5));
        builder.addRule(SimpleRuleBuilder.mobility("queen_mob", Types.QUEEN, 10, 1.5));
        
        // Piece coordination
        builder.addRule(SimpleRuleBuilder.defense("knight_def", Types.KNIGHT, 1, 15));
        builder.addRule(SimpleRuleBuilder.defense("bishop_def", Types.BISHOP, 1, 15));
        
        // Pawn structure
        builder.addRule(SimpleRuleBuilder.pawnAdvancement("pawn_adv", 15));
        
        // Castling
        builder.addRule(SimpleRuleBuilder.castlingBonus("castled", "has_castled", 60));
        
        // Check bonus
        builder.addRule(SimpleRuleBuilder.checkBonus("check", 40));
        
        // Category weights
        builder.setCategoryWeight("material", 1.0);
        builder.setCategoryWeight("mobility", 0.6);
        builder.setCategoryWeight("piece_coordination", 0.8);
        builder.setCategoryWeight("pawn_structure", 0.9);
        builder.setCategoryWeight("king_safety", 1.1);
        builder.setCategoryWeight("threats", 1.0);
        
        return builder.build();
    }
}

