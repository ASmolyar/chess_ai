package chess;

/**
 * Interface for position evaluation functions.
 * Allows swapping between different evaluation strategies.
 */
public interface Evaluator {
    
    /**
     * Evaluate position from the perspective of the side to move.
     * @param pos The position to evaluate
     * @return Score in centipawns (positive = side to move is better)
     */
    int evaluate(Position pos);
    
    /**
     * Get the value of a piece type.
     * @param pieceType The piece type (PAWN, KNIGHT, BISHOP, ROOK, QUEEN)
     * @return Value in centipawns
     */
    int getPieceValue(int pieceType);
    
    /**
     * Get a unique name for this evaluator.
     * @return Human-readable name
     */
    String getName();
    
    /**
     * Get a description of this evaluator.
     * @return Description of evaluation strategy
     */
    String getDescription();
}

