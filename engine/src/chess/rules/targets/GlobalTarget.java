package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;

/**
 * Target for global position evaluation (returns a single context).
 * Used for bonuses that apply once per position.
 */
public class GlobalTarget implements Target {
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        result.add(ctx);
        return result;
    }
}



