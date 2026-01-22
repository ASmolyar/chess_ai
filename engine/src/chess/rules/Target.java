package chess.rules;

import java.util.List;

/**
 * Interface for target selection - identifies what pieces/squares to evaluate.
 */
public interface Target {
    /**
     * Select target contexts for evaluation.
     * @param ctx The base evaluation context
     * @return List of contexts to evaluate (one per piece/square/etc)
     */
    List<EvalContext> select(EvalContext ctx);
}



