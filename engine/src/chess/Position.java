package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

import java.util.Random;

/**
 * Chess position representation with make/unmake move support.
 */
public class Position {
    
    // Zobrist hashing tables
    private static final long[][] ZOBRIST_PSQ = new long[PIECE_NB][SQUARE_NB];
    private static final long[] ZOBRIST_EP = new long[FILE_NB];
    private static final long[] ZOBRIST_CASTLING = new long[16];
    private static final long ZOBRIST_SIDE;
    
    static {
        Random rng = new Random(1070372);
        for (int pc = W_PAWN; pc <= B_KING; pc++) {
            if (pc == 7 || pc == 8) continue;
            for (int sq = 0; sq < 64; sq++) {
                ZOBRIST_PSQ[pc][sq] = rng.nextLong();
            }
        }
        for (int f = 0; f < 8; f++) {
            ZOBRIST_EP[f] = rng.nextLong();
        }
        for (int i = 0; i < 16; i++) {
            ZOBRIST_CASTLING[i] = rng.nextLong();
        }
        ZOBRIST_SIDE = rng.nextLong();
    }
    
    // Board representation
    private final int[] board = new int[64];
    private final long[] byTypeBB = new long[PIECE_TYPE_NB];
    private final long[] byColorBB = new long[COLOR_NB];
    
    // State
    private int sideToMove;
    private int castling;
    private int epSquare;
    private int halfMoveClock;
    private int gamePly;
    private long key;
    private long checkers;
    
    // State stack for unmake
    private final StateInfo[] stateStack = new StateInfo[512];
    private int stateIdx = 0;
    
    // History for repetition detection
    private final long[] history = new long[1024];
    private int historyIdx = 0;
    
    public Position() {
        for (int i = 0; i < stateStack.length; i++) {
            stateStack[i] = new StateInfo();
        }
        setStartPos();
    }
    
    public Position(String fen) {
        for (int i = 0; i < stateStack.length; i++) {
            stateStack[i] = new StateInfo();
        }
        setFen(fen);
    }
    
    public void setStartPos() {
        setFen(START_FEN);
    }
    
    public void setFen(String fen) {
        // Clear board
        for (int i = 0; i < 64; i++) board[i] = NO_PIECE;
        for (int i = 0; i < PIECE_TYPE_NB; i++) byTypeBB[i] = 0;
        for (int i = 0; i < COLOR_NB; i++) byColorBB[i] = 0;
        
        String[] parts = fen.split(" ");
        
        // Piece placement
        int sq = SQ_A8;
        for (char c : parts[0].toCharArray()) {
            if (c == '/') {
                sq -= 16;
            } else if (c >= '1' && c <= '8') {
                sq += (c - '0');
            } else {
                int color = Character.isUpperCase(c) ? WHITE : BLACK;
                int pieceType = NO_PIECE_TYPE;
                switch (Character.toLowerCase(c)) {
                    case 'p': pieceType = PAWN; break;
                    case 'n': pieceType = KNIGHT; break;
                    case 'b': pieceType = BISHOP; break;
                    case 'r': pieceType = ROOK; break;
                    case 'q': pieceType = QUEEN; break;
                    case 'k': pieceType = KING; break;
                }
                if (pieceType != NO_PIECE_TYPE) {
                    putPiece(makePiece(color, pieceType), sq);
                    sq++;
                }
            }
        }
        
        // Side to move
        sideToMove = parts.length > 1 && parts[1].equals("b") ? BLACK : WHITE;
        
        // Castling
        castling = NO_CASTLING;
        if (parts.length > 2) {
            for (char c : parts[2].toCharArray()) {
                switch (c) {
                    case 'K': castling |= WHITE_OO; break;
                    case 'Q': castling |= WHITE_OOO; break;
                    case 'k': castling |= BLACK_OO; break;
                    case 'q': castling |= BLACK_OOO; break;
                }
            }
        }
        
        // En passant
        epSquare = SQ_NONE;
        if (parts.length > 3 && !parts[3].equals("-")) {
            int file = parts[3].charAt(0) - 'a';
            int rank = parts[3].charAt(1) - '1';
            epSquare = makeSquare(file, rank);
        }
        
        // Half move clock
        halfMoveClock = parts.length > 4 ? Integer.parseInt(parts[4]) : 0;
        
        // Full move number
        int fullMove = parts.length > 5 ? Integer.parseInt(parts[5]) : 1;
        gamePly = (fullMove - 1) * 2 + (sideToMove == BLACK ? 1 : 0);
        
        key = computeKey();
        checkers = computeCheckers();
        stateIdx = 0;
        historyIdx = 0;
        history[historyIdx++] = key;
    }
    
    public String fen() {
        StringBuilder sb = new StringBuilder();
        
        // Piece placement
        for (int r = RANK_8; r >= RANK_1; r--) {
            int empty = 0;
            for (int f = FILE_A; f <= FILE_H; f++) {
                int pc = pieceOn(makeSquare(f, r));
                if (pc == NO_PIECE) {
                    empty++;
                } else {
                    if (empty > 0) {
                        sb.append(empty);
                        empty = 0;
                    }
                    sb.append(" PNBRQK  pnbrqk".charAt(pc));
                }
            }
            if (empty > 0) sb.append(empty);
            if (r > RANK_1) sb.append('/');
        }
        
        sb.append(' ').append(sideToMove == WHITE ? 'w' : 'b').append(' ');
        
        // Castling
        if (castling == NO_CASTLING) {
            sb.append('-');
        } else {
            if ((castling & WHITE_OO) != 0) sb.append('K');
            if ((castling & WHITE_OOO) != 0) sb.append('Q');
            if ((castling & BLACK_OO) != 0) sb.append('k');
            if ((castling & BLACK_OOO) != 0) sb.append('q');
        }
        
        sb.append(' ');
        
        // En passant
        if (epSquare == SQ_NONE) {
            sb.append('-');
        } else {
            sb.append((char) ('a' + fileOf(epSquare)));
            sb.append((char) ('1' + rankOf(epSquare)));
        }
        
        sb.append(' ').append(halfMoveClock);
        sb.append(' ').append(gamePly / 2 + 1);
        
        return sb.toString();
    }
    
    // Board access
    
    public int pieceOn(int sq) {
        return board[sq];
    }
    
    public long pieces() {
        return byTypeBB[0];
    }
    
    public long pieces(int color) {
        return byColorBB[color];
    }
    
    public long piecesByType(int pieceType1, int pieceType2) {
        return byTypeBB[pieceType1] | byTypeBB[pieceType2];
    }
    
    public long pieces(int color, int pieceType) {
        return byColorBB[color] & byTypeBB[pieceType];
    }
    
    public long pieces(int color, int pt1, int pt2) {
        return byColorBB[color] & (byTypeBB[pt1] | byTypeBB[pt2]);
    }
    
    public int kingSquare(int color) {
        return lsb(pieces(color, KING));
    }
    
    // State access
    
    public int sideToMove() {
        return sideToMove;
    }
    
    public int epSquare() {
        return epSquare;
    }
    
    public boolean canCastle(int cr) {
        return (castling & cr) != 0;
    }
    
    public long checkers() {
        return checkers;
    }
    
    public boolean inCheck() {
        return checkers != 0;
    }
    
    public long key() {
        return key;
    }
    
    // Piece manipulation
    
    private void putPiece(int pc, int sq) {
        board[sq] = pc;
        long bb = squareBB(sq);
        byTypeBB[0] |= bb;
        byTypeBB[pieceType(pc)] |= bb;
        byColorBB[pieceColor(pc)] |= bb;
    }
    
    private void removePiece(int sq) {
        int pc = board[sq];
        long bb = squareBB(sq);
        byTypeBB[0] ^= bb;
        byTypeBB[pieceType(pc)] ^= bb;
        byColorBB[pieceColor(pc)] ^= bb;
        board[sq] = NO_PIECE;
    }
    
    private void movePiece(int from, int to) {
        int pc = board[from];
        long fromTo = squareBB(from) | squareBB(to);
        byTypeBB[0] ^= fromTo;
        byTypeBB[pieceType(pc)] ^= fromTo;
        byColorBB[pieceColor(pc)] ^= fromTo;
        board[from] = NO_PIECE;
        board[to] = pc;
    }
    
    // Key computation
    
    private long computeKey() {
        long k = 0;
        for (int sq = 0; sq < 64; sq++) {
            int pc = pieceOn(sq);
            if (pc != NO_PIECE) {
                k ^= ZOBRIST_PSQ[pc][sq];
            }
        }
        if (epSquare != SQ_NONE) {
            k ^= ZOBRIST_EP[fileOf(epSquare)];
        }
        k ^= ZOBRIST_CASTLING[castling];
        if (sideToMove == BLACK) {
            k ^= ZOBRIST_SIDE;
        }
        return k;
    }
    
    private long computeCheckers() {
        return attackersTo(kingSquare(sideToMove)) & pieces(opposite(sideToMove));
    }
    
    public long attackersTo(int sq) {
        return attackersTo(sq, pieces());
    }
    
    public long attackersTo(int sq, long occupied) {
        return (pawnAttacks(WHITE, sq) & pieces(BLACK, PAWN))
             | (pawnAttacks(BLACK, sq) & pieces(WHITE, PAWN))
             | (knightAttacks(sq) & (byTypeBB[KNIGHT]))
             | (bishopAttacks(sq, occupied) & piecesByType(BISHOP, QUEEN))
             | (rookAttacks(sq, occupied) & piecesByType(ROOK, QUEEN))
             | (kingAttacks(sq) & byTypeBB[KING]);
    }
    
    public boolean isAttacked(int sq, int by) {
        return (attackersTo(sq) & pieces(by)) != 0;
    }
    
    // Make/unmake moves
    
    public void doMove(Move m) {
        StateInfo st = stateStack[stateIdx++];
        st.castling = castling;
        st.epSquare = epSquare;
        st.halfMoveClock = halfMoveClock;
        st.key = key;
        st.checkers = checkers;
        
        int from = m.from();
        int to = m.to();
        int pc = pieceOn(from);
        int captured = (m.type() == EN_PASSANT) ? makePiece(opposite(sideToMove), PAWN) : pieceOn(to);
        
        st.capturedPiece = captured;
        halfMoveClock++;
        
        // Start key update
        long k = key ^ ZOBRIST_SIDE;
        k ^= ZOBRIST_CASTLING[castling];
        if (epSquare != SQ_NONE) {
            k ^= ZOBRIST_EP[fileOf(epSquare)];
        }
        
        // Handle captures
        if (captured != NO_PIECE) {
            int capSq = to;
            if (m.type() == EN_PASSANT) {
                capSq = to + (sideToMove == WHITE ? SOUTH : NORTH);
            }
            removePiece(capSq);
            k ^= ZOBRIST_PSQ[captured][capSq];
            halfMoveClock = 0;
        }
        
        // Move the piece
        k ^= ZOBRIST_PSQ[pc][from] ^ ZOBRIST_PSQ[pc][to];
        movePiece(from, to);
        
        epSquare = SQ_NONE;
        
        // Handle special moves
        if (m.type() == CASTLING) {
            int rfrom, rto;
            if (to > from) { // Kingside
                rfrom = to + 1;
                rto = to - 1;
            } else { // Queenside
                rfrom = to - 2;
                rto = to + 1;
            }
            int rook = pieceOn(rfrom);
            k ^= ZOBRIST_PSQ[rook][rfrom] ^ ZOBRIST_PSQ[rook][rto];
            movePiece(rfrom, rto);
        } else if (m.type() == PROMOTION) {
            int promoted = makePiece(sideToMove, m.promotionType());
            removePiece(to);
            putPiece(promoted, to);
            k ^= ZOBRIST_PSQ[pc][to] ^ ZOBRIST_PSQ[promoted][to];
            halfMoveClock = 0;
        }
        
        // Update castling rights
        castling &= ~CASTLING_RIGHTS_MASK[from];
        castling &= ~CASTLING_RIGHTS_MASK[to];
        
        // Pawn double push - set en passant square
        if (pieceType(pc) == PAWN) {
            halfMoveClock = 0;
            if ((to ^ from) == 16) {
                int epSq = from + (sideToMove == WHITE ? NORTH : SOUTH);
                // Only set if enemy pawn can capture
                if ((pawnAttacks(sideToMove, epSq) & pieces(opposite(sideToMove), PAWN)) != 0) {
                    epSquare = epSq;
                    k ^= ZOBRIST_EP[fileOf(epSq)];
                }
            }
        }
        
        k ^= ZOBRIST_CASTLING[castling];
        key = k;
        
        gamePly++;
        sideToMove = opposite(sideToMove);
        
        checkers = computeCheckers();
        history[historyIdx++] = key;
    }
    
    public void undoMove(Move m) {
        sideToMove = opposite(sideToMove);
        gamePly--;
        historyIdx--;
        
        StateInfo st = stateStack[--stateIdx];
        castling = st.castling;
        epSquare = st.epSquare;
        halfMoveClock = st.halfMoveClock;
        key = st.key;
        checkers = st.checkers;
        
        int from = m.from();
        int to = m.to();
        
        // Undo promotion
        if (m.type() == PROMOTION) {
            removePiece(to);
            putPiece(makePiece(sideToMove, PAWN), to);
        }
        
        // Undo castling
        if (m.type() == CASTLING) {
            int rfrom, rto;
            if (to > from) {
                rfrom = to + 1;
                rto = to - 1;
            } else {
                rfrom = to - 2;
                rto = to + 1;
            }
            movePiece(rto, rfrom);
        }
        
        // Move piece back
        movePiece(to, from);
        
        // Restore captured piece
        if (st.capturedPiece != NO_PIECE) {
            int capSq = to;
            if (m.type() == EN_PASSANT) {
                capSq = to + (sideToMove == WHITE ? SOUTH : NORTH);
            }
            putPiece(st.capturedPiece, capSq);
        }
    }
    
    public void doNullMove() {
        StateInfo st = stateStack[stateIdx++];
        st.castling = castling;
        st.epSquare = epSquare;
        st.halfMoveClock = halfMoveClock;
        st.key = key;
        st.checkers = checkers;
        st.capturedPiece = NO_PIECE;
        st.pliesFromNull = 0;
        
        long k = key ^ ZOBRIST_SIDE;
        if (epSquare != SQ_NONE) {
            k ^= ZOBRIST_EP[fileOf(epSquare)];
        }
        epSquare = SQ_NONE;
        key = k;
        
        gamePly++;
        sideToMove = opposite(sideToMove);
        checkers = computeCheckers();
    }
    
    public void undoNullMove() {
        sideToMove = opposite(sideToMove);
        gamePly--;
        
        StateInfo st = stateStack[--stateIdx];
        castling = st.castling;
        epSquare = st.epSquare;
        halfMoveClock = st.halfMoveClock;
        key = st.key;
        checkers = st.checkers;
    }
    
    // Move legality
    
    public boolean isLegal(Move m) {
        int from = m.from();
        int to = m.to();
        int ksq = kingSquare(sideToMove);
        
        // En passant: check for discovered check
        if (m.type() == EN_PASSANT) {
            int capSq = to + (sideToMove == WHITE ? SOUTH : NORTH);
            long occupied = (pieces() ^ squareBB(from) ^ squareBB(capSq)) | squareBB(to);
            return (rookAttacks(ksq, occupied) & pieces(opposite(sideToMove), ROOK, QUEEN)) == 0
                && (bishopAttacks(ksq, occupied) & pieces(opposite(sideToMove), BISHOP, QUEEN)) == 0;
        }
        
        // Castling: check squares king passes through
        if (m.type() == CASTLING) {
            int step = to > from ? EAST : WEST;
            for (int s = from + step; s != to; s += step) {
                if (isAttacked(s, opposite(sideToMove))) return false;
            }
            return !isAttacked(to, opposite(sideToMove));
        }
        
        // King moves: check destination is not attacked
        if (from == ksq) {
            long occupied = pieces() ^ squareBB(from);
            return (attackersTo(to, occupied) & pieces(opposite(sideToMove))) == 0;
        }
        
        // If in check, non-king moves must escape check
        if (checkers != 0) {
            // Double check: only king moves are legal
            if (popcount(checkers) > 1) return false;
            
            int checker = lsb(checkers);
            // Move must capture the checker or interpose
            long target = squareBB(checker) | between(ksq, checker);
            if ((squareBB(to) & target) == 0) return false;
        }
        
        // Check for discovered check (pinned pieces)
        long blockers = (rookAttacks(ksq, 0) & pieces(opposite(sideToMove), ROOK, QUEEN)) |
                        (bishopAttacks(ksq, 0) & pieces(opposite(sideToMove), BISHOP, QUEEN));
        
        if (blockers != 0) {
            long[] blockersArr = {blockers};
            while (blockersArr[0] != 0) {
                int pinner = popLsb(blockersArr);
                long betweenBB = between(ksq, pinner);
                if ((betweenBB & pieces()) == squareBB(from)) {
                    if (!aligned(ksq, from, to)) return false;
                }
            }
        }
        
        return true;
    }
    
    // Draw detection
    
    public boolean isDraw(int ply) {
        // 50 move rule
        if (halfMoveClock >= 100) return true;
        
        // Insufficient material
        if ((byTypeBB[PAWN] | byTypeBB[ROOK] | byTypeBB[QUEEN]) == 0) {
            if (popcount(pieces()) <= 3) return true;
        }
        
        // Repetition
        return hasRepetition(ply);
    }
    
    private boolean hasRepetition(int ply) {
        int end = Math.min(halfMoveClock, stateIdx);
        if (end < 4) return false;
        
        int cnt = 0;
        for (int i = historyIdx - 2; i >= historyIdx - end && i >= 0; i -= 2) {
            if (history[i] == key) {
                if (++cnt >= 2) return true;
                if (i >= historyIdx - ply) return true;
            }
        }
        return false;
    }
    
    // Piece values for SEE
    private static final int[] SEE_PIECE_VALUES = {0, 100, 300, 300, 500, 900, 10000};
    
    /**
     * Static Exchange Evaluation - determines if a capture is winning.
     * Returns true if the capture gains at least 'threshold' material.
     */
    public boolean seeGe(Move m, int threshold) {
        int from = m.from();
        int to = m.to();
        
        int attacker = pieceOn(from);
        int victim = pieceOn(to);
        
        // Handle en passant
        if (m.type() == EN_PASSANT) {
            victim = makePiece(opposite(sideToMove), PAWN);
        }
        
        // Handle promotion - the promoted piece is what attacks after first capture
        int attackerType = pieceType(attacker);
        if (m.type() == PROMOTION) {
            attackerType = m.promotionType();
        }
        
        // Initial gain from the capture
        int gain = SEE_PIECE_VALUES[pieceType(victim)];
        if (m.type() == PROMOTION) {
            gain += SEE_PIECE_VALUES[m.promotionType()] - SEE_PIECE_VALUES[PAWN];
        }
        
        // If we can't even beat threshold with best case, fail immediately
        if (gain < threshold) {
            return false;
        }
        
        // Balance is what we stand to lose if opponent recaptures
        int balance = gain - threshold;
        
        // If even losing our piece still beats threshold, succeed
        if (balance >= SEE_PIECE_VALUES[attackerType]) {
            return true;
        }
        
        // Now simulate the exchange
        long occupied = pieces() ^ squareBB(from) ^ squareBB(to);
        if (m.type() == EN_PASSANT) {
            occupied ^= squareBB(to + (sideToMove == WHITE ? SOUTH : NORTH));
        }
        
        long attackers = attackersTo(to, occupied);
        
        // Diagonal and orthogonal sliders for x-ray attacks
        long diagonalSliders = piecesByType(BISHOP, QUEEN);
        long orthogonalSliders = piecesByType(ROOK, QUEEN);
        
        int stm = opposite(sideToMove); // Side to move after initial capture
        int result = 1; // Assume success until proven otherwise
        
        while (true) {
            // Remove used attacker from attackers
            attackers &= occupied;
            
            // Get attackers for side to move
            long stmAttackers = attackers & pieces(stm);
            if (stmAttackers == 0) {
                break;
            }
            
            // Find least valuable attacker
            int pt;
            for (pt = PAWN; pt <= KING; pt++) {
                if ((stmAttackers & byTypeBB[pt]) != 0) {
                    break;
                }
            }
            
            // Switch sides
            stm = opposite(stm);
            
            // Negamax the balance and add the value of the piece captured
            balance = -balance - 1 - SEE_PIECE_VALUES[attackerType];
            attackerType = pt;
            
            // If balance is now non-negative, the current side wins
            if (balance >= 0) {
                // King can't be captured if there are more attackers
                if (pt == KING && (attackers & pieces(stm)) != 0) {
                    stm = opposite(stm);
                }
                break;
            }
            
            // Remove the attacker and add x-ray attackers
            long attackerBB = stmAttackers & byTypeBB[pt];
            occupied ^= (attackerBB & -attackerBB); // Remove LSB attacker
            
            // Add x-ray attackers (pieces behind the one that just captured)
            if (pt == PAWN || pt == BISHOP || pt == QUEEN) {
                attackers |= bishopAttacks(to, occupied) & diagonalSliders;
            }
            if (pt == ROOK || pt == QUEEN) {
                attackers |= rookAttacks(to, occupied) & orthogonalSliders;
            }
        }
        
        return stm != sideToMove;
    }
    
    // Castling rights mask
    private static final int[] CASTLING_RIGHTS_MASK = new int[64];
    static {
        for (int i = 0; i < 64; i++) CASTLING_RIGHTS_MASK[i] = NO_CASTLING;
        CASTLING_RIGHTS_MASK[SQ_A1] = WHITE_OOO;
        CASTLING_RIGHTS_MASK[SQ_E1] = WHITE_CASTLING;
        CASTLING_RIGHTS_MASK[SQ_H1] = WHITE_OO;
        CASTLING_RIGHTS_MASK[SQ_A8] = BLACK_OOO;
        CASTLING_RIGHTS_MASK[SQ_E8] = BLACK_CASTLING;
        CASTLING_RIGHTS_MASK[SQ_H8] = BLACK_OO;
    }
    
    // State info for unmake
    private static class StateInfo {
        int castling;
        int epSquare;
        int halfMoveClock;
        int capturedPiece;
        int pliesFromNull;
        long key;
        long checkers;
    }
}

