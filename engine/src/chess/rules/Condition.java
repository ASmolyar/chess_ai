package chess.rules;

/**
 * Interface for rule conditions that determine when a rule applies.
 */
public interface Condition {
    /**
     * Evaluate whether this condition is met.
     * @param ctx The evaluation context
     * @return true if the condition is satisfied
     */
    boolean evaluate(EvalContext ctx);
}



