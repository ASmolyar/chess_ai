package chess.rules;

/**
 * Interface for calculating the value of a target.
 */
public interface ValueCalculator {
    /**
     * Calculate the value for this context.
     * @param ctx The evaluation context (may include measurement data)
     * @return Score in centipawns
     */
    int calculate(EvalContext ctx);
}



