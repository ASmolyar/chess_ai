package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Move generation for chess positions.
 */
public class MoveGen {
    
    /**
     * Generate all legal moves for the position.
     */
    public static void generateLegalMoves(Position pos, MoveList list) {
        MoveList pseudo = new MoveList();
        generatePseudoLegalMoves(pos, pseudo);
        
        for (int i = 0; i < pseudo.size(); i++) {
            Move m = pseudo.get(i);
            if (pos.isLegal(m)) {
                list.add(m);
            }
        }
    }
    
    /**
     * Generate all pseudo-legal moves (may leave king in check).
     */
    public static void generatePseudoLegalMoves(Position pos, MoveList list) {
        int us = pos.sideToMove();
        
        generatePawnMoves(pos, list, us, false);
        generateCastling(pos, list, us);
        generatePieceMoves(pos, list, us, KNIGHT, false);
        generatePieceMoves(pos, list, us, BISHOP, false);
        generatePieceMoves(pos, list, us, ROOK, false);
        generatePieceMoves(pos, list, us, QUEEN, false);
        generatePieceMoves(pos, list, us, KING, false);
    }
    
    /**
     * Generate only capture moves (for quiescence search).
     */
    public static void generateCaptures(Position pos, MoveList list) {
        int us = pos.sideToMove();
        
        generatePawnMoves(pos, list, us, true);
        generatePieceMoves(pos, list, us, KNIGHT, true);
        generatePieceMoves(pos, list, us, BISHOP, true);
        generatePieceMoves(pos, list, us, ROOK, true);
        generatePieceMoves(pos, list, us, QUEEN, true);
        generatePieceMoves(pos, list, us, KING, true);
    }
    
    private static void generatePawnMoves(Position pos, MoveList list, int us, boolean capturesOnly) {
        int them = opposite(us);
        int up = us == WHITE ? NORTH : SOUTH;
        int upLeft = us == WHITE ? NORTH_WEST : SOUTH_WEST;
        int upRight = us == WHITE ? NORTH_EAST : SOUTH_EAST;
        long rank3BB = us == WHITE ? RANK_3_BB : RANK_6_BB;
        long rank7BB = us == WHITE ? RANK_7_BB : RANK_2_BB;
        
        long pawns = pos.pieces(us, PAWN);
        long enemies = pos.pieces(them);
        long empty = ~pos.pieces();
        
        long promotingPawns = pawns & rank7BB;
        long nonPromotingPawns = pawns & ~rank7BB;
        
        // Promotions
        if (promotingPawns != 0) {
            long push = shift(promotingPawns, up) & empty;
            long captureLeft = shift(promotingPawns, upLeft) & enemies;
            long captureRight = shift(promotingPawns, upRight) & enemies;
            
            long[] pushArr = {push};
            while (pushArr[0] != 0) {
                int to = popLsb(pushArr);
                int from = to - up;
                list.add(Move.makePromotion(from, to, QUEEN));
                if (!capturesOnly) {
                    list.add(Move.makePromotion(from, to, ROOK));
                    list.add(Move.makePromotion(from, to, BISHOP));
                    list.add(Move.makePromotion(from, to, KNIGHT));
                }
            }
            
            long[] capLeftArr = {captureLeft};
            while (capLeftArr[0] != 0) {
                int to = popLsb(capLeftArr);
                int from = to - upLeft;
                list.add(Move.makePromotion(from, to, QUEEN));
                if (!capturesOnly) {
                    list.add(Move.makePromotion(from, to, ROOK));
                    list.add(Move.makePromotion(from, to, BISHOP));
                    list.add(Move.makePromotion(from, to, KNIGHT));
                }
            }
            
            long[] capRightArr = {captureRight};
            while (capRightArr[0] != 0) {
                int to = popLsb(capRightArr);
                int from = to - upRight;
                list.add(Move.makePromotion(from, to, QUEEN));
                if (!capturesOnly) {
                    list.add(Move.makePromotion(from, to, ROOK));
                    list.add(Move.makePromotion(from, to, BISHOP));
                    list.add(Move.makePromotion(from, to, KNIGHT));
                }
            }
        }
        
        // Captures (including en passant)
        long captureLeft = shift(nonPromotingPawns, upLeft) & enemies;
        long captureRight = shift(nonPromotingPawns, upRight) & enemies;
        
        long[] capLeftArr = {captureLeft};
        while (capLeftArr[0] != 0) {
            int to = popLsb(capLeftArr);
            list.add(Move.make(to - upLeft, to));
        }
        
        long[] capRightArr = {captureRight};
        while (capRightArr[0] != 0) {
            int to = popLsb(capRightArr);
            list.add(Move.make(to - upRight, to));
        }
        
        // En passant
        int epSq = pos.epSquare();
        if (epSq != SQ_NONE) {
            long epAttackers = nonPromotingPawns & pawnAttacks(them, epSq);
            long[] epArr = {epAttackers};
            while (epArr[0] != 0) {
                int from = popLsb(epArr);
                list.add(Move.makeEnPassant(from, epSq));
            }
        }
        
        // Quiet pawn moves
        if (!capturesOnly) {
            long push1 = shift(nonPromotingPawns, up) & empty;
            long push2 = shift(push1 & rank3BB, up) & empty;
            
            long[] push1Arr = {push1};
            while (push1Arr[0] != 0) {
                int to = popLsb(push1Arr);
                list.add(Move.make(to - up, to));
            }
            
            long[] push2Arr = {push2};
            while (push2Arr[0] != 0) {
                int to = popLsb(push2Arr);
                list.add(Move.make(to - up - up, to));
            }
        }
    }
    
    private static void generatePieceMoves(Position pos, MoveList list, int us, int pt, boolean capturesOnly) {
        long targets;
        if (capturesOnly) {
            targets = pos.pieces(opposite(us));
        } else {
            targets = ~pos.pieces(us);
        }
        
        long occupied = pos.pieces();
        long pieces = pos.pieces(us, pt);
        
        long[] piecesArr = {pieces};
        while (piecesArr[0] != 0) {
            int from = popLsb(piecesArr);
            long attacks;
            
            switch (pt) {
                case KNIGHT: attacks = knightAttacks(from); break;
                case BISHOP: attacks = bishopAttacks(from, occupied); break;
                case ROOK:   attacks = rookAttacks(from, occupied); break;
                case QUEEN:  attacks = queenAttacks(from, occupied); break;
                case KING:   attacks = kingAttacks(from); break;
                default:     attacks = 0; break;
            }
            
            attacks &= targets;
            
            long[] attacksArr = {attacks};
            while (attacksArr[0] != 0) {
                int to = popLsb(attacksArr);
                list.add(Move.make(from, to));
            }
        }
    }
    
    private static void generateCastling(Position pos, MoveList list, int us) {
        if (pos.inCheck()) return;
        
        long occupied = pos.pieces();
        int ksq = pos.kingSquare(us);
        
        // Kingside
        int oo = us == WHITE ? WHITE_OO : BLACK_OO;
        if (pos.canCastle(oo)) {
            int kf = us == WHITE ? SQ_F1 : SQ_F8;
            int kg = us == WHITE ? SQ_G1 : SQ_G8;
            long pathMask = squareBB(kf) | squareBB(kg);
            
            if ((pathMask & occupied) == 0) {
                int kto = us == WHITE ? SQ_G1 : SQ_G8;
                list.add(Move.makeCastling(ksq, kto));
            }
        }
        
        // Queenside
        int ooo = us == WHITE ? WHITE_OOO : BLACK_OOO;
        if (pos.canCastle(ooo)) {
            int kb = us == WHITE ? SQ_B1 : SQ_B8;
            int kc = us == WHITE ? SQ_C1 : SQ_C8;
            int kd = us == WHITE ? SQ_D1 : SQ_D8;
            long pathMask = squareBB(kb) | squareBB(kc) | squareBB(kd);
            
            if ((pathMask & occupied) == 0) {
                int kto = us == WHITE ? SQ_C1 : SQ_C8;
                list.add(Move.makeCastling(ksq, kto));
            }
        }
    }
    
    /**
     * Check if position has any legal moves.
     */
    public static boolean hasLegalMoves(Position pos) {
        MoveList list = new MoveList();
        generateLegalMoves(pos, list);
        return list.size() > 0;
    }
}

