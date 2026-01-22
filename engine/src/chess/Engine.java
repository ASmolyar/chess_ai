package chess;

import static chess.Types.*;
import chess.Types.Move;
import chess.Types.MoveList;
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
    private Evaluator ruleEval; // Can be RuleBasedEvaluator or CompiledRuleEvaluator
    
    // Info for depth-0 search (stored separately from Search class)
    private int infoDepth = -1; // -1 means use Search's info
    private int infoSelDepth;
    private int infoScore;
    private long infoNodes;
    private long infoTime;
    private Move infoBestMove;
    
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
        return search(depth, timeMs, false);
    }
    
    public String search(int depth, int timeMs, boolean findWorst) {
        // Special case: depth 0 means pure static evaluation (no search tree)
        if (depth == 0) {
            return searchDepthZero(findWorst);
        }
        
        if (depth < 0 && timeMs <= 0) {
            timeMs = 5000; // Default 5 seconds
        }
        
        // For findWorst with depth > 0, we search all root moves and pick the worst
        if (findWorst) {
            return searchWorst(depth, timeMs);
        }
        
        // Reset depth-0 flag so getInfo() uses Search's results
        this.infoDepth = -1;
        
        search.setLimits(depth > 0 ? depth : 100, timeMs, 0, false);
        Move bestMove = search.search(position);
        
        if (bestMove == null || bestMove.isNull()) {
            return "";
        }
        
        return bestMove.toUCI();
    }
    
    /**
     * Search for the worst move at a given depth.
     * Searches all root moves and picks the one with the lowest score.
     */
    private String searchWorst(int depth, int timeMs) {
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(position, moves);
        
        if (moves.size() == 0) {
            return "";
        }
        
        long startTime = System.currentTimeMillis();
        Move worstMove = null;
        int worstScore = Integer.MAX_VALUE;
        long totalNodes = 0;
        
        // Search each move and find the one with the worst score
        for (int i = 0; i < moves.size(); i++) {
            Move move = moves.get(i);
            
            // Make the move
            position.doMove(move);
            
            // Search from opponent's perspective (negate result)
            search.clear();
            search.setLimits(depth - 1, timeMs / moves.size(), 0, false);
            Move response = search.search(position);
            
            // Score from our perspective (negate opponent's score)
            int score = -search.getScore();
            totalNodes += search.getNodes();
            
            // Undo the move
            position.undoMove(move);
            
            // We want the LOWEST score (worst for us)
            if (score < worstScore) {
                worstScore = score;
                worstMove = move;
            }
        }
        
        // Store info
        this.infoDepth = depth;
        this.infoSelDepth = search.getSelDepth();
        this.infoScore = worstScore;
        this.infoNodes = totalNodes;
        this.infoTime = System.currentTimeMillis() - startTime;
        this.infoBestMove = worstMove;
        
        return worstMove != null ? worstMove.toUCI() : "";
    }
    
    /**
     * Depth 0 search: evaluate all legal moves and return the one with the best/worst resulting score.
     * This is useful for testing/debugging the evaluation function.
     * @param findWorst if true, returns the worst move instead of the best
     */
    private String searchDepthZero(boolean findWorst) {
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(position, moves);
        
        if (moves.size() == 0) {
            return "";
        }
        
        Move selectedMove = null;
        int selectedScore = findWorst ? Integer.MAX_VALUE : Integer.MIN_VALUE;
        
        for (int i = 0; i < moves.size(); i++) {
            Move move = moves.get(i);
            
            // Make the move
            position.doMove(move);
            
            // Evaluate from the perspective of the side that just moved
            // (negate because eval returns score for side to move, which is now opponent)
            int score = -search.getEvaluator().evaluate(position);
            
            // Undo the move
            position.undoMove(move);
            
            if (findWorst) {
                // For worst move, pick lowest score
                if (score < selectedScore) {
                    selectedScore = score;
                    selectedMove = move;
                }
            } else {
                // For best move, pick highest score
                if (score > selectedScore) {
                    selectedScore = score;
                    selectedMove = move;
                }
            }
        }
        
        // Store info for getInfo()
        this.infoDepth = 0;
        this.infoSelDepth = 0;
        this.infoScore = selectedScore;
        this.infoNodes = moves.size();
        this.infoTime = 0;
        this.infoBestMove = selectedMove;
        
        return selectedMove != null ? selectedMove.toUCI() : "";
    }
    
    public String getInfo() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        
        // If we did a depth-0 search, use our stored info; otherwise use Search's
        if (infoDepth == 0) {
            sb.append("\"depth\":0,");
            sb.append("\"selDepth\":0,");
            sb.append("\"score\":").append(infoScore).append(",");
            sb.append("\"nodes\":").append(infoNodes).append(",");
            sb.append("\"time\":0,");
            sb.append("\"bestMove\":\"").append(infoBestMove != null ? infoBestMove.toUCI() : "").append("\"");
        } else {
            sb.append("\"depth\":").append(search.getDepth()).append(",");
            sb.append("\"selDepth\":").append(search.getSelDepth()).append(",");
            sb.append("\"score\":").append(search.getScore()).append(",");
            sb.append("\"nodes\":").append(search.getNodes()).append(",");
            sb.append("\"time\":").append(search.getTime()).append(",");
            sb.append("\"bestMove\":\"").append(search.getBestMove() != null ? search.getBestMove().toUCI() : "").append("\"");
        }
        
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
            String evalName = name != null ? name : "Custom Rule Eval";
            String evalDesc = description != null ? description : "User-defined rule-based evaluator";
            
            // Parse category weights
            Map<String, Double> weights = new HashMap<>();
            if (categoryWeightsJson != null && !categoryWeightsJson.isEmpty()) {
                weights = parseCategoryWeights(categoryWeightsJson);
            }
            
            // Parse rules
            List<Rule> rules = new ArrayList<>();
            if (rulesJson != null && !rulesJson.isEmpty()) {
                rules = parseRules(rulesJson);
            }
            
            // Use CompiledRuleEvaluator for optimized performance
            this.ruleEval = new CompiledRuleEvaluator(evalName, evalDesc, rules, weights);
            
            // Log compilation stats
            if (this.ruleEval instanceof CompiledRuleEvaluator) {
                System.out.println("[Engine] " + ((CompiledRuleEvaluator) this.ruleEval).getCompilationStats());
            }
            
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
            
            // Create rule with correct parameter order: id, name, category, condition, target, value, weight
            Rule rule = new Rule(id, ruleName, category, condition, target, value, weight);
            rule.setEnabled(enabled);
            return rule;
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
                // Parse UI format: piece1Type can be "my_king", "my_queen", "opp_king", etc.
                String p1Raw = props.getOrDefault("piece1Type", "my_king").replace("\"", "");
                String p2Raw = props.getOrDefault("piece2Type", "opp_king").replace("\"", "");
                String p1Type, p1Color, p2Type, p2Color;
                
                // Parse piece1
                if (p1Raw.startsWith("my_")) {
                    p1Type = p1Raw.substring(3);
                    p1Color = "my";
                } else if (p1Raw.startsWith("opp_")) {
                    p1Type = p1Raw.substring(4);
                    p1Color = "opponent";
                } else {
                    p1Type = p1Raw;
                    p1Color = props.getOrDefault("piece1Color", "my").replace("\"", "");
                }
                
                // Parse piece2
                if (p2Raw.startsWith("opp_")) {
                    p2Type = p2Raw.substring(4);
                    p2Color = "opponent";
                } else if (p2Raw.startsWith("my_")) {
                    p2Type = p2Raw.substring(3);
                    p2Color = "my";
                } else if ("any".equals(p2Raw) || "pawn".equals(p2Raw)) {
                    p2Type = p2Raw;
                    p2Color = "opponent";
                } else {
                    p2Type = p2Raw;
                    p2Color = props.getOrDefault("piece2Color", "opponent").replace("\"", "");
                }
                
                String distComp = props.getOrDefault("comparison", "less_than").replace("\"", "");
                // Map UI comparisons to engine format
                if ("less_equal".equals(distComp)) distComp = "less_equal";
                else if ("greater_than".equals(distComp)) distComp = "greater_than";
                
                int dist = parseInt(props.get("distance"), 5);
                return new PieceDistanceCondition(p1Type, p1Color, p2Type, p2Color, distComp, dist);
            case "has_passed":
                String passedPlayer = props.getOrDefault("player", "my").replace("\"", "");
                String passedReq = props.getOrDefault("requirement", "any").replace("\"", "");
                return new HasPassedCondition(passedPlayer, passedReq);
            case "piece_on_square":
                String posPiece = props.getOrDefault("pieceType", "bishop").replace("\"", "");
                String posPlayer = props.getOrDefault("player", "my").replace("\"", "");
                String posSquares = props.getOrDefault("squares", "").replace("\"", "");
                return new PieceOnSquareCondition(posPiece, posPlayer, posSquares);
            case "file_state":
                String fsFile = props.getOrDefault("file", "any").replace("\"", "");
                String fsState = props.getOrDefault("state", "open").replace("\"", "");
                return new FileStateCondition(fsFile, fsState);
            case "developed":
                String devPlayer = props.getOrDefault("player", "my").replace("\"", "");
                String devReq = props.getOrDefault("requirement", "some").replace("\"", "");
                return new DevelopedCondition(devPlayer, devReq);
            default:
                System.err.println("Unknown condition type: " + type);
                return new AlwaysCondition();
        }
    }
    
    private Target parseTarget(String targetJson) {
        if (targetJson == null || targetJson.isEmpty()) return null;
        
        Map<String, String> props = parseJsonObject(targetJson);
        String type = props.getOrDefault("type", "").replace("\"", "");
        
        switch (type) {
            // UI consolidated target: piece_count handles pieces and pairs
            case "piece_count":
                String pcPieceType = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                // Handle pair types (knight_pair, bishop_pair, rook_pair)
                if (pcPieceType.endsWith("_pair")) {
                    String basePiece = pcPieceType.replace("_pair", "");
                    if ("bishop".equals(basePiece)) {
                        return new BishopPairTarget();
                    }
                    // For knight_pair and rook_pair, count pieces >= 2
                    // Use SimpleMaterialTarget with the base piece type
                    return new SimpleMaterialTarget(basePiece);
                }
                return new SimpleMaterialTarget(pcPieceType);
                
            case "simple_material":
                String pieceType = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                return new SimpleMaterialTarget(pieceType);
                
            case "mobility":
                String mobPiece = props.getOrDefault("pieceType", "knight").replace("\"", "");
                // Handle UI's moveType parameter - convert to captureWeight
                String moveType = props.getOrDefault("moveType", "move").replace("\"", "");
                double capWeight;
                if ("capture".equals(moveType)) {
                    capWeight = 2.0; // Captures count more
                } else if ("check".equals(moveType)) {
                    capWeight = 3.0; // Checks count even more
                } else {
                    capWeight = parseDouble(props.get("captureWeight"), 1.0);
                }
                return new MobilityTarget(mobPiece, capWeight);
                
            case "defense":
                String defPiece = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                String defenderType = props.getOrDefault("defenderType", "any").replace("\"", "");
                int minDef = parseInt(props.get("minDefenders"), 1);
                // Use the new constructor with defenderType filter
                if ("any".equals(defenderType)) {
                    return new DefenseTarget(defPiece, minDef);
                } else {
                    return new DefenseTarget(defPiece, defenderType, minDef);
                }
                
            case "piece_distance":
                // Handle UI format: piece1, piece2 (with opp_king, opp_queen, center values)
                String p1 = props.getOrDefault("piece1", "").replace("\"", "");
                String p2 = props.getOrDefault("piece2", "").replace("\"", "");
                
                // Fall back to old format if new format not present
                String p1Type = p1.isEmpty() ? props.getOrDefault("piece1Type", "king").replace("\"", "") : p1;
                String p1Color = "my";
                String p2Type;
                String p2Color;
                
                if (!p2.isEmpty()) {
                    // Parse UI format (opp_king, opp_queen, center)
                    if (p2.startsWith("opp_")) {
                        p2Type = p2.substring(4); // Remove "opp_" prefix
                        p2Color = "opponent";
                    } else if ("center".equals(p2)) {
                        // Center distance - use king tropism style
                        return new KingTropismTarget(p1Type);
                    } else {
                        p2Type = p2;
                        p2Color = "opponent";
                    }
                } else {
                    p2Type = props.getOrDefault("piece2Type", "king").replace("\"", "");
                    p2Color = props.getOrDefault("piece2Color", "opponent").replace("\"", "");
                }
                
                String distType = props.getOrDefault("distanceType", "chebyshev").replace("\"", "");
                return new PieceDistanceTarget(p1Type, p1Color, p2Type, p2Color, distType);
                
            case "pawn_advancement":
                return new PawnAdvancementTarget();
                
            case "check":
                return new CheckTarget();
                
            case "global":
                return new GlobalTarget();
                
            // UI consolidated target: king_zone handles king safety
            case "king_zone":
                String whose = props.getOrDefault("whose", "my_king").replace("\"", "");
                // For now, just use KingSafetyTarget (always evaluates player's king safety)
                return new KingSafetyTarget();
                
            case "king_safety":
                return new KingSafetyTarget();
                
            // UI consolidated target: pawn_formation handles all pawn structure types
            case "pawn_formation":
                String formationType = props.getOrDefault("formationType", "doubled").replace("\"", "");
                if ("passed".equals(formationType)) {
                    return new PassedPawnTarget("rank");
                } else if ("chain".equals(formationType)) {
                    return new PawnChainTarget("any");
                } else {
                    // doubled, isolated, connected, backward, phalanx -> PawnStructureTarget
                    return new PawnStructureTarget(formationType);
                }
                
            case "pawn_structure":
                String structType = props.getOrDefault("structureType", "doubled").replace("\"", "");
                return new PawnStructureTarget(structType);
                
            case "passed_pawn":
                String passedMeasure = props.getOrDefault("measureType", "rank").replace("\"", "");
                return new PassedPawnTarget(passedMeasure);
                
            case "rook_file":
                String rookFileType = props.getOrDefault("fileType", "quality").replace("\"", "");
                return new RookFileTarget(rookFileType);
                
            case "center_control":
                String centerType = props.getOrDefault("centerType", "core").replace("\"", "");
                return new CenterControlTarget(centerType);
                
            // UI target: square_control - control of user-selected squares
            case "square_control":
                // squares param contains selected square names like "d4,e4,d5,e5"
                // For now, map to CenterControlTarget with core type as a fallback
                // A proper implementation would parse the squares and create a custom target
                return new CenterControlTarget("core");
                
            // UI target: piece_placement - pieces on user-selected squares  
            case "piece_placement":
                String placePiece = props.getOrDefault("pieceType", "any").replace("\"", "");
                // squares param contains selected square names
                // Map to PieceSquareTableTarget as a reasonable approximation
                // For custom squares, this would need a custom target
                if ("any".equals(placePiece)) {
                    return new PieceSquareTableTarget("pawn", "simplified");
                }
                return new PieceSquareTableTarget(placePiece, "simplified");
                
            case "development":
                String devType = props.getOrDefault("developType", "all_minors").replace("\"", "");
                return new DevelopmentTarget(devType);
                
            case "bishop_pair":
                return new BishopPairTarget();
                
            case "outpost":
                String outpostPiece = props.getOrDefault("pieceType", "any").replace("\"", "");
                return new OutpostTarget(outpostPiece);
                
            case "weak_squares":
                String weakRegion = props.getOrDefault("region", "camp").replace("\"", "");
                return new WeakSquaresTarget(weakRegion);
                
            case "battery":
                String batteryType = props.getOrDefault("batteryType", "any").replace("\"", "");
                return new BatteryTarget(batteryType);
                
            case "king_tropism":
                String tropismPiece = props.getOrDefault("pieceType", "any").replace("\"", "");
                return new KingTropismTarget(tropismPiece);
                
            case "pawn_chain":
                String chainRole = props.getOrDefault("role", "any").replace("\"", "");
                return new PawnChainTarget(chainRole);
                
            case "space":
                return new SpaceAdvantageTarget();
                
            case "piece_square_table":
            case "pst":
                String pstPiece = props.getOrDefault("pieceType", "pawn").replace("\"", "");
                String pstTable = props.getOrDefault("tableType", "classic").replace("\"", "");
                return new PieceSquareTableTarget(pstPiece, pstTable);
                
            default:
                System.err.println("Unknown target type: " + type);
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
            case "formula":
                String formula = props.getOrDefault("formula", "n * 10").replace("\"", "");
                return new FormulaValueCalculator(formula);
            default:
                System.err.println("Unknown value type: " + type);
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

