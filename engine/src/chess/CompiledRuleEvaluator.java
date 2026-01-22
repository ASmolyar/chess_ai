package chess;

import chess.rules.*;
import chess.rules.conditions.*;
import chess.rules.targets.*;
import chess.rules.values.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Optimized rule-based evaluator that compiles rules for efficient execution.
 * 
 * Key optimizations:
 * 1. Pre-computes shared data (attack maps, piece positions) once per evaluation
 * 2. Eliminates object allocation during evaluation
 * 3. Batches rules by target type for single-pass evaluation
 * 4. Inlines simple rules directly
 */
public class CompiledRuleEvaluator implements Evaluator {
    
    private final String name;
    private final String description;
    private final Map<String, Double> categoryWeights;
    
    // Compiled rule groups - rules are pre-sorted by what they need
    private final List<CompiledMaterialRule> materialRules = new ArrayList<>();
    private final List<CompiledMobilityRule> mobilityRules = new ArrayList<>();
    private final List<CompiledDefenseRule> defenseRules = new ArrayList<>();
    private final List<CompiledPawnRule> pawnRules = new ArrayList<>();
    private final List<CompiledGlobalRule> globalRules = new ArrayList<>();
    private final List<CompiledKingSafetyRule> kingSafetyRules = new ArrayList<>();
    private final List<CompiledCenterRule> centerRules = new ArrayList<>();
    private final List<CompiledRookRule> rookRules = new ArrayList<>();
    private final List<CompiledDevelopmentRule> developmentRules = new ArrayList<>();
    private final List<CompiledPSTRule> pstRules = new ArrayList<>(); // Piece-square table rules
    private final List<Rule> fallbackRules = new ArrayList<>(); // Rules that can't be compiled
    
    // Reusable evaluation context - NO allocations during eval
    private final EvalData evalData = new EvalData();
    
    // Default piece values
    private static final int[] DEFAULT_PIECE_VALUES = {0, 100, 320, 330, 500, 900, 0};
    
    /**
     * Pre-computed evaluation data - reused across all rule evaluations.
     * This eliminates millions of object allocations per search.
     */
    private static class EvalData {
        // Position reference
        Position pos;
        
        // Piece bitboards by [color][pieceType]
        long[][] pieces = new long[2][7];
        long[] allPieces = new long[2];
        long occupied;
        
        // Attack maps by [color][pieceType] - computed lazily
        long[][] attacks = new long[2][7];
        long[] allAttacks = new long[2];
        boolean[] attacksComputed = new boolean[2];
        
        // King data
        int[] kingSquare = new int[2];
        long[] kingZone = new long[2];
        
        // Pawn structure data
        long[] passedPawns = new long[2];
        long[] doubledPawns = new long[2];
        long[] isolatedPawns = new long[2];
        long[] connectedPawns = new long[2];
        boolean pawnStructureComputed = false;
        
        // Category accumulators
        Map<String, Integer> categoryScores = new HashMap<>();
        
        // Game phase (cached)
        int gamePhase = -1; // 0=opening, 1=middlegame, 2=endgame, 3=late endgame
        
        void init(Position pos) {
            this.pos = pos;
            this.occupied = pos.pieces();
            
            // Initialize piece bitboards
            for (int c = 0; c < 2; c++) {
                allPieces[c] = pos.pieces(c);
                for (int pt = PAWN; pt <= KING; pt++) {
                    pieces[c][pt] = pos.pieces(c, pt);
                }
                kingSquare[c] = pos.kingSquare(c);
                kingZone[c] = kingAttacks(kingSquare[c]) | (1L << kingSquare[c]);
                attacksComputed[c] = false;
            }
            
            pawnStructureComputed = false;
            gamePhase = -1;
            categoryScores.clear();
        }
        
        void computeAttacks(int color) {
            if (attacksComputed[color]) return;
            
            allAttacks[color] = 0L;
            
            // Pawn attacks
            long pawns = pieces[color][PAWN];
            attacks[color][PAWN] = 0L;
            if (color == WHITE) {
                attacks[color][PAWN] = ((pawns & ~FILE_A) << 7) | ((pawns & ~FILE_H) << 9);
            } else {
                attacks[color][PAWN] = ((pawns & ~FILE_A) >>> 9) | ((pawns & ~FILE_H) >>> 7);
            }
            allAttacks[color] |= attacks[color][PAWN];
            
            // Knight attacks
            attacks[color][KNIGHT] = 0L;
            long knights = pieces[color][KNIGHT];
            long[] knightsArr = {knights};
            while (knightsArr[0] != 0) {
                int sq = popLsb(knightsArr);
                attacks[color][KNIGHT] |= knightAttacks(sq);
            }
            allAttacks[color] |= attacks[color][KNIGHT];
            
            // Bishop attacks
            attacks[color][BISHOP] = 0L;
            long bishops = pieces[color][BISHOP];
            long[] bishopsArr = {bishops};
            while (bishopsArr[0] != 0) {
                int sq = popLsb(bishopsArr);
                attacks[color][BISHOP] |= bishopAttacks(sq, occupied);
            }
            allAttacks[color] |= attacks[color][BISHOP];
            
            // Rook attacks
            attacks[color][ROOK] = 0L;
            long rooks = pieces[color][ROOK];
            long[] rooksArr = {rooks};
            while (rooksArr[0] != 0) {
                int sq = popLsb(rooksArr);
                attacks[color][ROOK] |= rookAttacks(sq, occupied);
            }
            allAttacks[color] |= attacks[color][ROOK];
            
            // Queen attacks
            attacks[color][QUEEN] = 0L;
            long queens = pieces[color][QUEEN];
            long[] queensArr = {queens};
            while (queensArr[0] != 0) {
                int sq = popLsb(queensArr);
                attacks[color][QUEEN] |= queenAttacks(sq, occupied);
            }
            allAttacks[color] |= attacks[color][QUEEN];
            
            // King attacks
            attacks[color][KING] = kingAttacks(kingSquare[color]);
            allAttacks[color] |= attacks[color][KING];
            
            attacksComputed[color] = true;
        }
        
        void computePawnStructure() {
            if (pawnStructureComputed) return;
            
            for (int c = 0; c < 2; c++) {
                long pawns = pieces[c][PAWN];
                long enemyPawns = pieces[opposite(c)][PAWN];
                
                passedPawns[c] = 0L;
                doubledPawns[c] = 0L;
                isolatedPawns[c] = 0L;
                connectedPawns[c] = 0L;
                
                long[] pawnsArr = {pawns};
                while (pawnsArr[0] != 0) {
                    int sq = popLsb(pawnsArr);
                    int file = fileOf(sq);
                    int rank = rankOf(sq);
                    
                    long fileMask = FILE_A << file;
                    long adjFiles = ((FILE_A << (file - 1)) & ~FILE_H) | ((FILE_A << (file + 1)) & ~FILE_A);
                    
                    // Passed pawn check
                    long passedMask;
                    if (c == WHITE) {
                        passedMask = (fileMask | adjFiles) & ~((1L << (sq + 1)) - 1);
                    } else {
                        passedMask = (fileMask | adjFiles) & ((1L << sq) - 1);
                    }
                    if ((enemyPawns & passedMask) == 0) {
                        passedPawns[c] |= (1L << sq);
                    }
                    
                    // Doubled pawn check
                    if ((pawns & fileMask & ~(1L << sq)) != 0) {
                        doubledPawns[c] |= (1L << sq);
                    }
                    
                    // Isolated pawn check
                    if ((pawns & adjFiles) == 0) {
                        isolatedPawns[c] |= (1L << sq);
                    }
                    
                    // Connected pawn check
                    long neighbors = adjFiles & (RANK_1 << (rank * 8));
                    if ((pawns & neighbors) != 0) {
                        connectedPawns[c] |= (1L << sq);
                    }
                }
            }
            
            pawnStructureComputed = true;
        }
        
        int getGamePhase() {
            if (gamePhase >= 0) return gamePhase;
            
            int totalMaterial = 0;
            for (int c = 0; c < 2; c++) {
                totalMaterial += popcount(pieces[c][KNIGHT]) * 3;
                totalMaterial += popcount(pieces[c][BISHOP]) * 3;
                totalMaterial += popcount(pieces[c][ROOK]) * 5;
                totalMaterial += popcount(pieces[c][QUEEN]) * 9;
            }
            
            if (totalMaterial >= 50) {
                gamePhase = 0; // Opening
            } else if (totalMaterial >= 30) {
                gamePhase = 1; // Middlegame
            } else if (totalMaterial >= 10) {
                gamePhase = 2; // Endgame
            } else {
                gamePhase = 3; // Late endgame
            }
            
            return gamePhase;
        }
        
        void addScore(String category, int score) {
            categoryScores.put(category, categoryScores.getOrDefault(category, 0) + score);
        }
    }
    
    // Compiled rule types - minimal overhead per rule
    
    private static class CompiledMaterialRule {
        final int pieceType;
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledMaterialRule(int pieceType, int value, String category, double weight) {
            this.pieceType = pieceType;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledMobilityRule {
        final int pieceType;
        final int baseValue;
        final double captureWeight;
        final double multiplier;
        final int scaleType; // 0=linear, 1=sqrt, 2=quadratic
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledMobilityRule(int pieceType, int baseValue, double captureWeight, 
                            double multiplier, int scaleType, String category, double weight) {
            this.pieceType = pieceType;
            this.baseValue = baseValue;
            this.captureWeight = captureWeight;
            this.multiplier = multiplier;
            this.scaleType = scaleType;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledDefenseRule {
        final int pieceType;
        final int minDefenders;
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledDefenseRule(int pieceType, int minDefenders, int value, 
                           String category, double weight) {
            this.pieceType = pieceType;
            this.minDefenders = minDefenders;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledPawnRule {
        final int type; // 0=advancement, 1=passed, 2=doubled, 3=isolated, 4=connected
        final int value;
        final int scaleType;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledPawnRule(int type, int value, int scaleType, String category, double weight) {
            this.type = type;
            this.value = value;
            this.scaleType = scaleType;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledGlobalRule {
        final Condition condition;
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledGlobalRule(Condition condition, int value, String category, double weight) {
            this.condition = condition;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledKingSafetyRule {
        final int value; // Typically negative (penalty per attack)
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledKingSafetyRule(int value, String category, double weight) {
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledCenterRule {
        final int centerType; // 0=core (d4,d5,e4,e5), 1=extended
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledCenterRule(int centerType, int value, String category, double weight) {
            this.centerType = centerType;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledRookRule {
        final int fileType; // 0=open, 1=semi-open, 2=quality
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledRookRule(int fileType, int value, String category, double weight) {
            this.fileType = fileType;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledDevelopmentRule {
        final int type; // 0=all_minors, 1=fianchetto, 2=central_knights
        final int value;
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledDevelopmentRule(int type, int value, String category, double weight) {
            this.type = type;
            this.value = value;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    private static class CompiledPSTRule {
        final int pieceType;
        final int[] table; // 64 values for each square
        final String category;
        final double weight;
        boolean enabled;
        
        CompiledPSTRule(int pieceType, int[] table, String category, double weight) {
            this.pieceType = pieceType;
            this.table = table;
            this.category = category;
            this.weight = weight;
            this.enabled = true;
        }
    }
    
    /**
     * Create a compiled evaluator from a list of rules.
     */
    public CompiledRuleEvaluator(String name, String description, 
                                  List<Rule> rules, 
                                  Map<String, Double> categoryWeights) {
        this.name = name;
        this.description = description;
        this.categoryWeights = new HashMap<>(categoryWeights);
        
        // Compile each rule into optimized form
        for (Rule rule : rules) {
            if (!rule.isEnabled()) continue;
            compileRule(rule);
        }
    }
    
    /**
     * Compile a rule into an optimized form, or add to fallback list.
     */
    private void compileRule(Rule rule) {
        // Use reflection or instanceof to determine rule structure
        // This is called once at load time, so reflection is acceptable
        
        try {
            // Get target and value via reflection since they're private
            java.lang.reflect.Field targetField = Rule.class.getDeclaredField("target");
            java.lang.reflect.Field valueField = Rule.class.getDeclaredField("value");
            java.lang.reflect.Field conditionField = Rule.class.getDeclaredField("condition");
            targetField.setAccessible(true);
            valueField.setAccessible(true);
            conditionField.setAccessible(true);
            
            Target target = (Target) targetField.get(rule);
            ValueCalculator value = (ValueCalculator) valueField.get(rule);
            Condition condition = (Condition) conditionField.get(rule);
            
            String category = rule.getCategory();
            double weight = rule.getWeight();
            
            // Try to compile based on target type
            if (target instanceof SimpleMaterialTarget) {
                SimpleMaterialTarget smt = (SimpleMaterialTarget) target;
                java.lang.reflect.Field ptField = SimpleMaterialTarget.class.getDeclaredField("pieceType");
                ptField.setAccessible(true);
                int pieceType = (Integer) ptField.get(smt);
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    materialRules.add(new CompiledMaterialRule(pieceType, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof MobilityTarget) {
                MobilityTarget mt = (MobilityTarget) target;
                java.lang.reflect.Field ptField = MobilityTarget.class.getDeclaredField("pieceType");
                java.lang.reflect.Field cwField = MobilityTarget.class.getDeclaredField("captureWeight");
                ptField.setAccessible(true);
                cwField.setAccessible(true);
                int pieceType = (Integer) ptField.get(mt);
                double captureWeight = (Double) cwField.get(mt);
                
                if (value instanceof ScaledValueCalculator) {
                    ScaledValueCalculator svc = (ScaledValueCalculator) value;
                    java.lang.reflect.Field baseField = ScaledValueCalculator.class.getDeclaredField("baseValue");
                    java.lang.reflect.Field multField = ScaledValueCalculator.class.getDeclaredField("multiplier");
                    java.lang.reflect.Field scaleField = ScaledValueCalculator.class.getDeclaredField("scaleType");
                    baseField.setAccessible(true);
                    multField.setAccessible(true);
                    scaleField.setAccessible(true);
                    int baseValue = (Integer) baseField.get(svc);
                    double mult = (Double) multField.get(svc);
                    ScaledValueCalculator.ScaleType st = (ScaledValueCalculator.ScaleType) scaleField.get(svc);
                    int scaleType = st == ScaledValueCalculator.ScaleType.LINEAR ? 0 :
                                   st == ScaledValueCalculator.ScaleType.SQUARE_ROOT ? 1 : 2;
                    
                    mobilityRules.add(new CompiledMobilityRule(pieceType, baseValue, captureWeight, 
                                                               mult, scaleType, category, weight));
                    return;
                }
            }
            
            if (target instanceof DefenseTarget) {
                DefenseTarget dt = (DefenseTarget) target;
                java.lang.reflect.Field ptField = DefenseTarget.class.getDeclaredField("pieceType");
                java.lang.reflect.Field mdField = DefenseTarget.class.getDeclaredField("minDefenders");
                ptField.setAccessible(true);
                mdField.setAccessible(true);
                int pieceType = (Integer) ptField.get(dt);
                int minDef = (Integer) mdField.get(dt);
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    defenseRules.add(new CompiledDefenseRule(pieceType, minDef, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof PawnAdvancementTarget) {
                if (value instanceof ScaledValueCalculator) {
                    ScaledValueCalculator svc = (ScaledValueCalculator) value;
                    java.lang.reflect.Field baseField = ScaledValueCalculator.class.getDeclaredField("baseValue");
                    java.lang.reflect.Field scaleField = ScaledValueCalculator.class.getDeclaredField("scaleType");
                    baseField.setAccessible(true);
                    scaleField.setAccessible(true);
                    int baseValue = (Integer) baseField.get(svc);
                    ScaledValueCalculator.ScaleType st = (ScaledValueCalculator.ScaleType) scaleField.get(svc);
                    int scaleType = st == ScaledValueCalculator.ScaleType.LINEAR ? 0 :
                                   st == ScaledValueCalculator.ScaleType.SQUARE_ROOT ? 1 : 2;
                    
                    pawnRules.add(new CompiledPawnRule(0, baseValue, scaleType, category, weight));
                    return;
                }
            }
            
            if (target instanceof PawnStructureTarget) {
                PawnStructureTarget pst = (PawnStructureTarget) target;
                java.lang.reflect.Field stField = PawnStructureTarget.class.getDeclaredField("structureType");
                stField.setAccessible(true);
                PawnStructureTarget.StructureType st = (PawnStructureTarget.StructureType) stField.get(pst);
                
                int type = st == PawnStructureTarget.StructureType.DOUBLED ? 2 :
                          st == PawnStructureTarget.StructureType.ISOLATED ? 3 : 4;
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    pawnRules.add(new CompiledPawnRule(type, val, 0, category, weight));
                    return;
                }
            }
            
            if (target instanceof PassedPawnTarget) {
                if (value instanceof ScaledValueCalculator) {
                    ScaledValueCalculator svc = (ScaledValueCalculator) value;
                    java.lang.reflect.Field baseField = ScaledValueCalculator.class.getDeclaredField("baseValue");
                    java.lang.reflect.Field scaleField = ScaledValueCalculator.class.getDeclaredField("scaleType");
                    baseField.setAccessible(true);
                    scaleField.setAccessible(true);
                    int baseValue = (Integer) baseField.get(svc);
                    ScaledValueCalculator.ScaleType st = (ScaledValueCalculator.ScaleType) scaleField.get(svc);
                    int scaleType = st == ScaledValueCalculator.ScaleType.LINEAR ? 0 :
                                   st == ScaledValueCalculator.ScaleType.SQUARE_ROOT ? 1 : 2;
                    
                    pawnRules.add(new CompiledPawnRule(1, baseValue, scaleType, category, weight));
                    return;
                }
            }
            
            if (target instanceof KingSafetyTarget) {
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    kingSafetyRules.add(new CompiledKingSafetyRule(val, category, weight));
                    return;
                }
            }
            
            if (target instanceof CenterControlTarget) {
                CenterControlTarget cct = (CenterControlTarget) target;
                java.lang.reflect.Field ctField = CenterControlTarget.class.getDeclaredField("centerType");
                ctField.setAccessible(true);
                CenterControlTarget.CenterType ct = (CenterControlTarget.CenterType) ctField.get(cct);
                int centerType = ct == CenterControlTarget.CenterType.CORE ? 0 : 1;
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    centerRules.add(new CompiledCenterRule(centerType, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof RookFileTarget) {
                RookFileTarget rft = (RookFileTarget) target;
                java.lang.reflect.Field ftField = RookFileTarget.class.getDeclaredField("fileType");
                ftField.setAccessible(true);
                RookFileTarget.FileType ft = (RookFileTarget.FileType) ftField.get(rft);
                int fileType = ft == RookFileTarget.FileType.OPEN ? 0 :
                              ft == RookFileTarget.FileType.SEMI_OPEN ? 1 : 2;
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    rookRules.add(new CompiledRookRule(fileType, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof DevelopmentTarget) {
                DevelopmentTarget dt = (DevelopmentTarget) target;
                java.lang.reflect.Field typeField = DevelopmentTarget.class.getDeclaredField("developType");
                typeField.setAccessible(true);
                DevelopmentTarget.DevelopType devType = (DevelopmentTarget.DevelopType) typeField.get(dt);
                int type = devType == DevelopmentTarget.DevelopType.ALL_MINORS ? 0 :
                          devType == DevelopmentTarget.DevelopType.FIANCHETTO ? 1 : 2;
                
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    developmentRules.add(new CompiledDevelopmentRule(type, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof GlobalTarget) {
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    globalRules.add(new CompiledGlobalRule(condition, val, category, weight));
                    return;
                }
            }
            
            if (target instanceof PieceSquareTableTarget) {
                PieceSquareTableTarget pst = (PieceSquareTableTarget) target;
                // Get piece type and table via reflection
                java.lang.reflect.Field ptField = PieceSquareTableTarget.class.getDeclaredField("pieceType");
                java.lang.reflect.Field ttField = PieceSquareTableTarget.class.getDeclaredField("tableType");
                ptField.setAccessible(true);
                ttField.setAccessible(true);
                int pieceType = (Integer) ptField.get(pst);
                PieceSquareTableTarget.TableType tableType = (PieceSquareTableTarget.TableType) ttField.get(pst);
                
                // Get the PST table values - use getTable method if available
                int[] table = getPSTTable(pieceType, tableType);
                if (table != null) {
                    pstRules.add(new CompiledPSTRule(pieceType, table, category, weight));
                    return;
                }
            }
            
            if (target instanceof CheckTarget) {
                if (value instanceof FixedValueCalculator) {
                    java.lang.reflect.Field valField = FixedValueCalculator.class.getDeclaredField("value");
                    valField.setAccessible(true);
                    int val = (Integer) valField.get(value);
                    
                    // Check is a global condition
                    globalRules.add(new CompiledGlobalRule(new CheckCondition(), val, category, weight));
                    return;
                }
            }
            
        } catch (Exception e) {
            // Fall through to fallback
        }
        
        // Couldn't compile - use original rule
        fallbackRules.add(rule);
    }
    
    // Simple condition for check
    private static class CheckCondition implements Condition {
        @Override
        public boolean evaluate(EvalContext ctx) {
            // Check if opponent is in check (we are giving check)
            return ctx.position.checkers() != 0 && ctx.color != ctx.position.sideToMove();
        }
    }
    
    // Get PST table for piece type and table type
    private static int[] getPSTTable(int pieceType, PieceSquareTableTarget.TableType tableType) {
        // Use the static tables from PieceSquareTableTarget
        // These are the SIMPLIFIED tables (most common)
        switch (pieceType) {
            case PAWN: return PST_PAWN;
            case KNIGHT: return PST_KNIGHT;
            case BISHOP: return PST_BISHOP;
            case ROOK: return PST_ROOK;
            case QUEEN: return PST_QUEEN;
            case KING: return PST_KING;
            default: return null;
        }
    }
    
    // Simplified PST tables (Tomasz Michniewski's tables, commonly used)
    private static final int[] PST_PAWN = {
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    };
    
    private static final int[] PST_KNIGHT = {
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    };
    
    private static final int[] PST_BISHOP = {
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    };
    
    private static final int[] PST_ROOK = {
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0
    };
    
    private static final int[] PST_QUEEN = {
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    };
    
    private static final int[] PST_KING = {
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    };
    
    @Override
    public String getName() {
        return name + " (Compiled)";
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    @Override
    public int evaluate(Position pos) {
        int us = pos.sideToMove();
        int them = opposite(us);
        
        // Initialize shared evaluation data
        evalData.init(pos);
        
        // Evaluate all rule groups
        int ourScore = evaluateSide(us);
        int theirScore = evaluateSide(them);
        
        // Evaluate global rules (only once, not per side)
        evaluateGlobalRules(us);
        
        int rawScore = ourScore - theirScore;
        
        // Apply category weights
        int totalScore = 0;
        for (Map.Entry<String, Integer> entry : evalData.categoryScores.entrySet()) {
            String category = entry.getKey();
            int score = entry.getValue();
            double weight = categoryWeights.getOrDefault(category, 1.0);
            totalScore += (int)(score * weight);
        }
        
        return totalScore + rawScore;
    }
    
    private int evaluateSide(int color) {
        int score = 0;
        
        // Material rules - direct computation, no iteration
        for (CompiledMaterialRule rule : materialRules) {
            if (!rule.enabled) continue;
            int count = popcount(evalData.pieces[color][rule.pieceType]);
            int ruleScore = (int)(count * rule.value * rule.weight);
            evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
        }
        
        // Mobility rules - compute attacks once, reuse
        if (!mobilityRules.isEmpty()) {
            evalData.computeAttacks(color);
            long enemies = evalData.allPieces[opposite(color)];
            
            for (CompiledMobilityRule rule : mobilityRules) {
                if (!rule.enabled) continue;
                
                long pieces = evalData.pieces[color][rule.pieceType];
                long[] piecesArr = {pieces};
                
                while (piecesArr[0] != 0) {
                    int sq = popLsb(piecesArr);
                    long attacks = getAttacks(sq, rule.pieceType, evalData.occupied);
                    attacks &= ~evalData.allPieces[color];
                    
                    int moveCount = popcount(attacks & ~enemies);
                    int captureCount = popcount(attacks & enemies);
                    double mobility = moveCount + captureCount * rule.captureWeight;
                    
                    int ruleScore;
                    switch (rule.scaleType) {
                        case 1: ruleScore = (int)(Math.sqrt(mobility) * rule.baseValue * rule.multiplier); break;
                        case 2: ruleScore = (int)(mobility * mobility * rule.baseValue * rule.multiplier); break;
                        default: ruleScore = (int)(mobility * rule.baseValue * rule.multiplier); break;
                    }
                    ruleScore = (int)(ruleScore * rule.weight);
                    evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
                }
            }
        }
        
        // Defense rules
        if (!defenseRules.isEmpty()) {
            evalData.computeAttacks(color);
            
            for (CompiledDefenseRule rule : defenseRules) {
                if (!rule.enabled) continue;
                
                long pieces = evalData.pieces[color][rule.pieceType];
                long[] piecesArr = {pieces};
                
                while (piecesArr[0] != 0) {
                    int sq = popLsb(piecesArr);
                    int defenders = countDefenders(sq, color);
                    
                    if (defenders >= rule.minDefenders) {
                        int ruleScore = (int)(rule.value * rule.weight);
                        evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
                    }
                }
            }
        }
        
        // Pawn rules
        if (!pawnRules.isEmpty()) {
            evalData.computePawnStructure();
            
            for (CompiledPawnRule rule : pawnRules) {
                if (!rule.enabled) continue;
                
                int ruleScore = 0;
                
                switch (rule.type) {
                    case 0: // Advancement
                        long pawns = evalData.pieces[color][PAWN];
                        long[] pawnsArr = {pawns};
                        while (pawnsArr[0] != 0) {
                            int sq = popLsb(pawnsArr);
                            int advancement = color == WHITE ? rankOf(sq) - RANK_2 : RANK_7 - rankOf(sq);
                            int val;
                            switch (rule.scaleType) {
                                case 1: val = (int)(Math.sqrt(advancement) * rule.value); break;
                                case 2: val = advancement * advancement * rule.value; break;
                                default: val = advancement * rule.value; break;
                            }
                            ruleScore += val;
                        }
                        break;
                        
                    case 1: // Passed pawns
                        long passed = evalData.passedPawns[color];
                        long[] passedArr = {passed};
                        while (passedArr[0] != 0) {
                            int sq = popLsb(passedArr);
                            int advancement = color == WHITE ? rankOf(sq) - RANK_2 : RANK_7 - rankOf(sq);
                            int val;
                            switch (rule.scaleType) {
                                case 1: val = (int)(Math.sqrt(advancement) * rule.value); break;
                                case 2: val = advancement * advancement * rule.value; break;
                                default: val = advancement * rule.value; break;
                            }
                            ruleScore += val;
                        }
                        break;
                        
                    case 2: // Doubled
                        ruleScore = popcount(evalData.doubledPawns[color]) * rule.value;
                        break;
                        
                    case 3: // Isolated
                        ruleScore = popcount(evalData.isolatedPawns[color]) * rule.value;
                        break;
                        
                    case 4: // Connected
                        ruleScore = popcount(evalData.connectedPawns[color]) * rule.value;
                        break;
                }
                
                ruleScore = (int)(ruleScore * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // King safety rules
        if (!kingSafetyRules.isEmpty()) {
            evalData.computeAttacks(opposite(color));
            long enemyAttacks = evalData.allAttacks[opposite(color)];
            long kingZone = evalData.kingZone[color];
            int attacksOnKing = popcount(enemyAttacks & kingZone);
            
            for (CompiledKingSafetyRule rule : kingSafetyRules) {
                if (!rule.enabled) continue;
                int ruleScore = (int)(attacksOnKing * rule.value * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // Center control rules
        if (!centerRules.isEmpty()) {
            evalData.computeAttacks(color);
            long coreCenter = (1L << SQ_D4) | (1L << SQ_D5) | (1L << SQ_E4) | (1L << SQ_E5);
            long extendedCenter = coreCenter | (1L << SQ_C3) | (1L << SQ_C4) | (1L << SQ_C5) | (1L << SQ_C6) |
                                 (1L << SQ_D3) | (1L << SQ_D6) | (1L << SQ_E3) | (1L << SQ_E6) |
                                 (1L << SQ_F3) | (1L << SQ_F4) | (1L << SQ_F5) | (1L << SQ_F6);
            
            for (CompiledCenterRule rule : centerRules) {
                if (!rule.enabled) continue;
                long center = rule.centerType == 0 ? coreCenter : extendedCenter;
                int controlled = popcount(evalData.allAttacks[color] & center);
                int ruleScore = (int)(controlled * rule.value * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // Rook file rules
        if (!rookRules.isEmpty()) {
            long rooks = evalData.pieces[color][ROOK];
            long ourPawns = evalData.pieces[color][PAWN];
            long theirPawns = evalData.pieces[opposite(color)][PAWN];
            
            for (CompiledRookRule rule : rookRules) {
                if (!rule.enabled) continue;
                
                long[] rooksArr = {rooks};
                int ruleScore = 0;
                
                while (rooksArr[0] != 0) {
                    int sq = popLsb(rooksArr);
                    int file = fileOf(sq);
                    long fileMask = FILE_A << file;
                    
                    boolean ourPawnOnFile = (ourPawns & fileMask) != 0;
                    boolean theirPawnOnFile = (theirPawns & fileMask) != 0;
                    
                    boolean matches = false;
                    switch (rule.fileType) {
                        case 0: // Open
                            matches = !ourPawnOnFile && !theirPawnOnFile;
                            break;
                        case 1: // Semi-open
                            matches = !ourPawnOnFile && theirPawnOnFile;
                            break;
                        case 2: // Quality (semi-open counts 1, open counts 2)
                            if (!ourPawnOnFile && !theirPawnOnFile) {
                                ruleScore += 2 * rule.value;
                            } else if (!ourPawnOnFile) {
                                ruleScore += rule.value;
                            }
                            continue;
                    }
                    
                    if (matches) {
                        ruleScore += rule.value;
                    }
                }
                
                ruleScore = (int)(ruleScore * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // Development rules
        if (!developmentRules.isEmpty()) {
            for (CompiledDevelopmentRule rule : developmentRules) {
                if (!rule.enabled) continue;
                
                int ruleScore = 0;
                
                switch (rule.type) {
                    case 0: // All minors
                        long knights = evalData.pieces[color][KNIGHT];
                        long bishops = evalData.pieces[color][BISHOP];
                        long backRank = color == WHITE ? RANK_1_BB : RANK_8_BB;
                        int developed = popcount((knights | bishops) & ~backRank);
                        ruleScore = developed * rule.value;
                        break;
                        
                    case 1: // Fianchetto
                        long bishopSquares = color == WHITE ? 
                            ((1L << SQ_B2) | (1L << SQ_G2)) :
                            ((1L << SQ_B7) | (1L << SQ_G7));
                        ruleScore = popcount(evalData.pieces[color][BISHOP] & bishopSquares) * rule.value;
                        break;
                        
                    case 2: // Central knights
                        long centerSquares = (1L << SQ_D4) | (1L << SQ_D5) | (1L << SQ_E4) | (1L << SQ_E5);
                        ruleScore = popcount(evalData.pieces[color][KNIGHT] & centerSquares) * rule.value;
                        break;
                }
                
                ruleScore = (int)(ruleScore * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // PST rules - piece-square table evaluation
        if (!pstRules.isEmpty()) {
            for (CompiledPSTRule rule : pstRules) {
                if (!rule.enabled) continue;
                
                long pieces = evalData.pieces[color][rule.pieceType];
                int ruleScore = 0;
                
                // Iterate through all pieces of this type
                while (pieces != 0) {
                    int sq = Long.numberOfTrailingZeros(pieces);
                    pieces &= pieces - 1; // Clear LSB
                    
                    // For black, flip the square vertically
                    int tableSq = color == WHITE ? sq : sq ^ 56;
                    ruleScore += rule.table[tableSq];
                }
                
                ruleScore = (int)(ruleScore * rule.weight);
                evalData.addScore(rule.category, color == evalData.pos.sideToMove() ? ruleScore : -ruleScore);
            }
        }
        
        // Fallback rules (couldn't be compiled)
        for (Rule rule : fallbackRules) {
            int ruleScore = rule.evaluate(evalData.pos, color);
            score += ruleScore;
        }
        
        return score;
    }
    
    private void evaluateGlobalRules(int us) {
        for (CompiledGlobalRule rule : globalRules) {
            if (!rule.enabled) continue;
            
            // Create minimal context for condition check
            EvalContext ctx = new EvalContext(evalData.pos, us);
            
            if (rule.condition.evaluate(ctx)) {
                int ruleScore = (int)(rule.value * rule.weight);
                evalData.addScore(rule.category, ruleScore);
            }
            
            // Also check for opponent
            EvalContext oppCtx = new EvalContext(evalData.pos, opposite(us));
            if (rule.condition.evaluate(oppCtx)) {
                int ruleScore = (int)(rule.value * rule.weight);
                evalData.addScore(rule.category, -ruleScore);
            }
        }
    }
    
    private long getAttacks(int sq, int pt, long occupied) {
        switch (pt) {
            case KNIGHT: return knightAttacks(sq);
            case BISHOP: return bishopAttacks(sq, occupied);
            case ROOK:   return rookAttacks(sq, occupied);
            case QUEEN:  return queenAttacks(sq, occupied);
            case KING:   return kingAttacks(sq);
            default:     return 0L;
        }
    }
    
    private int countDefenders(int sq, int color) {
        int defenders = 0;
        
        // Pawn defenders
        defenders += popcount(pawnAttacks(opposite(color), sq) & evalData.pieces[color][PAWN]);
        
        // Knight defenders
        defenders += popcount(knightAttacks(sq) & evalData.pieces[color][KNIGHT]);
        
        // Bishop/Queen diagonal defenders
        long diagAttackers = bishopAttacks(sq, evalData.occupied) & 
                            (evalData.pieces[color][BISHOP] | evalData.pieces[color][QUEEN]);
        defenders += popcount(diagAttackers);
        
        // Rook/Queen line defenders
        long lineAttackers = rookAttacks(sq, evalData.occupied) & 
                            (evalData.pieces[color][ROOK] | evalData.pieces[color][QUEEN]);
        defenders += popcount(lineAttackers);
        
        // King defender
        defenders += popcount(kingAttacks(sq) & evalData.pieces[color][KING]);
        
        return defenders;
    }
    
    @Override
    public int getPieceValue(int pt) {
        // Try to get from material rules
        for (CompiledMaterialRule rule : materialRules) {
            if (rule.pieceType == pt && rule.enabled) {
                return (int)(rule.value * rule.weight);
            }
        }
        return DEFAULT_PIECE_VALUES[pt];
    }
    
    /**
     * Get compilation statistics for debugging.
     */
    public String getCompilationStats() {
        return String.format(
            "Compiled: material=%d, mobility=%d, defense=%d, pawn=%d, global=%d, kingSafety=%d, center=%d, rook=%d, dev=%d, pst=%d | Fallback=%d",
            materialRules.size(), mobilityRules.size(), defenseRules.size(),
            pawnRules.size(), globalRules.size(), kingSafetyRules.size(),
            centerRules.size(), rookRules.size(), developmentRules.size(),
            pstRules.size(), fallbackRules.size()
        );
    }
}
