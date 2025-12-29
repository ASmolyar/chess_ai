package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

import chess.rules.*;
import chess.rules.conditions.*;
import chess.rules.targets.*;
import chess.rules.values.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Main engine class that provides the public API.
 */
public class Engine {
    
    private final Position position;
    private final Search search;
    
    // Available evaluators
    private final TuringEval turingEval;
    private final MaterialEval materialEval;
    private final CustomEval customEval;
    private RuleBasedEvaluator ruleEval;
    
    public Engine() {
        Bitboard.init();
        this.position = new Position();
        this.turingEval = new TuringEval();
        this.materialEval = new MaterialEval();
        this.customEval = new CustomEval();
        this.ruleEval = null;
        this.search = new Search(turingEval); // Default to Turing
    }
    
    public void newGame() {
        search.clear();
        position.setStartPos();
    }
    
    public void setStartPos() {
        position.setStartPos();
    }
    
    public void setFen(String fen) {
        position.setFen(fen);
    }
    
    public String getFen() {
        return position.fen();
    }
    
    public boolean makeMove(String moveStr) {
        if (moveStr == null || moveStr.length() < 4) return false;
        
        int fromFile = moveStr.charAt(0) - 'a';
        int fromRank = moveStr.charAt(1) - '1';
        int toFile = moveStr.charAt(2) - 'a';
        int toRank = moveStr.charAt(3) - '1';
        
        int from = makeSquare(fromFile, fromRank);
        int to = makeSquare(toFile, toRank);
        
        // Generate legal moves to find the matching one
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(position, moves);
        
        for (int i = 0; i < moves.size(); i++) {
            Move m = moves.get(i);
            if (m.from() == from && m.to() == to) {
                // Check promotion
                if (m.type() == PROMOTION) {
                    int promo = QUEEN;
                    if (moveStr.length() >= 5) {
                        switch (moveStr.charAt(4)) {
                            case 'n': promo = KNIGHT; break;
                            case 'b': promo = BISHOP; break;
                            case 'r': promo = ROOK; break;
                            default: promo = QUEEN; break;
                        }
                    }
                    if (m.promotionType() != promo) continue;
                }
                
                position.doMove(m);
                return true;
            }
        }
        
        return false;
    }
    
    public String search(int depth, int timeMs) {
        if (depth <= 0 && timeMs <= 0) {
            timeMs = 5000; // Default 5 seconds
        }
        
        search.setLimits(depth > 0 ? depth : 100, timeMs, 0, false);
        Move bestMove = search.search(position);
        
        if (bestMove == null || bestMove.isNull()) {
            return "";
        }
        
        return bestMove.toUCI();
    }
    
    public String getInfo() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"depth\":").append(search.getDepth()).append(",");
        sb.append("\"selDepth\":").append(search.getSelDepth()).append(",");
        sb.append("\"score\":").append(search.getScore()).append(",");
        sb.append("\"nodes\":").append(search.getNodes()).append(",");
        sb.append("\"time\":").append(search.getTime()).append(",");
        sb.append("\"bestMove\":\"").append(search.getBestMove() != null ? search.getBestMove().toUCI() : "").append("\"");
        sb.append("}");
        return sb.toString();
    }
    
    public int sideToMove() {
        return position.sideToMove();
    }
    
    public int gameStatus() {
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(position, moves);
        
        if (moves.size() == 0) {
            if (position.inCheck()) {
                // Checkmate
                return position.sideToMove() == WHITE ? 2 : 1;
            }
            return 3; // Stalemate
        }
        
        if (position.isDraw(0)) {
            return 3; // Draw
        }
        
        return 0; // Game ongoing
    }
    
    public int evaluate() {
        return search.getEvaluator().evaluate(position);
    }
    
    /**
     * Set the evaluator by name.
     * @param name "turing", "material", "custom", or "rule"
     * @return true if evaluator was set successfully
     */
    public boolean setEvaluator(String name) {
        switch (name.toLowerCase()) {
            case "turing":
                search.setEvaluator(turingEval);
                return true;
            case "material":
                search.setEvaluator(materialEval);
                return true;
            case "custom":
                search.setEvaluator(customEval);
                return true;
            case "rule":
                if (ruleEval != null) {
                    search.setEvaluator(ruleEval);
                    return true;
                }
                // Fall back to Turing if no rule eval configured
                search.setEvaluator(turingEval);
                return true;
            default:
                return false;
        }
    }
    
    /**
     * Get the name of the current evaluator.
     */
    public String getEvaluatorName() {
        return search.getEvaluator().getName();
    }
    
    /**
     * Get the description of the current evaluator.
     */
    public String getEvaluatorDescription() {
        return search.getEvaluator().getDescription();
    }
    
    /**
     * Get list of available evaluators as JSON.
     */
    public String getAvailableEvaluators() {
        return "[" +
            "{\"name\":\"turing\",\"description\":\"" + turingEval.getDescription() + "\"}," +
            "{\"name\":\"material\",\"description\":\"" + materialEval.getDescription() + "\"}," +
            "{\"name\":\"custom\",\"description\":\"" + customEval.getDescription() + "\"}" +
            "]";
    }
    
    /**
     * Configure the custom evaluator with specific weights.
     */
    public void configureCustomEval(
        int pawnValue, int knightValue, int bishopValue, int rookValue, int queenValue,
        int mobilityWeight, int kingSafetyWeight, int pawnAdvanceWeight,
        int centerControlWeight, int bishopPairBonus, int rookOnOpenFileBonus,
        int passedPawnBonus, int doubledPawnPenalty, int isolatedPawnPenalty, int castlingBonus
    ) {
        customEval.configure(
            pawnValue, knightValue, bishopValue, rookValue, queenValue,
            mobilityWeight, kingSafetyWeight, pawnAdvanceWeight,
            centerControlWeight, bishopPairBonus, rookOnOpenFileBonus,
            passedPawnBonus, doubledPawnPenalty, isolatedPawnPenalty, castlingBonus
        );
    }
    
    /**
     * Get current custom evaluator configuration as JSON.
     */
    public String getCustomEvalConfig() {
        return customEval.getConfigJson();
    }
    
    /**
     * Configure the rule-based evaluator from JSON config.
     * @param name Evaluator name
     * @param description Evaluator description
     * @param rulesJson JSON array of rules
     * @param categoryWeightsJson JSON object of category weights
     * @return true if configuration was successful
     */
    public boolean configureRuleEval(String name, String description, 
                                     String rulesJson, String categoryWeightsJson) {
        try {
            RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder()
                .name(name != null ? name : "Custom Rule Eval")
                .description(description != null ? description : "User-defined rule-based evaluator");
            
            // Parse category weights
            if (categoryWeightsJson != null && !categoryWeightsJson.isEmpty()) {
                Map<String, Double> weights = parseCategoryWeights(categoryWeightsJson);
                for (Map.Entry<String, Double> entry : weights.entrySet()) {
                    builder.setCategoryWeight(entry.getKey(), entry.getValue());
                }
            }
            
            // Parse and add rules
            if (rulesJson != null && !rulesJson.isEmpty()) {
                List<Rule> rules = parseRules(rulesJson);
                for (Rule rule : rules) {
                    builder.addRule(rule);
                }
            }
            
            this.ruleEval = builder.build();
            search.setEvaluator(this.ruleEval);
            return true;
        } catch (Exception e) {
            System.err.println("Failed to configure rule eval: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * Parse category weights from JSON string.
     */
    private Map<String, Double> parseCategoryWeights(String json) {
        Map<String, Double> weights = new HashMap<>();
        // Simple JSON parsing (no external library)
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}")) json = json.substring(0, json.length() - 1);
        
        for (String part : json.split(",")) {
            String[] kv = part.split(":");
            if (kv.length == 2) {
                String key = kv[0].trim().replace("\"", "");
                try {
                    double value = Double.parseDouble(kv[1].trim());
                    weights.put(key, value);
                } catch (NumberFormatException e) {
                    // Skip invalid values
                }
            }
        }
        return weights;
    }
    
    /**
     * Parse rules from JSON array string.
     * Format: [{ id, name, enabled, category, condition, target, value }, ...]
     */
    private List<Rule> parseRules(String rulesJson) {
        List<Rule> rules = new ArrayList<>();
        
        // This is a simplified parser - in production use a proper JSON library
        rulesJson = rulesJson.trim();
        if (!rulesJson.startsWith("[")) return rules;
        
        // Split by rule objects
        int depth = 0;
        StringBuilder currentRule = new StringBuilder();
        
        for (int i = 1; i < rulesJson.length() - 1; i++) {
            char c = rulesJson.charAt(i);
            if (c == '{') depth++;
            if (c == '}') depth--;
            
            if (depth > 0 || c != ',') {
                currentRule.append(c);
            }
            
            if (depth == 0 && (c == '}' || i == rulesJson.length() - 2)) {
                String ruleStr = currentRule.toString().trim();
                if (!ruleStr.isEmpty()) {
                    Rule rule = parseRule(ruleStr);
                    if (rule != null) {
                        rules.add(rule);
                    }
                }
                currentRule = new StringBuilder();
            }
        }
        
        return rules;
    }
    
    /**
     * Parse a single rule from JSON object string.
     */
    private Rule parseRule(String ruleJson) {
        try {
            Map<String, String> props = parseJsonObject(ruleJson);
            
            String id = props.getOrDefault("id", "rule_" + System.currentTimeMillis());
            String ruleName = props.getOrDefault("name", "Unnamed Rule");
            boolean enabled = !"false".equals(props.get("enabled"));
            String category = props.getOrDefault("category", "material");
            double weight = parseDouble(props.get("weight"), 1.0);
            
            // Parse condition
            Condition condition = parseCondition(props.get("condition"));
            if (condition == null) condition = new AlwaysCondition();
            
            // Parse target
            Target target = parseTarget(props.get("target"));
            if (target == null) {
                System.err.println("Failed to parse target for rule: " + id);
                return null;
            }
            
            // Parse value calculator
            ValueCalculator value = parseValue(props.get("value"));
            if (value == null) {
                System.err.println("Failed to parse value for rule: " + id);
                return null;
            }
            
            return new Rule(id, ruleName, enabled, category, weight, condition, target, value);
        } catch (Exception e) {
            System.err.println("Failed to parse rule: " + e.getMessage());
            return null;
        }
    }
    
    private Map<String, String> parseJsonObject(String json) {
        Map<String, String> result = new HashMap<>();
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}")) json = json.substring(0, json.length() - 1);
        
        // Handle nested objects
        int depth = 0;
        StringBuilder current = new StringBuilder();
        String key = null;
        boolean inString = false;
        
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            
            if (c == '"' && (i == 0 || json.charAt(i-1) != '\\')) {
                inString = !inString;
                current.append(c);
                continue;
            }
            
            if (!inString) {
                if (c == '{' || c == '[') depth++;
                if (c == '}' || c == ']') depth--;
                
                if (c == ':' && depth == 0 && key == null) {
                    key = current.toString().trim().replace("\"", "");
                    current = new StringBuilder();
                    continue;
                }
                
                if (c == ',' && depth == 0 && key != null) {
                    result.put(key, current.toString().trim());
                    key = null;
                    current = new StringBuilder();
                    continue;
                }
            }
            
            current.append(c);
        }
        
        if (key != null) {
            result.put(key, current.toString().trim());
        }
        
        return result;
    }
    
    private Condition parseCondition(String condJson) {
        if (condJson == null || condJson.isEmpty()) return new AlwaysCondition();
        
        Map<String, String> props = parseJsonObject(condJson);
        String type = props.getOrDefault("type", "always").replace("\"", "");
        
        switch (type) {
            case "always":
                return new AlwaysCondition();
            case "game_phase":
                String phase = props.getOrDefault("phase", "middlegame").replace("\"", "");
                return new GamePhaseCondition(phase);
            case "material":
                String pieceType = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                String player = props.getOrDefault("player", "my").replace("\"", "");
                String comparison = props.getOrDefault("comparison", "at_least").replace("\"", "");
                int count = parseInt(props.get("count"), 1);
                return new MaterialCondition(pieceType, player, comparison, count);
            case "castling":
                String cPlayer = props.getOrDefault("player", "my").replace("\"", "");
                String status = props.getOrDefault("status", "has_castled_either").replace("\"", "");
                return new CastlingCondition(cPlayer, status);
            case "piece_distance":
                String p1Type = props.getOrDefault("piece1Type", "king").replace("\"", "");
                String p1Color = props.getOrDefault("piece1Color", "my").replace("\"", "");
                String p2Type = props.getOrDefault("piece2Type", "king").replace("\"", "");
                String p2Color = props.getOrDefault("piece2Color", "opponent").replace("\"", "");
                String distComp = props.getOrDefault("comparison", "less_than").replace("\"", "");
                int dist = parseInt(props.get("distance"), 5);
                return new PieceDistanceCondition(p1Type, p1Color, p2Type, p2Color, distComp, dist);
            default:
                return new AlwaysCondition();
        }
    }
    
    private Target parseTarget(String targetJson) {
        if (targetJson == null || targetJson.isEmpty()) return null;
        
        Map<String, String> props = parseJsonObject(targetJson);
        String type = props.getOrDefault("type", "").replace("\"", "");
        
        switch (type) {
            case "simple_material":
                String pieceType = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                return new SimpleMaterialTarget(pieceType);
            case "mobility":
                String mobPiece = props.getOrDefault("pieceType", "knight").replace("\"", "");
                double capWeight = parseDouble(props.get("captureWeight"), 1.0);
                return new MobilityTarget(mobPiece, capWeight);
            case "defense":
                String defPiece = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                int minDef = parseInt(props.get("minDefenders"), 1);
                return new DefenseTarget(defPiece, minDef);
            case "piece_distance":
                String p1Type = props.getOrDefault("piece1Type", "king").replace("\"", "");
                String p1Color = props.getOrDefault("piece1Color", "my").replace("\"", "");
                String p2Type = props.getOrDefault("piece2Type", "king").replace("\"", "");
                String p2Color = props.getOrDefault("piece2Color", "opponent").replace("\"", "");
                String distType = props.getOrDefault("distanceType", "chebyshev").replace("\"", "");
                return new PieceDistanceTarget(p1Type, p1Color, p2Type, p2Color, distType);
            case "pawn_advancement":
                return new PawnAdvancementTarget();
            case "check":
                return new CheckTarget();
            case "global":
                return new GlobalTarget();
            default:
                return null;
        }
    }
    
    private ValueCalculator parseValue(String valueJson) {
        if (valueJson == null || valueJson.isEmpty()) return null;
        
        Map<String, String> props = parseJsonObject(valueJson);
        String type = props.getOrDefault("type", "").replace("\"", "");
        
        switch (type) {
            case "fixed":
                int value = parseInt(props.get("value"), 100);
                return new FixedValueCalculator(value);
            case "scaled":
                int base = parseInt(props.get("baseValue"), 10);
                double mult = parseDouble(props.get("multiplier"), 1.0);
                String scale = props.getOrDefault("scaleType", "linear").replace("\"", "");
                return new ScaledValueCalculator(base, mult, scale);
            default:
                return null;
        }
    }
    
    private int parseInt(String s, int def) {
        if (s == null || s.isEmpty()) return def;
        try {
            return (int) Double.parseDouble(s.trim().replace("\"", ""));
        } catch (NumberFormatException e) {
            return def;
        }
    }
    
    private double parseDouble(String s, double def) {
        if (s == null || s.isEmpty()) return def;
        try {
            return Double.parseDouble(s.trim().replace("\"", ""));
        } catch (NumberFormatException e) {
            return def;
        }
    }
    
    public String getMoves() {
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(position, moves);
        
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < moves.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(moves.get(i).toUCI()).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }
    
    public void stop() {
        search.stop();
    }
    
    // For testing
    public static void main(String[] args) {
        System.out.println("Chess Engine Java");
        
        Engine engine = new Engine();
        engine.newGame();
        
        System.out.println("FEN: " + engine.getFen());
        System.out.println("Legal moves: " + engine.getMoves());
        
        System.out.println("\nSearching depth 6...");
        String bestMove = engine.search(6, 0);
        System.out.println("Best move: " + bestMove);
        System.out.println("Info: " + engine.getInfo());
    }
}

