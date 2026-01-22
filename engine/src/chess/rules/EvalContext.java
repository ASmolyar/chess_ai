package chess.rules;

import chess.Position;

/**
 * Context passed during evaluation to provide information about
 * the position being evaluated and specific pieces/squares being scored.
 */
public class EvalContext {
    public final Position position;
    public final int color;
    public final int square;       // -1 if not applicable
    public final int pieceType;    // -1 if not applicable
    public final double measurement; // numeric measurement if applicable
    
    public EvalContext(Position position, int color) {
        this(position, color, -1, -1, 0.0);
    }
    
    public EvalContext(Position position, int color, int square, int pieceType) {
        this(position, color, square, pieceType, 0.0);
    }
    
    public EvalContext(Position position, int color, int square, int pieceType, double measurement) {
        this.position = position;
        this.color = color;
        this.square = square;
        this.pieceType = pieceType;
        this.measurement = measurement;
    }
    
    public EvalContext withSquare(int square) {
        return new EvalContext(position, color, square, pieceType, measurement);
    }
    
    public EvalContext withPieceType(int pieceType) {
        return new EvalContext(position, color, square, pieceType, measurement);
    }
    
    public EvalContext withMeasurement(double measurement) {
        return new EvalContext(position, color, square, pieceType, measurement);
    }
}



