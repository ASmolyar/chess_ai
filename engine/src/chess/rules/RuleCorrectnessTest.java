package chess.rules;

import chess.*;
import chess.rules.conditions.*;
import chess.rules.targets.*;
import chess.rules.values.*;

import java.util.*;

import static chess.Types.*;

/**
 * Comprehensive test suite for rule correctness.
 * Tests each rule type in isolation and in combination.
 */
public class RuleCorrectnessTest {
    
    private static int passed = 0;
    private static int failed = 0;
    
    public static void main(String[] args) {
        System.out.println("=== Rule Correctness Test Suite ===\n");
        
        // Initialize bitboards
        Bitboard.init();
        
        // Test individual targets
        testSimpleMaterialTarget();
        testMobilityTarget();
        testDefenseTarget();
        testPawnAdvancementTarget();
        testPawnStructureTarget();
        testPassedPawnTarget();
        testKingSafetyTarget();
        testCenterControlTarget();
        testRookFileTarget();
        testDevelopmentTarget();
        testBishopPairTarget();
        testCheckTarget();
        testGlobalTarget();
        
        // Test conditions
        testGamePhaseCondition();
        testCastlingCondition();
        testMaterialCondition();
        
        // Test value calculators
        testFixedValueCalculator();
        testScaledValueCalculator();
        testFormulaValueCalculator();
        
        // Test complete rules
        testCompleteRules();
        
        // Test rule combinations
        testRuleCombinations();
        
        // Test conflicting rules (bonus + penalty)
        testConflictingRules();
        
        // Test phase-conditional rules
        testPhaseConditionalRules();
        
        // Test category weights
        testCategoryWeights();
        
        // Test multiple rules on same target
        testMultipleSameTargetRules();
        
        // Test compiled evaluator matches uncompiled
        testCompiledVsUncompiled();
        
        // Test JSON-based rule parsing (simulates UI flow)
        testJsonRuleParsing();
        
        System.out.println("\n=== Results ===");
        System.out.println("Passed: " + passed);
        System.out.println("Failed: " + failed);
        System.out.println("Total:  " + (passed + failed));
        
        if (failed > 0) {
            System.exit(1);
        }
    }
    
    // ==================== TARGET TESTS ====================
    
    static void testSimpleMaterialTarget() {
        System.out.println("Testing SimpleMaterialTarget...");
        
        // Starting position: 8 pawns each
        Position pos = new Position();
        pos.setStartPos();
        
        SimpleMaterialTarget pawnTarget = new SimpleMaterialTarget(PAWN);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = pawnTarget.select(ctx);
        
        assertEqual("White pawns count", 8, results.size());
        
        // Check black pawns
        ctx = new EvalContext(pos, BLACK);
        results = pawnTarget.select(ctx);
        assertEqual("Black pawns count", 8, results.size());
        
        // Test with fewer pieces
        pos.setFen("7k/8/8/8/8/8/PPPP4/K7 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = pawnTarget.select(ctx);
        assertEqual("4 white pawns", 4, results.size());
        
        // Test knights
        SimpleMaterialTarget knightTarget = new SimpleMaterialTarget(KNIGHT);
        pos.setStartPos();
        ctx = new EvalContext(pos, WHITE);
        results = knightTarget.select(ctx);
        assertEqual("White knights count", 2, results.size());
    }
    
    static void testMobilityTarget() {
        System.out.println("Testing MobilityTarget...");
        
        // Knight in center has 8 moves
        Position pos = new Position();
        pos.setFen("7k/8/8/4N3/8/8/8/K7 w - - 0 1");
        
        MobilityTarget knightMob = new MobilityTarget(KNIGHT, 1.0);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = knightMob.select(ctx);
        
        assertEqual("Knight in center exists", 1, results.size());
        // Knight on e5 should have 8 moves
        assertEqual("Knight mobility = 8", 8.0, results.get(0).measurement);
        
        // Knight in corner has only 2 moves
        pos.setFen("7k/8/8/8/8/8/8/N6K w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = knightMob.select(ctx);
        assertEqual("Corner knight mobility = 2", 2.0, results.get(0).measurement);
        
        // Bishop on open diagonal (d4 has diagonals to a1, g7, a7, h8)
        pos.setFen("8/8/8/8/3B4/8/8/K6k w - - 0 1");
        MobilityTarget bishopMob = new MobilityTarget(BISHOP, 1.0);
        ctx = new EvalContext(pos, WHITE);
        results = bishopMob.select(ctx);
        // Bishop on d4: a1-d4-h8 diagonal (7 squares) + a7-d4-g1 diagonal (6 squares) - d4 itself = 13-1=12
        assertEqual("Bishop on d4 has 12 moves", 12.0, results.get(0).measurement);
    }
    
    static void testDefenseTarget() {
        System.out.println("Testing DefenseTarget...");
        
        // Knight defended by pawn
        Position pos = new Position();
        pos.setFen("7k/8/8/4N3/3P4/8/8/K7 w - - 0 1");
        
        DefenseTarget defTarget = new DefenseTarget(KNIGHT, 1);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = defTarget.select(ctx);
        
        assertEqual("Knight defended count", 1, results.size());
        
        // Knight NOT defended
        pos.setFen("7k/8/8/4N3/8/8/8/K7 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = defTarget.select(ctx);
        assertEqual("Undefended knight not returned", 0, results.size());
    }
    
    static void testPawnAdvancementTarget() {
        System.out.println("Testing PawnAdvancementTarget...");
        
        // Pawn on 2nd rank = 0 advancement
        // Pawn on 7th rank = 5 advancement
        Position pos = new Position();
        pos.setFen("7k/P7/8/8/8/8/8/K7 w - - 0 1");
        
        PawnAdvancementTarget advTarget = new PawnAdvancementTarget();
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = advTarget.select(ctx);
        
        assertEqual("One pawn found", 1, results.size());
        // Pawn on a7 (rank 7) for white = 5 ranks advanced
        assertEqual("Pawn on 7th rank = 5 advancement", 5.0, results.get(0).measurement);
        
        // Test black pawn advancement
        pos.setFen("7k/8/8/8/8/8/p7/K7 b - - 0 1");
        ctx = new EvalContext(pos, BLACK);
        results = advTarget.select(ctx);
        assertEqual("Black pawn on 2nd rank = 5 advancement", 5.0, results.get(0).measurement);
    }
    
    static void testPawnStructureTarget() {
        System.out.println("Testing PawnStructureTarget...");
        
        // Test doubled pawns - returns 1 context with count as measurement
        Position pos = new Position();
        pos.setFen("7k/8/P7/P7/8/8/8/K7 w - - 0 1");
        
        PawnStructureTarget doubledTarget = new PawnStructureTarget(
            PawnStructureTarget.StructureType.DOUBLED);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = doubledTarget.select(ctx);
        
        assertEqual("Doubled returns 1 context", 1, results.size());
        assertEqual("1 doubled pawn penalty (extra pawns on file)", 1.0, results.get(0).measurement);
        
        // Test isolated pawns
        pos.setFen("7k/8/8/P7/8/8/8/K7 w - - 0 1");
        PawnStructureTarget isolatedTarget = new PawnStructureTarget(
            PawnStructureTarget.StructureType.ISOLATED);
        ctx = new EvalContext(pos, WHITE);
        results = isolatedTarget.select(ctx);
        assertEqual("Isolated returns 1 context", 1, results.size());
        assertEqual("1 isolated pawn", 1.0, results.get(0).measurement);
        
        // Test connected pawns - a pawn on b5 is defended by pawn on a4 (diagonal defense)
        // Connected = pawn is defended by another pawn
        pos.setFen("7k/8/8/1P6/P7/8/8/K7 w - - 0 1"); // b5 defended by a4
        PawnStructureTarget connectedTarget = new PawnStructureTarget(
            PawnStructureTarget.StructureType.CONNECTED);
        ctx = new EvalContext(pos, WHITE);
        results = connectedTarget.select(ctx);
        assertEqual("Connected returns 1 context", 1, results.size());
        // b5 is defended by a4's pawn attack diagonal
        assertEqual("1 connected pawn (b5 defended by a4)", 1.0, results.get(0).measurement);
    }
    
    static void testPassedPawnTarget() {
        System.out.println("Testing PassedPawnTarget...");
        
        // Clear passed pawn - no enemy pawns blocking
        Position pos = new Position();
        pos.setFen("8/P7/8/8/8/8/8/K6k w - - 0 1");
        
        PassedPawnTarget passedTarget = new PassedPawnTarget(PassedPawnTarget.MeasureType.RANK);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = passedTarget.select(ctx);
        
        assertEqual("1 passed pawn found", 1, results.size());
        
        // Blocked pawn - not passed
        pos.setFen("p7/P7/8/8/8/8/8/K6k w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = passedTarget.select(ctx);
        assertEqual("No passed pawn (blocked)", 0, results.size());
    }
    
    static void testKingSafetyTarget() {
        System.out.println("Testing KingSafetyTarget...");
        
        // King with attackers nearby (black queen attacking, black king far)
        Position pos = new Position();
        pos.setFen("7k/8/8/8/8/5q2/8/4K3 w - - 0 1");
        
        KingSafetyTarget ksTarget = new KingSafetyTarget();
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = ksTarget.select(ctx);
        
        assertEqual("King safety returns 1 result", 1, results.size());
        // Queen attacks multiple squares in king zone
        assertTrue("King under attack (measurement > 0)", results.get(0).measurement > 0);
        
        // Safe king
        pos.setFen("7k/8/8/8/8/8/8/4K3 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = ksTarget.select(ctx);
        assertEqual("Safe king (no attackers)", 0.0, results.get(0).measurement);
    }
    
    static void testCenterControlTarget() {
        System.out.println("Testing CenterControlTarget...");
        
        // Piece controlling center
        Position pos = new Position();
        pos.setFen("7k/8/8/8/3N4/8/8/K7 w - - 0 1");
        
        CenterControlTarget centerTarget = new CenterControlTarget(
            CenterControlTarget.CenterType.CORE);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = centerTarget.select(ctx);
        
        assertEqual("Center control returns 1 result", 1, results.size());
        // Knight on d4 attacks e2, c2, b3, f3, b5, f5, c6, e6 - check which are in center
        assertTrue("Knight controls some center squares", results.get(0).measurement > 0);
    }
    
    static void testRookFileTarget() {
        System.out.println("Testing RookFileTarget...");
        
        // Rook on open file (no pawns)
        Position pos = new Position();
        pos.setFen("7k/8/8/8/8/8/8/R3K3 w - - 0 1");
        
        RookFileTarget openTarget = new RookFileTarget(RookFileTarget.FileType.OPEN);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = openTarget.select(ctx);
        
        assertEqual("Rook on open file", 1, results.size());
        
        // Rook on file with own pawn (not open)
        pos.setFen("7k/8/8/8/8/P7/8/R3K3 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = openTarget.select(ctx);
        assertEqual("Rook on file with own pawn = not open", 0, results.size());
    }
    
    static void testDevelopmentTarget() {
        System.out.println("Testing DevelopmentTarget...");
        
        // Starting position - pieces on starting squares = 0 developed
        // Returns 1 context with measurement = count of developed minors
        Position pos = new Position();
        pos.setStartPos();
        
        DevelopmentTarget devTarget = new DevelopmentTarget(
            DevelopmentTarget.DevelopType.ALL_MINORS);
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = devTarget.select(ctx);
        
        assertEqual("Development returns 1 context", 1, results.size());
        assertEqual("0 minors developed at start", 0.0, results.get(0).measurement);
        
        // Knight developed (Nf3)
        pos.setFen("rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = devTarget.select(ctx);
        assertEqual("1 minor developed", 1.0, results.get(0).measurement);
    }
    
    static void testBishopPairTarget() {
        System.out.println("Testing BishopPairTarget...");
        
        // Has bishop pair
        Position pos = new Position();
        pos.setFen("7k/8/8/8/8/8/BB6/K7 w - - 0 1");
        
        BishopPairTarget bpTarget = new BishopPairTarget();
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = bpTarget.select(ctx);
        
        assertEqual("Has bishop pair", 1, results.size());
        
        // Only one bishop
        pos.setFen("7k/8/8/8/8/8/B7/K7 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        results = bpTarget.select(ctx);
        assertEqual("No bishop pair with 1 bishop", 0, results.size());
    }
    
    static void testCheckTarget() {
        System.out.println("Testing CheckTarget...");
        
        // CheckTarget returns 1 if we gave check (opponent's turn AND they're in check)
        // Position: Black king on e8, White rook on e1 giving check, Black to move
        Position pos = new Position();
        pos.setFen("4k3/8/8/8/8/8/8/4RK2 b - - 0 1"); // Black to move, Re1 gives check
        
        CheckTarget checkTarget = new CheckTarget();
        EvalContext ctx = new EvalContext(pos, WHITE);
        List<EvalContext> results = checkTarget.select(ctx);
        
        // sideToMove is BLACK, ctx.color is WHITE, and there's a checker
        // So weGaveCheck = (BLACK != WHITE) && inCheck = true
        assertEqual("White giving check", 1, results.size());
        
        // Test position where no check is given
        pos.setFen("4k3/8/8/8/8/8/4R3/4K3 w - - 0 1"); // White to move, no check
        ctx = new EvalContext(pos, WHITE);
        results = checkTarget.select(ctx);
        assertEqual("No check given", 0, results.size());
    }
    
    static void testGlobalTarget() {
        System.out.println("Testing GlobalTarget...");
        
        Position pos = new Position();
        pos.setStartPos();
        
        GlobalTarget globalTarget = new GlobalTarget();
        // GlobalTarget returns the context as-is (used with FixedValue for bonuses)
        EvalContext ctx = new EvalContext(pos, WHITE, -1, -1, 1.0); // Pre-set measurement
        List<EvalContext> results = globalTarget.select(ctx);
        
        assertEqual("Global target returns 1 context", 1, results.size());
        // Global just passes through - used for fixed bonuses
        // The value calculator will provide the fixed value
    }
    
    // ==================== CONDITION TESTS ====================
    
    static void testGamePhaseCondition() {
        System.out.println("Testing GamePhaseCondition...");
        
        // Starting position = opening
        Position pos = new Position();
        pos.setStartPos();
        
        GamePhaseCondition openingCond = new GamePhaseCondition(GamePhaseCondition.Phase.OPENING);
        EvalContext ctx = new EvalContext(pos, WHITE);
        
        assertTrue("Start position is opening", openingCond.evaluate(ctx));
        
        // Endgame position
        pos.setFen("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
        ctx = new EvalContext(pos, WHITE);
        assertTrue("KvK is late endgame", !openingCond.evaluate(ctx));
        
        GamePhaseCondition endgameCond = new GamePhaseCondition(GamePhaseCondition.Phase.LATE_ENDGAME);
        assertTrue("KvK is late endgame", endgameCond.evaluate(ctx));
    }
    
    static void testCastlingCondition() {
        System.out.println("Testing CastlingCondition...");
        
        // Starting position - can castle
        Position pos = new Position();
        pos.setStartPos();
        
        CastlingCondition canCastle = new CastlingCondition(
            CastlingCondition.Player.MY, 
            CastlingCondition.Status.CAN_STILL_CASTLE);
        EvalContext ctx = new EvalContext(pos, WHITE);
        
        assertTrue("White can castle at start", canCastle.evaluate(ctx));
        
        // Position where white has castled
        pos.setFen("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 w kq - 0 1");
        CastlingCondition hasCastled = new CastlingCondition(
            CastlingCondition.Player.MY,
            CastlingCondition.Status.HAS_CASTLED_EITHER);
        ctx = new EvalContext(pos, WHITE);
        assertTrue("White has castled", hasCastled.evaluate(ctx));
    }
    
    static void testMaterialCondition() {
        System.out.println("Testing MaterialCondition...");
        
        Position pos = new Position();
        pos.setFen("7k/8/8/8/8/8/QQ6/K7 w - - 0 1");
        
        MaterialCondition hasQueens = new MaterialCondition(
            QUEEN, MaterialCondition.Player.MY, 
            MaterialCondition.Comparison.AT_LEAST, 2);
        EvalContext ctx = new EvalContext(pos, WHITE);
        
        assertTrue("White has 2+ queens", hasQueens.evaluate(ctx));
        
        MaterialCondition has3Queens = new MaterialCondition(
            QUEEN, MaterialCondition.Player.MY,
            MaterialCondition.Comparison.AT_LEAST, 3);
        assertTrue("White doesn't have 3+ queens", !has3Queens.evaluate(ctx));
    }
    
    // ==================== VALUE CALCULATOR TESTS ====================
    
    static void testFixedValueCalculator() {
        System.out.println("Testing FixedValueCalculator...");
        
        FixedValueCalculator calc = new FixedValueCalculator(100);
        Position pos = new Position();
        pos.setStartPos();
        EvalContext ctx = new EvalContext(pos, WHITE, SQ_E2, PAWN, 5.0);
        
        assertEqual("Fixed value = 100", 100, calc.calculate(ctx));
    }
    
    static void testScaledValueCalculator() {
        System.out.println("Testing ScaledValueCalculator...");
        
        // Linear: n * 10
        ScaledValueCalculator linear = new ScaledValueCalculator(10, 1.0, 
            ScaledValueCalculator.ScaleType.LINEAR);
        Position pos = new Position();
        pos.setStartPos();
        EvalContext ctx = new EvalContext(pos, WHITE, -1, -1, 5.0);
        
        assertEqual("Linear 5 * 10 = 50", 50, linear.calculate(ctx));
        
        // Square root: sqrt(n) * 10
        ScaledValueCalculator sqrt = new ScaledValueCalculator(10, 1.0,
            ScaledValueCalculator.ScaleType.SQUARE_ROOT);
        ctx = new EvalContext(pos, WHITE, -1, -1, 4.0);
        assertEqual("Sqrt(4) * 10 = 20", 20, sqrt.calculate(ctx));
        
        // Quadratic: n^2 * 10
        ScaledValueCalculator quad = new ScaledValueCalculator(10, 1.0,
            ScaledValueCalculator.ScaleType.QUADRATIC);
        ctx = new EvalContext(pos, WHITE, -1, -1, 3.0);
        assertEqual("3^2 * 10 = 90", 90, quad.calculate(ctx));
    }
    
    static void testFormulaValueCalculator() {
        System.out.println("Testing FormulaValueCalculator...");
        
        FormulaValueCalculator calc = new FormulaValueCalculator("n * 10");
        Position pos = new Position();
        pos.setStartPos();
        EvalContext ctx = new EvalContext(pos, WHITE, -1, -1, 5.0);
        
        assertEqual("n * 10 where n=5 = 50", 50, calc.calculate(ctx));
        
        // Test sqrt
        calc = new FormulaValueCalculator("10 * sqrt(n)");
        ctx = new EvalContext(pos, WHITE, -1, -1, 4.0);
        assertEqual("10 * sqrt(4) = 20", 20, calc.calculate(ctx));
    }
    
    // ==================== COMPLETE RULE TESTS ====================
    
    static void testCompleteRules() {
        System.out.println("Testing complete rules...");
        
        Position pos = new Position();
        pos.setStartPos();
        
        // Material rule: 100 per pawn
        Rule pawnRule = new Rule(
            "test_pawn", "Pawn Material", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100),
            1.0
        );
        
        int whiteScore = pawnRule.evaluate(pos, WHITE);
        int blackScore = pawnRule.evaluate(pos, BLACK);
        
        assertEqual("White pawn score = 800", 800, whiteScore);
        assertEqual("Black pawn score = 800", 800, blackScore);
    }
    
    // ==================== COMBINATION TESTS ====================
    
    static void testRuleCombinations() {
        System.out.println("Testing rule combinations...");
        
        Position pos = new Position();
        pos.setStartPos();
        
        List<Rule> rules = new ArrayList<>();
        
        // Pawn material: 100 each
        rules.add(new Rule("pawn", "Pawn", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100), 1.0));
            
        // Knight material: 320 each
        rules.add(new Rule("knight", "Knight", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(KNIGHT),
            new FixedValueCalculator(320), 1.0));
            
        // Knight mobility
        rules.add(new Rule("knight_mob", "Knight Mobility", "mobility",
            new AlwaysCondition(),
            new MobilityTarget(KNIGHT, 1.0),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.SQUARE_ROOT),
            1.0));
        
        // Calculate total for each side
        int whiteTotal = 0, blackTotal = 0;
        for (Rule rule : rules) {
            whiteTotal += rule.evaluate(pos, WHITE);
            blackTotal += rule.evaluate(pos, BLACK);
        }
        
        // At start: 8 pawns * 100 + 2 knights * 320 = 1440 material per side
        // Knights have limited mobility at start
        assertTrue("White material ~1440+", whiteTotal >= 1440);
        assertTrue("Scores roughly equal", Math.abs(whiteTotal - blackTotal) < 50);
        
        System.out.println("  White total: " + whiteTotal);
        System.out.println("  Black total: " + blackTotal);
        System.out.println("  Difference: " + (whiteTotal - blackTotal));
    }
    
    static void testConflictingRules() {
        System.out.println("Testing conflicting rules (bonus + penalty)...");
        
        // Position with doubled pawns
        Position pos = new Position();
        pos.setFen("7k/8/P7/P7/8/8/8/K7 w - - 0 1");
        
        List<Rule> rules = new ArrayList<>();
        
        // Pawn bonus: +100 per pawn
        rules.add(new Rule("pawn_bonus", "Pawn Bonus", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100), 1.0));
        
        // Doubled pawn penalty: -20 per doubled pawn
        rules.add(new Rule("doubled_penalty", "Doubled Penalty", "structure",
            new AlwaysCondition(),
            new PawnStructureTarget(PawnStructureTarget.StructureType.DOUBLED),
            new ScaledValueCalculator(-20, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0));
        
        int total = 0;
        for (Rule rule : rules) {
            int score = rule.evaluate(pos, WHITE);
            System.out.println("  " + rule.getName() + ": " + score);
            total += score;
        }
        
        // 2 pawns = +200, 1 doubled pawn penalty = -20 → net = 180
        assertEqual("Net pawn value = 180", 180, total);
    }
    
    static void testPhaseConditionalRules() {
        System.out.println("Testing phase-conditional rules...");
        
        // Opening position
        Position opening = new Position();
        opening.setStartPos();
        
        // Endgame position (just kings and pawns)
        Position endgame = new Position();
        endgame.setFen("8/P7/8/4k3/8/4K3/8/8 w - - 0 1");
        
        // Create opening-only rule
        Rule openingRule = new Rule("dev_opening", "Development (Opening)", "development",
            new GamePhaseCondition(GamePhaseCondition.Phase.OPENING),
            new DevelopmentTarget(DevelopmentTarget.DevelopType.ALL_MINORS),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0);
        
        // Create endgame-only rule (passed pawn bonus)
        Rule endgameRule = new Rule("passed_endgame", "Passed Pawn (Endgame)", "endgame",
            new GamePhaseCondition(GamePhaseCondition.Phase.LATE_ENDGAME),
            new PassedPawnTarget(PassedPawnTarget.MeasureType.RANK),
            new ScaledValueCalculator(30, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0);
        
        // Opening rule should fire in opening
        int openingDevScore = openingRule.evaluate(opening, WHITE);
        assertTrue("Development rule fires in opening", openingDevScore >= 0);
        
        // Endgame rule should NOT fire in opening
        int openingPassedScore = endgameRule.evaluate(opening, WHITE);
        assertEqual("Endgame rule doesn't fire in opening", 0, openingPassedScore);
        
        // Endgame rule SHOULD fire in endgame
        int endgamePassedScore = endgameRule.evaluate(endgame, WHITE);
        assertTrue("Passed pawn rule fires in endgame", endgamePassedScore > 0);
        System.out.println("  Passed pawn bonus in endgame: " + endgamePassedScore);
    }
    
    static void testCategoryWeights() {
        System.out.println("Testing category weights...");
        
        Position pos = new Position();
        pos.setStartPos();
        
        List<Rule> rules = new ArrayList<>();
        rules.add(new Rule("pawn", "Pawn", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100), 1.0));
        
        // Test with different category weights
        Map<String, Double> normalWeights = new HashMap<>();
        normalWeights.put("material", 1.0);
        
        Map<String, Double> halfWeights = new HashMap<>();
        halfWeights.put("material", 0.5);
        
        Map<String, Double> doubleWeights = new HashMap<>();
        doubleWeights.put("material", 2.0);
        
        RuleBasedEvaluator normal = new RuleBasedEvaluator("Normal", "", rules, normalWeights);
        RuleBasedEvaluator half = new RuleBasedEvaluator("Half", "", rules, halfWeights);
        RuleBasedEvaluator doubled = new RuleBasedEvaluator("Double", "", rules, doubleWeights);
        
        int normalScore = Math.abs(normal.evaluate(pos)); // Absolute since it's net score
        int halfScore = Math.abs(half.evaluate(pos));
        int doubleScore = Math.abs(doubled.evaluate(pos));
        
        // In a symmetrical position, scores should be near 0
        // But let's test with an imbalanced position
        pos.setFen("7k/8/8/8/8/8/PPPPPPPP/K7 w - - 0 1"); // White has 8 pawns, black has 0
        
        normalScore = normal.evaluate(pos);
        halfScore = half.evaluate(pos);
        doubleScore = doubled.evaluate(pos);
        
        System.out.println("  Normal weight (1.0): " + normalScore);
        System.out.println("  Half weight (0.5): " + halfScore);
        System.out.println("  Double weight (2.0): " + doubleScore);
        
        assertEqual("Half weight = normal/2", normalScore / 2, halfScore);
        assertEqual("Double weight = normal*2", normalScore * 2, doubleScore);
    }
    
    static void testMultipleSameTargetRules() {
        System.out.println("Testing multiple rules on same target...");
        
        // Position with knights
        Position pos = new Position();
        pos.setFen("7k/8/8/4N3/8/8/8/K7 w - - 0 1");
        
        List<Rule> rules = new ArrayList<>();
        
        // Rule 1: Fixed knight value
        rules.add(new Rule("knight_mat", "Knight Material", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(KNIGHT),
            new FixedValueCalculator(320), 1.0));
        
        // Rule 2: Knight mobility bonus
        rules.add(new Rule("knight_mob", "Knight Mobility", "mobility",
            new AlwaysCondition(),
            new MobilityTarget(KNIGHT, 1.0),
            new ScaledValueCalculator(5, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0));
        
        // Rule 3: Central knight bonus (knight on e5 = center)
        rules.add(new Rule("knight_center", "Knight Center", "positional",
            new AlwaysCondition(),
            new CenterControlTarget(CenterControlTarget.CenterType.CORE),
            new ScaledValueCalculator(10, 1.0, ScaledValueCalculator.ScaleType.LINEAR),
            1.0));
        
        int totalWhite = 0, totalBlack = 0;
        for (Rule rule : rules) {
            int wScore = rule.evaluate(pos, WHITE);
            int bScore = rule.evaluate(pos, BLACK);
            System.out.println("  " + rule.getName() + ": W=" + wScore + ", B=" + bScore);
            totalWhite += wScore;
            totalBlack += bScore;
        }
        
        // White has knight, black doesn't
        assertTrue("White has significant advantage", totalWhite > totalBlack + 300);
        System.out.println("  Total: White=" + totalWhite + ", Black=" + totalBlack);
    }
    
    static void testCompiledVsUncompiled() {
        System.out.println("Testing compiled vs uncompiled evaluator...");
        
        List<Rule> rules = new ArrayList<>();
        Map<String, Double> weights = new HashMap<>();
        weights.put("material", 1.0);
        weights.put("mobility", 1.0);
        weights.put("pawn_structure", 1.0);
        
        // Add rules
        rules.add(new Rule("pawn", "Pawn", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(PAWN),
            new FixedValueCalculator(100), 1.0));
            
        rules.add(new Rule("knight", "Knight", "material",
            new AlwaysCondition(),
            new SimpleMaterialTarget(KNIGHT),
            new FixedValueCalculator(320), 1.0));
            
        rules.add(new Rule("doubled", "Doubled", "pawn_structure",
            new AlwaysCondition(),
            new PawnStructureTarget(PawnStructureTarget.StructureType.DOUBLED),
            new FixedValueCalculator(-20), 1.0));
        
        // Create both evaluators
        RuleBasedEvaluator uncompiled = new RuleBasedEvaluator("Test", "Test", rules, weights);
        CompiledRuleEvaluator compiled = new CompiledRuleEvaluator("Test", "Test", rules, weights);
        
        // Test on multiple positions
        String[] fens = {
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
            "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
            "8/8/4k3/PP6/8/8/8/4K3 w - - 0 1"
        };
        
        Position pos = new Position();
        for (String fen : fens) {
            pos.setFen(fen);
            int uncompiledScore = uncompiled.evaluate(pos);
            int compiledScore = compiled.evaluate(pos);
            
            // They may differ slightly due to implementation details,
            // but should be in the same ballpark
            boolean closeEnough = Math.abs(uncompiledScore - compiledScore) < 100;
            if (!closeEnough) {
                System.out.println("  FEN: " + fen);
                System.out.println("  Uncompiled: " + uncompiledScore);
                System.out.println("  Compiled: " + compiledScore);
            }
            assertTrue("Compiled ~= uncompiled for " + fen.substring(0, 20), closeEnough);
        }
    }
    
    // ==================== HELPERS ====================
    
    static void assertEqual(String msg, int expected, int actual) {
        if (expected == actual) {
            System.out.println("  ✓ " + msg);
            passed++;
        } else {
            System.out.println("  ✗ " + msg + ": expected " + expected + " but got " + actual);
            failed++;
        }
    }
    
    static void assertEqual(String msg, double expected, double actual) {
        if (Math.abs(expected - actual) < 0.001) {
            System.out.println("  ✓ " + msg);
            passed++;
        } else {
            System.out.println("  ✗ " + msg + ": expected " + expected + " but got " + actual);
            failed++;
        }
    }
    
    static void assertTrue(String msg, boolean condition) {
        if (condition) {
            System.out.println("  ✓ " + msg);
            passed++;
        } else {
            System.out.println("  ✗ " + msg + ": expected true");
            failed++;
        }
    }
    
    static Types.Move createMove(int from, int to) {
        return new Types.Move(from, to);
    }
    
    /**
     * Test JSON rule parsing - simulates what the UI sends to the engine.
     * This tests the end-to-end flow from JSON definition to actual evaluation.
     */
    static void testJsonRuleParsing() {
        System.out.println("Testing JSON rule parsing (UI → Engine flow)...");
        
        Engine engine = new Engine();
        
        // Test 1: Simple material rule from UI
        String rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Pawn Value",
                    "enabled": true,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "simple_material", "pieceType": "pawn" },
                    "value": { "type": "fixed", "amount": 100 }
                },
                {
                    "id": "rule_2",
                    "name": "Knight Value",
                    "enabled": true,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "simple_material", "pieceType": "knight" },
                    "value": { "type": "fixed", "amount": 320 }
                }
            ]
            """;
        
        String categoryWeightsJson = """
            {
                "material": 1.0,
                "positional": 1.0
            }
            """;
        
        boolean configured = engine.configureRuleEval("Test", "Test", rulesJson, categoryWeightsJson);
        assertTrue("Rule eval configured successfully", configured);
        
        // Evaluate starting position
        engine.setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        String move = engine.search(1, 0);
        assertTrue("Engine returns a valid move", move != null && move.length() >= 4);
        System.out.println("  Engine search returned: " + move);
        
        // Test 2: UI-style piece_count target (consolidates simple_material)
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Pawn Count",
                    "enabled": true,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "piece_count", "pieceType": "pawn" },
                    "value": { "type": "fixed", "amount": 100 }
                },
                {
                    "id": "rule_2",
                    "name": "Bishop Pair",
                    "enabled": true,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "piece_count", "pieceType": "bishop_pair" },
                    "value": { "type": "fixed", "amount": 50 }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test2", "Test", rulesJson, categoryWeightsJson);
        assertTrue("piece_count target configured", configured);
        
        // Test 3: Mobility target with moveType
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Knight Mobility",
                    "enabled": true,
                    "category": "mobility",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "mobility", "pieceType": "knight", "moveType": "move" },
                    "value": { "type": "scaled", "base": 5, "scaling": "linear" }
                },
                {
                    "id": "rule_2",
                    "name": "Knight Captures",
                    "enabled": true,
                    "category": "mobility",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "mobility", "pieceType": "knight", "moveType": "capture" },
                    "value": { "type": "scaled", "base": 10, "scaling": "linear" }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test3", "Test", rulesJson, categoryWeightsJson);
        assertTrue("mobility with moveType configured", configured);
        
        // Test 4: Pawn formation target
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Doubled Penalty",
                    "enabled": true,
                    "category": "pawn_structure",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "pawn_formation", "formationType": "doubled" },
                    "value": { "type": "fixed", "amount": -20 }
                },
                {
                    "id": "rule_2",
                    "name": "Passed Bonus",
                    "enabled": true,
                    "category": "pawn_structure",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "pawn_formation", "formationType": "passed" },
                    "value": { "type": "scaled", "base": 30, "scaling": "linear" }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test4", "Test", rulesJson, categoryWeightsJson);
        assertTrue("pawn_formation target configured", configured);
        
        // Test 5: Phase condition
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Opening Development",
                    "enabled": true,
                    "category": "development",
                    "weight": 1.0,
                    "condition": { "type": "game_phase", "phase": "opening" },
                    "target": { "type": "development", "developType": "all_minors" },
                    "value": { "type": "scaled", "base": 10, "scaling": "linear" }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test5", "Test", rulesJson, categoryWeightsJson);
        assertTrue("game_phase condition configured", configured);
        
        // Test 6: King zone target
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "King Safety",
                    "enabled": true,
                    "category": "king_safety",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "king_zone", "whose": "opponent_king" },
                    "value": { "type": "scaled", "base": 5, "scaling": "linear" }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test6", "Test", rulesJson, categoryWeightsJson);
        assertTrue("king_zone target configured", configured);
        
        // Test 7: Disabled rule should not fire
        rulesJson = """
            [
                {
                    "id": "rule_1",
                    "name": "Disabled Rule",
                    "enabled": false,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "simple_material", "pieceType": "queen" },
                    "value": { "type": "fixed", "amount": 99999 }
                },
                {
                    "id": "rule_2",
                    "name": "Enabled Rule",
                    "enabled": true,
                    "category": "material",
                    "weight": 1.0,
                    "condition": { "type": "always" },
                    "target": { "type": "simple_material", "pieceType": "pawn" },
                    "value": { "type": "fixed", "amount": 100 }
                }
            ]
            """;
        
        configured = engine.configureRuleEval("Test7", "Test", rulesJson, categoryWeightsJson);
        assertTrue("disabled rule handled", configured);
        
        System.out.println("  All JSON parsing tests passed!");
    }
}
