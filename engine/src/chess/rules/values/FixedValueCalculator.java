package chess.rules.values;

import chess.rules.ValueCalculator;
import chess.rules.EvalContext;

/**
 * Calculator that returns a fixed value.
 */
public class FixedValueCalculator implements ValueCalculator {
    private final int value;
    
    public FixedValueCalculator(int value) {
        this.value = value;
    }
    
    @Override
    public int calculate(EvalContext ctx) {
        return value;
    }
}



