package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that detects batteries (aligned attacking pieces).
 * A battery is when two pieces attack along the same line (file, rank, or diagonal).
 * Examples: Queen + Rook on same file, Queen + Bishop on same diagonal.
 * Returns one context per battery found.
 */
public class BatteryTarget implements Target {
    
    public enum BatteryType {
        ROOK_BATTERY,    // Two rooks or rook + queen on file/rank
        BISHOP_BATTERY,  // Two bishops or bishop + queen on diagonal
        ANY              // Any battery
    }
    
    private final BatteryType batteryType;
    
    public BatteryTarget() {
        this.batteryType = BatteryType.ANY;
    }
    
    public BatteryTarget(BatteryType batteryType) {
        this.batteryType = batteryType;
    }
    
    public BatteryTarget(String typeName) {
        switch (typeName.toLowerCase()) {
            case "rook": case "rook_battery": this.batteryType = BatteryType.ROOK_BATTERY; break;
            case "bishop": case "bishop_battery": this.batteryType = BatteryType.BISHOP_BATTERY; break;
            default: this.batteryType = BatteryType.ANY; break;
        }
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long queens = ctx.position.pieces(ctx.color, QUEEN);
        long rooks = ctx.position.pieces(ctx.color, ROOK);
        long bishops = ctx.position.pieces(ctx.color, BISHOP);
        
        // Check rook batteries (rooks/queens on same file or rank)
        if (batteryType == BatteryType.ROOK_BATTERY || batteryType == BatteryType.ANY) {
            long rookLikePieces = rooks | queens;
            int rookBatteries = countRookBatteries(rookLikePieces, ctx.position.pieces());
            if (rookBatteries > 0) {
                result.add(ctx.withPieceType(ROOK).withMeasurement(rookBatteries));
            }
        }
        
        // Check bishop batteries (bishops/queens on same diagonal)
        if (batteryType == BatteryType.BISHOP_BATTERY || batteryType == BatteryType.ANY) {
            long bishopLikePieces = bishops | queens;
            int bishopBatteries = countBishopBatteries(bishopLikePieces, ctx.position.pieces());
            if (bishopBatteries > 0) {
                result.add(ctx.withPieceType(BISHOP).withMeasurement(bishopBatteries));
            }
        }
        
        return result;
    }
    
    private int countRookBatteries(long pieces, long allPieces) {
        int count = 0;
        
        // Check each file
        for (int file = FILE_A; file <= FILE_H; file++) {
            long piecesOnFile = pieces & FILE_BB[file];
            if (popcount(piecesOnFile) >= 2) {
                // Check if they're connected (no pieces between them)
                if (arePiecesConnected(piecesOnFile, allPieces, true)) {
                    count++;
                }
            }
        }
        
        // Check each rank
        for (int rank = RANK_1; rank <= RANK_8; rank++) {
            long piecesOnRank = pieces & RANK_BB[rank];
            if (popcount(piecesOnRank) >= 2) {
                // Check if they're connected
                if (arePiecesConnected(piecesOnRank, allPieces, false)) {
                    count++;
                }
            }
        }
        
        return count;
    }
    
    private int countBishopBatteries(long pieces, long allPieces) {
        int count = 0;
        long checked = 0L;
        
        long[] piecesArr = {pieces};
        while (piecesArr[0] != 0) {
            int sq1 = popLsb(piecesArr);
            if ((checked & (1L << sq1)) != 0) continue;
            
            // Get bishop attacks from this square
            long diagonal = bishopAttacks(sq1, allPieces);
            
            // Check if any other piece is on this diagonal
            long othersOnDiagonal = pieces & diagonal;
            if (othersOnDiagonal != 0) {
                count++;
                checked |= othersOnDiagonal | (1L << sq1);
            }
        }
        
        return count;
    }
    
    private boolean arePiecesConnected(long pieces, long allPieces, boolean isFile) {
        // Get the two pieces
        long[] piecesArr = {pieces};
        int sq1 = popLsb(piecesArr);
        int sq2 = popLsb(piecesArr);
        
        // Check if there are pieces between them
        if (isFile) {
            int rank1 = rankOf(sq1);
            int rank2 = rankOf(sq2);
            int file = fileOf(sq1);
            int minRank = Math.min(rank1, rank2);
            int maxRank = Math.max(rank1, rank2);
            
            for (int r = minRank + 1; r < maxRank; r++) {
                if ((allPieces & (1L << makeSquare(file, r))) != 0) {
                    return false; // There's a piece between them
                }
            }
        } else {
            int file1 = fileOf(sq1);
            int file2 = fileOf(sq2);
            int rank = rankOf(sq1);
            int minFile = Math.min(file1, file2);
            int maxFile = Math.max(file1, file2);
            
            for (int f = minFile + 1; f < maxFile; f++) {
                if ((allPieces & (1L << makeSquare(f, rank))) != 0) {
                    return false;
                }
            }
        }
        
        return true;
    }
}

