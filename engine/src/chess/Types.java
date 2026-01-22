package chess;

/**
 * Core chess types: enums, constants, and the Move class.
 */
public class Types {
    
    // Colors
    public static final int WHITE = 0;
    public static final int BLACK = 1;
    public static final int COLOR_NB = 2;
    
    // Piece types
    public static final int NO_PIECE_TYPE = 0;
    public static final int PAWN = 1;
    public static final int KNIGHT = 2;
    public static final int BISHOP = 3;
    public static final int ROOK = 4;
    public static final int QUEEN = 5;
    public static final int KING = 6;
    public static final int PIECE_TYPE_NB = 7;
    
    // Pieces (color * 8 + pieceType, but we use 0-6 for white, 8-14 for black)
    public static final int NO_PIECE = 0;
    public static final int W_PAWN = 1;
    public static final int W_KNIGHT = 2;
    public static final int W_BISHOP = 3;
    public static final int W_ROOK = 4;
    public static final int W_QUEEN = 5;
    public static final int W_KING = 6;
    public static final int B_PAWN = 9;
    public static final int B_KNIGHT = 10;
    public static final int B_BISHOP = 11;
    public static final int B_ROOK = 12;
    public static final int B_QUEEN = 13;
    public static final int B_KING = 14;
    public static final int PIECE_NB = 16;
    
    // Squares (a1=0, b1=1, ..., h8=63)
    public static final int SQ_A1 = 0, SQ_B1 = 1, SQ_C1 = 2, SQ_D1 = 3;
    public static final int SQ_E1 = 4, SQ_F1 = 5, SQ_G1 = 6, SQ_H1 = 7;
    public static final int SQ_A2 = 8, SQ_B2 = 9, SQ_C2 = 10, SQ_D2 = 11;
    public static final int SQ_E2 = 12, SQ_F2 = 13, SQ_G2 = 14, SQ_H2 = 15;
    public static final int SQ_A3 = 16, SQ_B3 = 17, SQ_C3 = 18, SQ_D3 = 19;
    public static final int SQ_E3 = 20, SQ_F3 = 21, SQ_G3 = 22, SQ_H3 = 23;
    public static final int SQ_A4 = 24, SQ_B4 = 25, SQ_C4 = 26, SQ_D4 = 27;
    public static final int SQ_E4 = 28, SQ_F4 = 29, SQ_G4 = 30, SQ_H4 = 31;
    public static final int SQ_A5 = 32, SQ_B5 = 33, SQ_C5 = 34, SQ_D5 = 35;
    public static final int SQ_E5 = 36, SQ_F5 = 37, SQ_G5 = 38, SQ_H5 = 39;
    public static final int SQ_A6 = 40, SQ_B6 = 41, SQ_C6 = 42, SQ_D6 = 43;
    public static final int SQ_E6 = 44, SQ_F6 = 45, SQ_G6 = 46, SQ_H6 = 47;
    public static final int SQ_A7 = 48, SQ_B7 = 49, SQ_C7 = 50, SQ_D7 = 51;
    public static final int SQ_E7 = 52, SQ_F7 = 53, SQ_G7 = 54, SQ_H7 = 55;
    public static final int SQ_A8 = 56, SQ_B8 = 57, SQ_C8 = 58, SQ_D8 = 59;
    public static final int SQ_E8 = 60, SQ_F8 = 61, SQ_G8 = 62, SQ_H8 = 63;
    public static final int SQ_NONE = 64;
    public static final int SQUARE_NB = 64;
    
    // Files and Ranks
    public static final int FILE_A = 0, FILE_B = 1, FILE_C = 2, FILE_D = 3;
    public static final int FILE_E = 4, FILE_F = 5, FILE_G = 6, FILE_H = 7;
    public static final int FILE_NB = 8;
    
    public static final int RANK_1 = 0, RANK_2 = 1, RANK_3 = 2, RANK_4 = 3;
    public static final int RANK_5 = 4, RANK_6 = 5, RANK_7 = 6, RANK_8 = 7;
    public static final int RANK_NB = 8;
    
    // Directions
    public static final int NORTH = 8;
    public static final int SOUTH = -8;
    public static final int EAST = 1;
    public static final int WEST = -1;
    public static final int NORTH_EAST = 9;
    public static final int NORTH_WEST = 7;
    public static final int SOUTH_EAST = -7;
    public static final int SOUTH_WEST = -9;
    
    // Castling rights
    public static final int NO_CASTLING = 0;
    public static final int WHITE_OO = 1;
    public static final int WHITE_OOO = 2;
    public static final int BLACK_OO = 4;
    public static final int BLACK_OOO = 8;
    public static final int WHITE_CASTLING = WHITE_OO | WHITE_OOO;
    public static final int BLACK_CASTLING = BLACK_OO | BLACK_OOO;
    public static final int ALL_CASTLING = WHITE_CASTLING | BLACK_CASTLING;
    
    // Move types
    public static final int NORMAL = 0;
    public static final int PROMOTION = 1;
    public static final int EN_PASSANT = 2;
    public static final int CASTLING = 3;
    
    // Scores
    public static final int SCORE_NONE = -32002;
    public static final int SCORE_DRAW = 0;
    public static final int SCORE_INFINITE = 32001;
    public static final int SCORE_MATE = 32000;
    public static final int SCORE_MATE_IN_MAX_PLY = SCORE_MATE - 128;
    
    // TT flags
    public static final int TT_NONE = 0;
    public static final int TT_EXACT = 1;
    public static final int TT_ALPHA = 2;
    public static final int TT_BETA = 3;
    
    // Starting FEN
    public static final String START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    
    // Utility functions
    public static int makeSquare(int file, int rank) {
        return rank * 8 + file;
    }
    
    public static int fileOf(int sq) {
        return sq & 7;
    }
    
    public static int rankOf(int sq) {
        return sq >>> 3;
    }
    
    public static int makePiece(int color, int pieceType) {
        return (color << 3) + pieceType;
    }
    
    public static int pieceType(int piece) {
        return piece & 7;
    }
    
    public static int pieceColor(int piece) {
        return piece >>> 3;
    }
    
    public static int opposite(int color) {
        return color ^ 1;
    }
    
    public static int matedIn(int ply) {
        return -SCORE_MATE + ply;
    }
    
    public static int mateIn(int ply) {
        return SCORE_MATE - ply;
    }
    
    /**
     * Convert piece type name to int constant.
     * @param name Piece name: "pawn", "knight", "bishop", "rook", "queen", "king", or "any"
     * @return Piece type constant, or NO_PIECE_TYPE if invalid
     */
    public static int pieceTypeFromString(String name) {
        if (name == null) return NO_PIECE_TYPE;
        switch (name.toLowerCase().trim()) {
            case "pawn": case "p": return PAWN;
            case "knight": case "n": return KNIGHT;
            case "bishop": case "b": return BISHOP;
            case "rook": case "r": return ROOK;
            case "queen": case "q": return QUEEN;
            case "king": case "k": return KING;
            case "any": case "all": return NO_PIECE_TYPE; // Special: means all pieces
            default: return NO_PIECE_TYPE;
        }
    }
    
    /**
     * Convert color name to int constant.
     * @param name Color name: "white", "black", "my", "opponent"
     * @param perspective The side evaluating (for "my"/"opponent" resolution)
     * @return Color constant
     */
    public static int colorFromString(String name, int perspective) {
        if (name == null) return WHITE;
        switch (name.toLowerCase().trim()) {
            case "white": case "w": return WHITE;
            case "black": case "b": return BLACK;
            case "my": return perspective;
            case "opponent": case "enemy": return opposite(perspective);
            default: return WHITE;
        }
    }
    
    /**
     * Convert piece type int to name string.
     */
    public static String pieceTypeName(int pieceType) {
        switch (pieceType) {
            case PAWN: return "pawn";
            case KNIGHT: return "knight";
            case BISHOP: return "bishop";
            case ROOK: return "rook";
            case QUEEN: return "queen";
            case KING: return "king";
            default: return "any";
        }
    }
    
    /**
     * Move representation - packed into a 16-bit short:
     * bits 0-5: from square
     * bits 6-11: to square
     * bits 12-13: move type (normal, promotion, en passant, castling)
     * bits 14-15: promotion piece type (knight=0, bishop=1, rook=2, queen=3)
     */
    public static class Move {
        public static final short NONE = 0;
        
        private final short data;
        
        public Move(short data) {
            this.data = data;
        }
        
        public Move(int from, int to) {
            this.data = (short) ((from & 0x3F) | ((to & 0x3F) << 6));
        }
        
        public Move(int from, int to, int type, int promoPiece) {
            this.data = (short) ((from & 0x3F) | ((to & 0x3F) << 6) | 
                                 ((type & 0x3) << 12) | ((promoPiece & 0x3) << 14));
        }
        
        public static Move make(int from, int to) {
            return new Move(from, to);
        }
        
        public static Move makePromotion(int from, int to, int promoPiece) {
            // promoPiece: KNIGHT=2, BISHOP=3, ROOK=4, QUEEN=5 -> encode as 0,1,2,3
            return new Move(from, to, PROMOTION, promoPiece - KNIGHT);
        }
        
        public static Move makeEnPassant(int from, int to) {
            return new Move(from, to, EN_PASSANT, 0);
        }
        
        public static Move makeCastling(int from, int to) {
            return new Move(from, to, CASTLING, 0);
        }
        
        public int from() {
            return data & 0x3F;
        }
        
        public int to() {
            return (data >>> 6) & 0x3F;
        }
        
        public int type() {
            return (data >>> 12) & 0x3;
        }
        
        public int promotionType() {
            return ((data >>> 14) & 0x3) + KNIGHT;
        }
        
        public short raw() {
            return data;
        }
        
        public boolean isNull() {
            return data == 0;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Move)) return false;
            return data == ((Move) o).data;
        }
        
        @Override
        public int hashCode() {
            return data;
        }
        
        public String toUCI() {
            if (isNull()) return "(none)";
            
            StringBuilder sb = new StringBuilder();
            sb.append((char) ('a' + fileOf(from())));
            sb.append((char) ('1' + rankOf(from())));
            sb.append((char) ('a' + fileOf(to())));
            sb.append((char) ('1' + rankOf(to())));
            
            if (type() == PROMOTION) {
                sb.append("nbrq".charAt(promotionType() - KNIGHT));
            }
            
            return sb.toString();
        }
        
        public static Move fromUCI(String uci) {
            if (uci == null || uci.length() < 4) return new Move(NONE);
            
            int fromFile = uci.charAt(0) - 'a';
            int fromRank = uci.charAt(1) - '1';
            int toFile = uci.charAt(2) - 'a';
            int toRank = uci.charAt(3) - '1';
            
            int from = makeSquare(fromFile, fromRank);
            int to = makeSquare(toFile, toRank);
            
            // Note: promotion, castling, en passant need to be determined by Position
            if (uci.length() >= 5) {
                char promo = uci.charAt(4);
                int promoPiece = QUEEN;
                switch (promo) {
                    case 'n': promoPiece = KNIGHT; break;
                    case 'b': promoPiece = BISHOP; break;
                    case 'r': promoPiece = ROOK; break;
                    case 'q': promoPiece = QUEEN; break;
                }
                return makePromotion(from, to, promoPiece);
            }
            
            return make(from, to);
        }
    }
    
    /**
     * Move list - simple array-based list for efficiency
     */
    public static class MoveList {
        public static final int MAX_MOVES = 256;
        
        private final Move[] moves = new Move[MAX_MOVES];
        private int size = 0;
        
        public void add(Move m) {
            moves[size++] = m;
        }
        
        public Move get(int index) {
            return moves[index];
        }
        
        public void set(int index, Move m) {
            moves[index] = m;
        }
        
        public int size() {
            return size;
        }
        
        public void clear() {
            size = 0;
        }
        
        public void swap(int i, int j) {
            Move temp = moves[i];
            moves[i] = moves[j];
            moves[j] = temp;
        }
    }
}

