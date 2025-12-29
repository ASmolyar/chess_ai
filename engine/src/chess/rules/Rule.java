package chess.rules;

import chess.Position;
import java.util.List;

import static chess.Types.*;

/**
 * Represents a single evaluation rule.
 * A rule has a condition (when to apply), a target (what to evaluate),
 * and a value calculator (how much to score).
 */
public class Rule {
    private final String id;
    private final String name;
    private final String category;
    private final Condition condition;
    private final Target target;
    private final ValueCalculator value;
    private final double weight;
    private boolean enabled;
    
    public Rule(String id, String name, String category, 
                Condition condition, Target target, ValueCalculator value, 
                double weight) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.condition = condition;
        this.target = target;
        this.value = value;
        this.weight = weight;
        this.enabled = true;
    }
    
    /**
     * Evaluate this rule for a given color.
     * @param pos The position to evaluate
     * @param color The color to evaluate for
     * @return Score in centipawns
     */
    public int evaluate(Position pos, int color) {
        if (!enabled) {
            return 0;
        }
        
        EvalContext ctx = new EvalContext(pos, color);
        
        // Check condition
        if (condition != null && !condition.evaluate(ctx)) {
            return 0;
        }
        
        // Select targets
        List<EvalContext> targets = target.select(ctx);
        
        // Calculate total value
        int total = 0;
        for (EvalContext targetCtx : targets) {
            total += value.calculate(targetCtx);
        }
        
        return (int)(total * weight);
    }
    
    public String getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public double getWeight() { return weight; }
}

