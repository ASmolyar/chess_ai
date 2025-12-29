package chess.rules.values;

import chess.rules.ValueCalculator;
import chess.rules.EvalContext;

/**
 * Calculator that scales a base value by the measurement in the context.
 */
public class ScaledValueCalculator implements ValueCalculator {
    public enum ScaleType {
        LINEAR,        // value = base * measurement
        SQUARE_ROOT,   // value = base * sqrt(measurement)
        QUADRATIC,     // value = base * measurement^2
        EXPONENTIAL    // value = base * 2^(measurement/divisor)
    }
    
    private final int baseValue;
    private final double multiplier;
    private final ScaleType scaleType;
    
    public ScaledValueCalculator(int baseValue, double multiplier, ScaleType scaleType) {
        this.baseValue = baseValue;
        this.multiplier = multiplier;
        this.scaleType = scaleType;
    }
    
    @Override
    public int calculate(EvalContext ctx) {
        double scaled = 0;
        
        switch (scaleType) {
            case LINEAR:
                scaled = baseValue * ctx.measurement * multiplier;
                break;
            case SQUARE_ROOT:
                scaled = baseValue * Math.sqrt(ctx.measurement) * multiplier;
                break;
            case QUADRATIC:
                scaled = baseValue * ctx.measurement * ctx.measurement * multiplier;
                break;
            case EXPONENTIAL:
                scaled = baseValue * Math.pow(2, ctx.measurement * multiplier);
                break;
        }
        
        return (int) scaled;
    }
}

