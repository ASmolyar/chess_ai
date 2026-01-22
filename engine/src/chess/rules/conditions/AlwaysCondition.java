package chess.rules.conditions;

import chess.rules.Condition;
import chess.rules.EvalContext;

/**
 * A condition that is always true (used for unconditional rules).
 */
public class AlwaysCondition implements Condition {
    private static final AlwaysCondition INSTANCE = new AlwaysCondition();
    
    public static AlwaysCondition instance() {
        return INSTANCE;
    }
    
    @Override
    public boolean evaluate(EvalContext ctx) {
        return true;
    }
}



