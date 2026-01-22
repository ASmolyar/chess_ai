package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that selects pieces of a specific type for counting material.
 */
public class SimpleMaterialTarget implements Target {
    private final int pieceType;
    
    public SimpleMaterialTarget(int pieceType) {
        this.pieceType = pieceType;
    }
    
    /**
     * Constructor accepting string piece type name.
     */
    public SimpleMaterialTarget(String pieceTypeName) {
        this.pieceType = pieceTypeFromString(pieceTypeName);
    }
    
    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long pieces = ctx.position.pieces(ctx.color, pieceType);
        long[] piecesArr = {pieces};
        
        while (piecesArr[0] != 0) {
            int sq = popLsb(piecesArr);
            result.add(ctx.withSquare(sq).withPieceType(pieceType));
        }
        
        return result;
    }
}

