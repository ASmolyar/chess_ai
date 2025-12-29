package chess;

import chess.rules.Rule;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static chess.Types.*;

/**
 * A fully customizable rule-based evaluator.
 * Evaluation is defined by a set of rules that can be configured via JSON.
 */
public class RuleBasedEvaluator implements Evaluator {
    private final String name;
    private final String description;
    private final List<Rule> rules;
    private final Map<String, Double> categoryWeights;
    
    // Default piece values (can be overridden by rules)
    private static final int[] DEFAULT_PIECE_VALUES = {
        0, 100, 320, 330, 500, 900, 0
    };
    
    public RuleBasedEvaluator(String name, String description, 
                             List<Rule> rules, 
                             Map<String, Double> categoryWeights) {
        this.name = name;
        this.description = description;
        this.rules = new ArrayList<>(rules);
        this.categoryWeights = new HashMap<>(categoryWeights);
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    @Override
    public int evaluate(Position pos) {
        int us = pos.sideToMove();
        int them = opposite(us);
        
        // Group rules by category for efficient weight application
        Map<String, Integer> categoryScores = new HashMap<>();
        
        // Evaluate each rule
        for (Rule rule : rules) {
            if (!rule.isEnabled()) {
                continue;
            }
            
            int ourScore = rule.evaluate(pos, us);
            int theirScore = rule.evaluate(pos, them);
            int netScore = ourScore - theirScore;
            
            // Accumulate by category
            String category = rule.getCategory();
            categoryScores.put(category, 
                categoryScores.getOrDefault(category, 0) + netScore);
        }
        
        // Apply category weights
        int totalScore = 0;
        for (Map.Entry<String, Integer> entry : categoryScores.entrySet()) {
            String category = entry.getKey();
            int score = entry.getValue();
            double weight = categoryWeights.getOrDefault(category, 1.0);
            totalScore += (int)(score * weight);
        }
        
        return totalScore;
    }
    
    @Override
    public int getPieceValue(int pt) {
        // Could be computed from rules, but for simplicity use defaults
        return DEFAULT_PIECE_VALUES[pt];
    }
    
    /**
     * Get all rules.
     */
    public List<Rule> getRules() {
        return new ArrayList<>(rules);
    }
    
    /**
     * Get category weights.
     */
    public Map<String, Double> getCategoryWeights() {
        return new HashMap<>(categoryWeights);
    }
    
    /**
     * Enable or disable a rule by ID.
     */
    public void setRuleEnabled(String ruleId, boolean enabled) {
        for (Rule rule : rules) {
            if (rule.getId().equals(ruleId)) {
                rule.setEnabled(enabled);
                return;
            }
        }
    }
    
    /**
     * Get a rule by ID.
     */
    public Rule getRule(String ruleId) {
        for (Rule rule : rules) {
            if (rule.getId().equals(ruleId)) {
                return rule;
            }
        }
        return null;
    }
    
    /**
     * Builder for RuleBasedEvaluator.
     */
    public static class Builder {
        private String name = "Custom";
        private String description = "Rule-based evaluator";
        private List<Rule> rules = new ArrayList<>();
        private Map<String, Double> categoryWeights = new HashMap<>();
        
        public Builder name(String name) {
            this.name = name;
            return this;
        }
        
        public Builder description(String description) {
            this.description = description;
            return this;
        }
        
        public Builder addRule(Rule rule) {
            this.rules.add(rule);
            return this;
        }
        
        public Builder setCategoryWeight(String category, double weight) {
            this.categoryWeights.put(category, weight);
            return this;
        }
        
        public RuleBasedEvaluator build() {
            // Set default category weights if not specified
            if (!categoryWeights.containsKey("material")) {
                categoryWeights.put("material", 1.0);
            }
            if (!categoryWeights.containsKey("mobility")) {
                categoryWeights.put("mobility", 1.0);
            }
            if (!categoryWeights.containsKey("king_safety")) {
                categoryWeights.put("king_safety", 1.0);
            }
            if (!categoryWeights.containsKey("pawn_structure")) {
                categoryWeights.put("pawn_structure", 1.0);
            }
            if (!categoryWeights.containsKey("positional")) {
                categoryWeights.put("positional", 1.0);
            }
            if (!categoryWeights.containsKey("piece_coordination")) {
                categoryWeights.put("piece_coordination", 1.0);
            }
            if (!categoryWeights.containsKey("threats")) {
                categoryWeights.put("threats", 1.0);
            }
            
            return new RuleBasedEvaluator(name, description, rules, categoryWeights);
        }
    }
}

