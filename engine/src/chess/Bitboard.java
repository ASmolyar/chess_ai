package chess;

import static chess.Types.*;

/**
 * Bitboard utilities and magic bitboard attack generation.
 */
public class Bitboard {
    
    // Rank and file bitboards
    public static final long RANK_1_BB = 0xFFL;
    public static final long RANK_2_BB = 0xFF00L;
    public static final long RANK_3_BB = 0xFF0000L;
    public static final long RANK_4_BB = 0xFF000000L;
    public static final long RANK_5_BB = 0xFF00000000L;
    public static final long RANK_6_BB = 0xFF0000000000L;
    public static final long RANK_7_BB = 0xFF000000000000L;
    public static final long RANK_8_BB = 0xFF00000000000000L;
    
    public static final long FILE_A_BB = 0x0101010101010101L;
    public static final long FILE_B_BB = 0x0202020202020202L;
    public static final long FILE_C_BB = 0x0404040404040404L;
    public static final long FILE_D_BB = 0x0808080808080808L;
    public static final long FILE_E_BB = 0x1010101010101010L;
    public static final long FILE_F_BB = 0x2020202020202020L;
    public static final long FILE_G_BB = 0x4040404040404040L;
    public static final long FILE_H_BB = 0x8080808080808080L;
    
    public static final long[] RANK_BB = {
        RANK_1_BB, RANK_2_BB, RANK_3_BB, RANK_4_BB,
        RANK_5_BB, RANK_6_BB, RANK_7_BB, RANK_8_BB
    };
    
    public static final long[] FILE_BB = {
        FILE_A_BB, FILE_B_BB, FILE_C_BB, FILE_D_BB,
        FILE_E_BB, FILE_F_BB, FILE_G_BB, FILE_H_BB
    };
    
    // Pre-computed attack tables
    public static final long[][] PAWN_ATTACKS = new long[2][64];
    public static final long[] KNIGHT_ATTACKS = new long[64];
    public static final long[] KING_ATTACKS = new long[64];
    public static final long[][] BETWEEN_BB = new long[64][64];
    public static final long[][] LINE_BB = new long[64][64];
    
    // Magic bitboard data
    private static final long[] ROOK_MAGICS = new long[64];
    private static final long[] BISHOP_MAGICS = new long[64];
    private static final int[] ROOK_SHIFTS = new int[64];
    private static final int[] BISHOP_SHIFTS = new int[64];
    private static final long[] ROOK_MASKS = new long[64];
    private static final long[] BISHOP_MASKS = new long[64];
    private static final long[][] ROOK_ATTACKS = new long[64][];
    private static final long[][] BISHOP_ATTACKS = new long[64][];
    
    // Pre-computed magic numbers
    private static final long[] ROOK_MAGIC_NUMBERS = {
        0x8a80104000800020L, 0x140002000100040L, 0x2801880a0017001L, 0x100081001000420L,
        0x200020010080420L, 0x3001c0002010008L, 0x8480008002000100L, 0x2080088004402900L,
        0x800098204000L, 0x2024401000200040L, 0x100802000801000L, 0x120800800801000L,
        0x208808088000400L, 0x2802200800400L, 0x2200800100020080L, 0x801000060821100L,
        0x80044006422000L, 0x100808020004000L, 0x12108a0010204200L, 0x140848010000802L,
        0x481828014002800L, 0x8094004002004100L, 0x4010040010010802L, 0x20008806104L,
        0x100400080208000L, 0x2040002120081000L, 0x21200680100081L, 0x20100080080080L,
        0x2000a00200410L, 0x20080800400L, 0x80088400100102L, 0x80004600042881L,
        0x4040008040800020L, 0x440003000200801L, 0x4200011004500L, 0x188020010100100L,
        0x14800401802800L, 0x2080040080800200L, 0x124080204001001L, 0x200046502000484L,
        0x480400080088020L, 0x1000422010034000L, 0x30200100110040L, 0x100021010009L,
        0x2002080100110004L, 0x202008004008002L, 0x20020004010100L, 0x2048440040820001L,
        0x101002200408200L, 0x40802000401080L, 0x4008142004410100L, 0x2060820c0120200L,
        0x1001004080100L, 0x20c020080040080L, 0x2935610830022400L, 0x44440041009200L,
        0x280001040802101L, 0x2100190040002085L, 0x80c0084100102001L, 0x4024081001000421L,
        0x20030a0244872L, 0x12001008414402L, 0x2006104900a0804L, 0x1004081002402L
    };
    
    private static final long[] BISHOP_MAGIC_NUMBERS = {
        0x40040844404084L, 0x2004208a004208L, 0x10190041080202L, 0x108060845042010L,
        0x581104180800210L, 0x2112080446200010L, 0x1080820820060210L, 0x3c0808410220200L,
        0x4050404440404L, 0x21001420088L, 0x24d0080801082102L, 0x1020a0a020400L,
        0x40308200402L, 0x4011002100800L, 0x401484104104005L, 0x801010402020200L,
        0x400210c3880100L, 0x404022024108200L, 0x810018200204102L, 0x4002801a02003L,
        0x85040820080400L, 0x810102c808880400L, 0xe900410884800L, 0x8002020480840102L,
        0x220200865090201L, 0x2010100a02021202L, 0x152048408022401L, 0x20080002081110L,
        0x4001001021004000L, 0x800040400a011002L, 0xe4004081011002L, 0x1c004001012080L,
        0x8004200962a00220L, 0x8422100208500202L, 0x2000402200300c08L, 0x8646020080080080L,
        0x80020a0200100808L, 0x2010004880111000L, 0x623000a080011400L, 0x42008c0340209202L,
        0x209188240001000L, 0x400408a884001800L, 0x110400a6080400L, 0x1840060a44020800L,
        0x90080104000041L, 0x201011000808101L, 0x1a2208080504f080L, 0x8012020600211212L,
        0x500861011240000L, 0x180806108200800L, 0x4000020e01040044L, 0x300000261044000aL,
        0x802241102020002L, 0x20906061210001L, 0x5a84841004010310L, 0x4010801011c04L,
        0xa010109502200L, 0x4a02012000L, 0x500201010098b028L, 0x8040002811040900L,
        0x28000010020204L, 0x6000020202d0240L, 0x8918844842082200L, 0x4010011029020020L
    };
    
    private static boolean initialized = false;
    
    /**
     * Initialize all bitboard tables. Must be called before using the engine.
     */
    public static synchronized void init() {
        if (initialized) return;
        
        initPawnAttacks();
        initKnightAttacks();
        initKingAttacks();
        initMagics();
        initBetweenAndLine();
        
        initialized = true;
    }
    
    private static void initPawnAttacks() {
        for (int sq = 0; sq < 64; sq++) {
            long b = squareBB(sq);
            PAWN_ATTACKS[WHITE][sq] = shift(b, NORTH_WEST) | shift(b, NORTH_EAST);
            PAWN_ATTACKS[BLACK][sq] = shift(b, SOUTH_WEST) | shift(b, SOUTH_EAST);
        }
    }
    
    private static void initKnightAttacks() {
        int[][] deltas = {{-2,-1}, {-2,1}, {-1,-2}, {-1,2}, {1,-2}, {1,2}, {2,-1}, {2,1}};
        for (int sq = 0; sq < 64; sq++) {
            long attacks = 0;
            int r = rankOf(sq), f = fileOf(sq);
            for (int[] d : deltas) {
                int nr = r + d[0], nf = f + d[1];
                if (nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7) {
                    attacks |= squareBB(makeSquare(nf, nr));
                }
            }
            KNIGHT_ATTACKS[sq] = attacks;
        }
    }
    
    private static void initKingAttacks() {
        int[][] deltas = {{-1,-1}, {-1,0}, {-1,1}, {0,-1}, {0,1}, {1,-1}, {1,0}, {1,1}};
        for (int sq = 0; sq < 64; sq++) {
            long attacks = 0;
            int r = rankOf(sq), f = fileOf(sq);
            for (int[] d : deltas) {
                int nr = r + d[0], nf = f + d[1];
                if (nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7) {
                    attacks |= squareBB(makeSquare(nf, nr));
                }
            }
            KING_ATTACKS[sq] = attacks;
        }
    }
    
    private static void initMagics() {
        for (int sq = 0; sq < 64; sq++) {
            // Rook masks and magics
            ROOK_MASKS[sq] = rookMask(sq);
            ROOK_MAGICS[sq] = ROOK_MAGIC_NUMBERS[sq];
            ROOK_SHIFTS[sq] = 64 - Long.bitCount(ROOK_MASKS[sq]);
            
            int rookSize = 1 << Long.bitCount(ROOK_MASKS[sq]);
            ROOK_ATTACKS[sq] = new long[rookSize];
            
            long occ = 0;
            do {
                int idx = (int) ((occ * ROOK_MAGICS[sq]) >>> ROOK_SHIFTS[sq]);
                ROOK_ATTACKS[sq][idx] = rookAttacksSlow(sq, occ);
                occ = (occ - ROOK_MASKS[sq]) & ROOK_MASKS[sq];
            } while (occ != 0);
            
            // Bishop masks and magics
            BISHOP_MASKS[sq] = bishopMask(sq);
            BISHOP_MAGICS[sq] = BISHOP_MAGIC_NUMBERS[sq];
            BISHOP_SHIFTS[sq] = 64 - Long.bitCount(BISHOP_MASKS[sq]);
            
            int bishopSize = 1 << Long.bitCount(BISHOP_MASKS[sq]);
            BISHOP_ATTACKS[sq] = new long[bishopSize];
            
            occ = 0;
            do {
                int idx = (int) ((occ * BISHOP_MAGICS[sq]) >>> BISHOP_SHIFTS[sq]);
                BISHOP_ATTACKS[sq][idx] = bishopAttacksSlow(sq, occ);
                occ = (occ - BISHOP_MASKS[sq]) & BISHOP_MASKS[sq];
            } while (occ != 0);
        }
    }
    
    private static void initBetweenAndLine() {
        for (int s1 = 0; s1 < 64; s1++) {
            for (int s2 = 0; s2 < 64; s2++) {
                if (s1 == s2) continue;
                
                long sqs = squareBB(s1) | squareBB(s2);
                
                // Check if on same file or rank
                if (fileOf(s1) == fileOf(s2) || rankOf(s1) == rankOf(s2)) {
                    LINE_BB[s1][s2] = (rookAttacks(s1, 0) & rookAttacks(s2, 0)) | sqs;
                    BETWEEN_BB[s1][s2] = rookAttacks(s1, sqs) & rookAttacks(s2, sqs);
                } else if ((bishopAttacks(s1, 0) & squareBB(s2)) != 0) {
                    LINE_BB[s1][s2] = (bishopAttacks(s1, 0) & bishopAttacks(s2, 0)) | sqs;
                    BETWEEN_BB[s1][s2] = bishopAttacks(s1, sqs) & bishopAttacks(s2, sqs);
                }
            }
        }
    }
    
    private static long rookMask(int sq) {
        long attacks = rookAttacksSlow(sq, 0);
        // Remove edge squares
        long edges = ((RANK_1_BB | RANK_8_BB) & ~RANK_BB[rankOf(sq)]) |
                     ((FILE_A_BB | FILE_H_BB) & ~FILE_BB[fileOf(sq)]);
        return attacks & ~edges;
    }
    
    private static long bishopMask(int sq) {
        long attacks = bishopAttacksSlow(sq, 0);
        // Remove edge squares
        long edges = RANK_1_BB | RANK_8_BB | FILE_A_BB | FILE_H_BB;
        return attacks & ~edges;
    }
    
    private static long rookAttacksSlow(int sq, long occupied) {
        int[][] deltas = {{1,0}, {-1,0}, {0,1}, {0,-1}};
        return slidingAttacks(sq, occupied, deltas);
    }
    
    private static long bishopAttacksSlow(int sq, long occupied) {
        int[][] deltas = {{1,1}, {1,-1}, {-1,1}, {-1,-1}};
        return slidingAttacks(sq, occupied, deltas);
    }
    
    private static long slidingAttacks(int sq, long occupied, int[][] deltas) {
        long attacks = 0;
        for (int[] d : deltas) {
            int dr = d[0], df = d[1];
            int r = rankOf(sq) + dr;
            int f = fileOf(sq) + df;
            while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
                int s = makeSquare(f, r);
                attacks |= squareBB(s);
                if ((occupied & squareBB(s)) != 0) break;
                r += dr;
                f += df;
            }
        }
        return attacks;
    }
    
    // Public attack generation functions
    
    public static long squareBB(int sq) {
        return 1L << sq;
    }
    
    public static long pawnAttacks(int color, int sq) {
        return PAWN_ATTACKS[color][sq];
    }
    
    public static long knightAttacks(int sq) {
        return KNIGHT_ATTACKS[sq];
    }
    
    public static long kingAttacks(int sq) {
        return KING_ATTACKS[sq];
    }
    
    public static long rookAttacks(int sq, long occupied) {
        long occ = occupied & ROOK_MASKS[sq];
        int idx = (int) ((occ * ROOK_MAGICS[sq]) >>> ROOK_SHIFTS[sq]);
        return ROOK_ATTACKS[sq][idx];
    }
    
    public static long bishopAttacks(int sq, long occupied) {
        long occ = occupied & BISHOP_MASKS[sq];
        int idx = (int) ((occ * BISHOP_MAGICS[sq]) >>> BISHOP_SHIFTS[sq]);
        return BISHOP_ATTACKS[sq][idx];
    }
    
    public static long queenAttacks(int sq, long occupied) {
        return rookAttacks(sq, occupied) | bishopAttacks(sq, occupied);
    }
    
    public static long between(int s1, int s2) {
        return BETWEEN_BB[s1][s2];
    }
    
    public static long line(int s1, int s2) {
        return LINE_BB[s1][s2];
    }
    
    public static boolean aligned(int s1, int s2, int s3) {
        return (LINE_BB[s1][s2] & squareBB(s3)) != 0;
    }
    
    // Bit manipulation utilities
    
    public static int popcount(long bb) {
        return Long.bitCount(bb);
    }
    
    public static int lsb(long bb) {
        return Long.numberOfTrailingZeros(bb);
    }
    
    public static int popLsb(long[] bb) {
        int sq = lsb(bb[0]);
        bb[0] &= bb[0] - 1;
        return sq;
    }
    
    public static long shift(long bb, int direction) {
        switch (direction) {
            case NORTH:      return bb << 8;
            case SOUTH:      return bb >>> 8;
            case EAST:       return (bb & ~FILE_H_BB) << 1;
            case WEST:       return (bb & ~FILE_A_BB) >>> 1;
            case NORTH_EAST: return (bb & ~FILE_H_BB) << 9;
            case NORTH_WEST: return (bb & ~FILE_A_BB) << 7;
            case SOUTH_EAST: return (bb & ~FILE_H_BB) >>> 7;
            case SOUTH_WEST: return (bb & ~FILE_A_BB) >>> 9;
            default:         return bb;
        }
    }
    
    public static long rankBB(int rank) {
        return RANK_BB[rank];
    }
    
    public static long fileBB(int file) {
        return FILE_BB[file];
    }
}

