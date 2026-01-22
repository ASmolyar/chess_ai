package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;

/**
 * Target for check detection.
 * Returns a single context with measurement = 1 if opponent is in check.
 */
public class CheckTarget implements Target {
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        // Check if opponent is in check (we gave check)
        // Note: checkers() returns pieces giving check to side-to-move
        // So if it's our turn and there are checkers, opponent gave check
        // If it's opponent's turn and there are checkers, we gave check
        
        // Since we're evaluating from ctx.color perspective,
        // we need to check if opponent would be in check
        // This is tricky - for now, return based on current state
        
        boolean inCheck = ctx.position.checkers() != 0;
        boolean weGaveCheck = (ctx.position.sideToMove() != ctx.color) && inCheck;
        
        if (weGaveCheck) {
            result.add(ctx.withMeasurement(1.0));
        }
        
        return result;
    }
}



