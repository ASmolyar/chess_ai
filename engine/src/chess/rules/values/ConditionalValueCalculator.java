package chess.rules.values;

import chess.rules.ValueCalculator;
import chess.rules.EvalContext;
import java.util.List;

/**
 * Calculator that returns different values based on measurement ranges.
 */
public class ConditionalValueCalculator implements ValueCalculator {
    
    public static class Range {
        public final double min;
        public final double max;
        public final int value;
        
        public Range(double min, double max, int value) {
            this.min = min;
            this.max = max;
            this.value = value;
        }
        
        public boolean contains(double measurement) {
            return measurement >= min && measurement < max;
        }
    }
    
    private final List<Range> ranges;
    private final int defaultValue;
    
    public ConditionalValueCalculator(List<Range> ranges, int defaultValue) {
        this.ranges = ranges;
        this.defaultValue = defaultValue;
    }
    
    @Override
    public int calculate(EvalContext ctx) {
        for (Range range : ranges) {
            if (range.contains(ctx.measurement)) {
                return range.value;
            }
        }
        return defaultValue;
    }
}

