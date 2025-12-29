package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;
import java.util.List;

/**
 * Logical combination of conditions (AND, OR, NOT).
 */
public class LogicalCondition implements Condition {
    public enum Operator {
        AND, OR, NOT
    }
    
    private final Operator operator;
    private final List<Condition> conditions;
    
    public LogicalCondition(Operator operator, List<Condition> conditions) {
        this.operator = operator;
        this.conditions = conditions;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        switch (operator) {
            case AND:
                for (Condition cond : conditions) {
                    if (!cond.evaluate(ctx)) {
                        return false;
                    }
                }
                return true;
                
            case OR:
                for (Condition cond : conditions) {
                    if (cond.evaluate(ctx)) {
                        return true;
                    }
                }
                return false;
                
            case NOT:
                return !conditions.get(0).evaluate(ctx);
                
            default:
                return false;
        }
    }
}

