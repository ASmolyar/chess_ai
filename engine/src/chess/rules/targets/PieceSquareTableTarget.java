package chess.rules.targets;

import chess.rules.Target;
import chess.rules.EvalContext;
import java.util.ArrayList;
import java.util.List;
import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Target that applies piece-square table values.
 * Each piece type has a table of 64 values representing positional bonuses/penalties.
 * Returns one context per piece with measurement = PST value for that square.
 * 
 * Supports multiple well-known PST presets:
 * - SIMPLIFIED: Tomasz Michniewski's Simplified Evaluation Function (chessprogramming.org)
 * - PESTO_MG: PeSTO middlegame tables (Ronald Friederich, Texel-tuned)
 * - PESTO_EG: PeSTO endgame tables (Ronald Friederich, Texel-tuned)
 * - AGGRESSIVE: Favors central and forward positions
 * - DEFENSIVE: Favors back ranks and king safety
 * - CUSTOM: User-defined
 */
public class PieceSquareTableTarget implements Target {
    
    public enum TableType {
        SIMPLIFIED,     // Tomasz Michniewski's classic tables (chessprogramming.org)
        PESTO_MG,       // PeSTO middlegame tables (Texel-tuned)
        PESTO_EG,       // PeSTO endgame tables (Texel-tuned)
        AGGRESSIVE,     // Favors central and forward positions
        DEFENSIVE,      // Favors back ranks and king safety
        CUSTOM          // User-defined
    }
    
    private final int pieceType;
    private final TableType tableType;
    private final int[] customTable; // Only used if tableType == CUSTOM
    
    public PieceSquareTableTarget(int pieceType) {
        this.pieceType = pieceType;
        this.tableType = TableType.SIMPLIFIED;
        this.customTable = null;
    }
    
    public PieceSquareTableTarget(int pieceType, TableType tableType) {
        this.pieceType = pieceType;
        this.tableType = tableType;
        this.customTable = null;
    }
    
    public PieceSquareTableTarget(String pieceTypeName) {
        this.pieceType = parsePieceType(pieceTypeName);
        this.tableType = TableType.SIMPLIFIED;
        this.customTable = null;
    }
    
    public PieceSquareTableTarget(String pieceTypeName, String tableTypeName) {
        this.pieceType = parsePieceType(pieceTypeName);
        this.tableType = parseTableType(tableTypeName);
        this.customTable = null;
    }
    
    public PieceSquareTableTarget(int pieceType, int[] customTable) {
        this.pieceType = pieceType;
        this.tableType = TableType.CUSTOM;
        this.customTable = customTable;
    }
    
    private static int parsePieceType(String name) {
        if (name == null) return PAWN;
        switch (name.toLowerCase().trim()) {
            case "pawn": return PAWN;
            case "knight": return KNIGHT;
            case "bishop": return BISHOP;
            case "rook": return ROOK;
            case "queen": return QUEEN;
            case "king": return KING;
            default: return PAWN;
        }
    }
    
    private static TableType parseTableType(String name) {
        if (name == null) return TableType.SIMPLIFIED;
        switch (name.toLowerCase().trim()) {
            case "simplified": return TableType.SIMPLIFIED;
            case "classic": return TableType.SIMPLIFIED; // alias
            case "pesto_mg": 
            case "pesto-mg":
            case "pestomg":
            case "middlegame": return TableType.PESTO_MG;
            case "pesto_eg": 
            case "pesto-eg":
            case "pestoeg":
            case "endgame": return TableType.PESTO_EG;
            case "aggressive": return TableType.AGGRESSIVE;
            case "defensive": return TableType.DEFENSIVE;
            default: return TableType.SIMPLIFIED;
        }
    }

    @Override
    public List<EvalContext> select(EvalContext ctx) {
        List<EvalContext> result = new ArrayList<>();
        
        long pieces = ctx.position.pieces(ctx.color, pieceType);
        int[] table = getTable(ctx.color);
        
        long[] piecesArr = {pieces};
        while (piecesArr[0] != 0) {
            int sq = popLsb(piecesArr);
            int pstValue = table[sq];
            
            result.add(ctx.withSquare(sq)
                         .withPieceType(pieceType)
                         .withMeasurement(pstValue));
        }
        
        return result;
    }
    
    /**
     * Get the appropriate PST for the given color.
     * Tables are stored from White's perspective, so flip for Black.
     */
    private int[] getTable(int color) {
        int[] baseTable;
        
        if (tableType == TableType.CUSTOM && customTable != null) {
            baseTable = customTable;
        } else {
            baseTable = getDefaultTable();
        }
        
        // For black, flip the table vertically
        if (color == BLACK) {
            int[] flipped = new int[64];
            for (int sq = 0; sq < 64; sq++) {
                int flippedSq = sq ^ 56; // Flip rank
                flipped[sq] = baseTable[flippedSq];
            }
            return flipped;
        }
        
        return baseTable;
    }
    
    private int[] getDefaultTable() {
        switch (pieceType) {
            case PAWN:   return getPawnTable();
            case KNIGHT: return getKnightTable();
            case BISHOP: return getBishopTable();
            case ROOK:   return getRookTable();
            case QUEEN:  return getQueenTable();
            case KING:   return getKingTable();
            default:     return new int[64];
        }
    }
    
    // =========================================================================
    // PIECE-SQUARE TABLES (from White's perspective, a1=0, h8=63)
    // Values in centipawns. Positive = good square, Negative = bad square.
    // 
    // Layout: a1, b1, c1, d1, e1, f1, g1, h1 (rank 1)
    //         a2, b2, c2, d2, e2, f2, g2, h2 (rank 2)
    //         ... up to rank 8
    // =========================================================================
    
    private int[] getPawnTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame pawn table (Texel-tuned)
                return new int[] {
                      0,   0,   0,   0,   0,   0,   0,   0,  // Rank 1 (no pawns)
                    -35,  -1, -20, -23, -15,  24,  38, -22,  // Rank 2
                    -26,  -4,  -4, -10,   3,   3,  33, -12,  // Rank 3
                    -27,  -2,  -5,  12,  17,   6,  10, -25,  // Rank 4
                    -14,  13,   6,  21,  23,  12,  17, -23,  // Rank 5
                     -6,   7,  26,  31,  65,  56,  25, -20,  // Rank 6
                     98, 134,  61,  95,  68, 126,  34, -11,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8 (promotes)
                };
            case PESTO_EG:
                // PeSTO endgame pawn table (Texel-tuned)
                return new int[] {
                      0,   0,   0,   0,   0,   0,   0,   0,  // Rank 1
                     13,   8,   8,  10,  13,   0,   2,  -7,  // Rank 2
                      4,   7,  -6,   1,   0,  -5,  -1,  -8,  // Rank 3
                     13,   9,  -3,  -7,  -7,  -8,   3,  -1,  // Rank 4
                     32,  24,  13,   5,  -2,   4,  17,  17,  // Rank 5
                     94, 100,  85,  67,  56,  53,  82,  84,  // Rank 6
                    178, 173, 158, 134, 147, 132, 165, 187,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8
                };
            case AGGRESSIVE:
                return new int[] {
                      0,   0,   0,   0,   0,   0,   0,   0,  // Rank 1
                      5,  10,  10, -25, -25,  10,  10,   5,  // Rank 2
                      5,  -5, -10,   0,   0, -10,  -5,   5,  // Rank 3
                      0,   0,   0,  25,  25,   0,   0,   0,  // Rank 4
                      5,   5,  10,  30,  30,  10,   5,   5,  // Rank 5
                     15,  15,  25,  35,  35,  25,  15,  15,  // Rank 6
                     60,  60,  60,  60,  60,  60,  60,  60,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8
                };
            case DEFENSIVE:
                return new int[] {
                      0,   0,   0,   0,   0,   0,   0,   0,  // Rank 1
                     10,  15,  15,  15,  15,  15,  15,  10,  // Rank 2 - protect base
                      5,  10,  10,  10,  10,  10,  10,   5,  // Rank 3
                      0,   5,   5,  10,  10,   5,   5,   0,  // Rank 4
                     -5,   0,   0,   5,   5,   0,   0,  -5,  // Rank 5
                    -10,  -5,  -5,   0,   0,  -5,  -5, -10,  // Rank 6
                    -15, -10, -10, -10, -10, -10, -10, -15,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8
                };
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation Function
                return new int[] {
                      0,   0,   0,   0,   0,   0,   0,   0,  // Rank 1
                      5,  10,  10, -20, -20,  10,  10,   5,  // Rank 2
                      5,  -5, -10,   0,   0, -10,  -5,   5,  // Rank 3
                      0,   0,   0,  20,  20,   0,   0,   0,  // Rank 4
                      5,   5,  10,  25,  25,  10,   5,   5,  // Rank 5
                     10,  10,  20,  30,  30,  20,  10,  10,  // Rank 6
                     50,  50,  50,  50,  50,  50,  50,  50,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8
                };
        }
    }
    
    private int[] getKnightTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame knight table
                return new int[] {
                   -105, -21, -58, -33, -17, -28, -19, -23,  // Rank 1
                    -29, -53, -12,  -3,  -1,  18, -14, -19,  // Rank 2
                    -23,  -9,  12,  10,  19,  17,  25, -16,  // Rank 3
                    -13,   4,  16,  13,  28,  19,  21,  -8,  // Rank 4
                     -9,  17,  19,  53,  37,  69,  18,  22,  // Rank 5
                    -47,  60,  37,  65,  84, 129,  73,  44,  // Rank 6
                    -73, -41,  72,  36,  23,  62,   7, -17,  // Rank 7
                   -167, -89, -34, -49,  61, -97, -15,-107   // Rank 8
                };
            case PESTO_EG:
                // PeSTO endgame knight table
                return new int[] {
                    -29, -51, -23, -15, -22, -18, -50, -64,  // Rank 1
                    -42, -20, -10,  -5,  -2, -20, -23, -44,  // Rank 2
                    -23,  -3,  -1,  15,  10,  -3, -20, -22,  // Rank 3
                    -18,  -6,  16,  25,  16,  17,   4, -18,  // Rank 4
                    -17,   3,  22,  22,  22,  11,   8, -18,  // Rank 5
                    -24, -20,  10,   9,  -1,  -9, -19, -41,  // Rank 6
                    -25,  -8, -25,  -2,  -9, -25, -24, -52,  // Rank 7
                    -58, -38, -13, -28, -31, -27, -63, -99   // Rank 8
                };
            case AGGRESSIVE:
                return new int[] {
                    -50, -30, -30, -30, -30, -30, -30, -50,  // Rank 1
                    -30, -20,   0,  10,  10,   0, -20, -30,  // Rank 2
                    -30,   5,  20,  25,  25,  20,   5, -30,  // Rank 3
                    -30,   0,  25,  35,  35,  25,   0, -30,  // Rank 4
                    -30,   5,  25,  35,  35,  25,   5, -30,  // Rank 5
                    -30,   0,  20,  25,  25,  20,   0, -30,  // Rank 6
                    -30, -20,   0,   5,   5,   0, -20, -30,  // Rank 7
                    -50, -30, -30, -30, -30, -30, -30, -50   // Rank 8
                };
            case DEFENSIVE:
                return new int[] {
                    -40, -25, -20, -20, -20, -20, -25, -40,  // Rank 1
                    -25,   0,   5,   5,   5,   5,   0, -25,  // Rank 2
                    -20,   5,  10,  15,  15,  10,   5, -20,  // Rank 3
                    -20,   0,  15,  20,  20,  15,   0, -20,  // Rank 4
                    -20,   0,  10,  15,  15,  10,   0, -20,  // Rank 5
                    -25, -10,   0,   5,   5,   0, -10, -25,  // Rank 6
                    -40, -30, -20, -15, -15, -20, -30, -40,  // Rank 7
                    -50, -40, -30, -30, -30, -30, -40, -50   // Rank 8
                };
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation Function
                return new int[] {
                    -50, -40, -30, -30, -30, -30, -40, -50,  // Rank 1
                    -40, -20,   0,   5,   5,   0, -20, -40,  // Rank 2
                    -30,   5,  10,  15,  15,  10,   5, -30,  // Rank 3
                    -30,   0,  15,  20,  20,  15,   0, -30,  // Rank 4
                    -30,   5,  15,  20,  20,  15,   5, -30,  // Rank 5
                    -30,   0,  10,  15,  15,  10,   0, -30,  // Rank 6
                    -40, -20,   0,   0,   0,   0, -20, -40,  // Rank 7
                    -50, -40, -30, -30, -30, -30, -40, -50   // Rank 8
                };
        }
    }
    
    private int[] getBishopTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame bishop table
                return new int[] {
                    -33,  -3, -14, -21, -13, -12, -39, -21,  // Rank 1
                      4,  15,  16,   0,   7,  21,  33,   1,  // Rank 2
                      0,  15,  15,  15,  14,  27,  18,  10,  // Rank 3
                     -6,  13,  13,  26,  34,  12,  10,   4,  // Rank 4
                     -4,   5,  19,  50,  37,  37,   7,  -2,  // Rank 5
                    -16,  37,  43,  40,  35,  50,  37,  -2,  // Rank 6
                    -26,  16, -18, -13,  30,  59,  18, -47,  // Rank 7
                    -29,   4, -82, -37, -25, -42,   7,  -8   // Rank 8
                };
            case PESTO_EG:
                // PeSTO endgame bishop table
                return new int[] {
                    -23,  -9, -23,  -5,  -9, -16,  -5, -17,  // Rank 1
                    -14, -18,  -7,  -1,   4,  -9, -15, -27,  // Rank 2
                    -12,  -3,   8,  10,  13,   3,  -7, -15,  // Rank 3
                     -6,   3,  13,  19,   7,  10,  -3,  -9,  // Rank 4
                     -3,   9,  12,   9,  14,  10,   3,   2,  // Rank 5
                      2,  -8,   0,  -1,  -2,   6,   0,   4,  // Rank 6
                     -8,  -4,   7, -12,  -3, -13,  -4, -14,  // Rank 7
                    -14, -21, -11,  -8,  -7,  -9, -17, -24   // Rank 8
                };
            case AGGRESSIVE:
                return new int[] {
                    -20, -10, -10, -10, -10, -10, -10, -20,  // Rank 1
                    -10,  10,   0,   0,   0,   0,  10, -10,  // Rank 2
                    -10,  15,  10,  10,  10,  10,  15, -10,  // Rank 3
                    -10,   0,  15,  15,  15,  15,   0, -10,  // Rank 4
                    -10,   5,  10,  15,  15,  10,   5, -10,  // Rank 5
                    -10,   0,   5,  10,  10,   5,   0, -10,  // Rank 6
                    -10,   0,   0,   0,   0,   0,   0, -10,  // Rank 7
                    -20, -10, -10, -10, -10, -10, -10, -20   // Rank 8
                };
            case DEFENSIVE:
                return new int[] {
                    -10,  -5,  -5,  -5,  -5,  -5,  -5, -10,  // Rank 1
                     -5,  10,  10,   5,   5,  10,  10,  -5,  // Rank 2
                     -5,   5,   5,  10,  10,   5,   5,  -5,  // Rank 3
                     -5,   0,  10,  10,  10,  10,   0,  -5,  // Rank 4
                     -5,   0,   5,  10,  10,   5,   0,  -5,  // Rank 5
                    -10,   0,   0,   0,   0,   0,   0, -10,  // Rank 6
                    -15, -10, -10, -10, -10, -10, -10, -15,  // Rank 7
                    -20, -15, -15, -15, -15, -15, -15, -20   // Rank 8
                };
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation Function
                return new int[] {
                    -20, -10, -10, -10, -10, -10, -10, -20,  // Rank 1
                    -10,   5,   0,   0,   0,   0,   5, -10,  // Rank 2
                    -10,  10,  10,  10,  10,  10,  10, -10,  // Rank 3
                    -10,   0,  10,  10,  10,  10,   0, -10,  // Rank 4
                    -10,   5,   5,  10,  10,   5,   5, -10,  // Rank 5
                    -10,   0,   5,  10,  10,   5,   0, -10,  // Rank 6
                    -10,   0,   0,   0,   0,   0,   0, -10,  // Rank 7
                    -20, -10, -10, -10, -10, -10, -10, -20   // Rank 8
                };
        }
    }
    
    private int[] getRookTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame rook table
                return new int[] {
                    -19, -13,   1,  17,  16,   7, -37, -26,  // Rank 1
                    -44, -16, -20,  -9,  -1,  11,  -6, -71,  // Rank 2
                    -45, -25, -16, -17,   3,   0,  -5, -33,  // Rank 3
                    -36, -26, -12,  -1,   9,  -7,   6, -23,  // Rank 4
                    -24, -11,   7,  26,  24,  35,  -8, -20,  // Rank 5
                     -5,  19,  26,  36,  17,  45,  61,  16,  // Rank 6
                     27,  32,  58,  62,  80,  67,  26,  44,  // Rank 7
                     32,  42,  32,  51,  63,   9,  31,  43   // Rank 8
                };
            case PESTO_EG:
                // PeSTO endgame rook table
                return new int[] {
                     -9,   2,   3,  -1,  -5, -13,   4, -20,  // Rank 1
                     -6,  -6,   0,   2,  -9,  -9, -11,  -3,  // Rank 2
                     -4,   0,  -5,  -1,  -7, -12,  -8, -16,  // Rank 3
                      3,   5,   8,   4,  -5,  -6,  -8, -11,  // Rank 4
                      4,   3,  13,   1,   2,   1,  -1,   2,  // Rank 5
                      7,   7,   7,   5,   4,  -3,  -5,  -3,  // Rank 6
                     11,  13,  13,  11,  -3,   3,   8,   3,  // Rank 7
                     13,  10,  18,  15,  12,  12,   8,   5   // Rank 8
                };
            case AGGRESSIVE:
                return new int[] {
                      0,   0,   5,  10,  10,   5,   0,   0,  // Rank 1
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 2
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 3
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 4
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 5
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 6
                     10,  15,  15,  15,  15,  15,  15,  10,  // Rank 7
                      0,   0,   0,   5,   5,   0,   0,   0   // Rank 8
                };
            case DEFENSIVE:
                return new int[] {
                      5,  10,  10,  10,  10,  10,  10,   5,  // Rank 1
                      0,   5,   5,   5,   5,   5,   5,   0,  // Rank 2
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 3
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 4
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 5
                    -10,  -5,  -5,  -5,  -5,  -5,  -5, -10,  // Rank 6
                    -15, -10, -10, -10, -10, -10, -10, -15,  // Rank 7
                    -20, -15, -15, -15, -15, -15, -15, -20   // Rank 8
                };
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation Function
                return new int[] {
                      0,   0,   0,   5,   5,   0,   0,   0,  // Rank 1
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 2
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 3
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 4
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 5
                     -5,   0,   0,   0,   0,   0,   0,  -5,  // Rank 6
                      5,  10,  10,  10,  10,  10,  10,   5,  // Rank 7
                      0,   0,   0,   0,   0,   0,   0,   0   // Rank 8
                };
        }
    }
    
    private int[] getQueenTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame queen table
                return new int[] {
                     -1, -18,  -9,  10, -15, -25, -31, -50,  // Rank 1
                    -35,  -8,  11,   2,   8,  15,  -3,   1,  // Rank 2
                    -14,   2, -11,  -2,  -5,   2,  14,   5,  // Rank 3
                     -9, -26,  -9, -10,  -2,  -4,   3,  -3,  // Rank 4
                    -27, -27, -16, -16,  -1,  17,  -2,   1,  // Rank 5
                    -13, -17,   7,   8,  29,  56,  47,  57,  // Rank 6
                    -24, -39,  -5,   1, -16,  57,  28,  54,  // Rank 7
                    -28,   0,  29,  12,  59,  44,  43,  45   // Rank 8
                };
            case PESTO_EG:
                // PeSTO endgame queen table
                return new int[] {
                    -33, -28, -22, -43,  -5, -32, -20, -41,  // Rank 1
                    -22, -23, -30, -16, -16, -23, -36, -32,  // Rank 2
                    -16, -27,  15,   6,   9,  17,  10,   5,  // Rank 3
                    -18,  28,  19,  47,  31,  34,  39,  23,  // Rank 4
                      3,  22,  24,  45,  57,  40,  57,  36,  // Rank 5
                    -20,   6,   9,  49,  47,  35,  19,   9,  // Rank 6
                    -17,  20,  32,  41,  58,  25,  30,   0,  // Rank 7
                     -9,  22,  22,  27,  27,  19,  10,  20   // Rank 8
                };
            case AGGRESSIVE:
                return new int[] {
                    -20, -10, -10,  -5,  -5, -10, -10, -20,  // Rank 1
                    -10,   0,   5,   0,   0,   5,   0, -10,  // Rank 2
                    -10,   5,   5,   5,   5,   5,   5, -10,  // Rank 3
                     -5,   0,   5,   5,   5,   5,   0,  -5,  // Rank 4
                     -5,   0,   5,   5,   5,   5,   0,  -5,  // Rank 5
                    -10,   0,   5,   5,   5,   5,   0, -10,  // Rank 6
                    -10,   0,   0,   0,   0,   0,   0, -10,  // Rank 7
                    -20, -10, -10,  -5,  -5, -10, -10, -20   // Rank 8
                };
            case DEFENSIVE:
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation Function
                return new int[] {
                    -20, -10, -10,  -5,  -5, -10, -10, -20,  // Rank 1
                    -10,   0,   0,   0,   0,   5,   0, -10,  // Rank 2
                    -10,   0,   5,   5,   5,   5,   5, -10,  // Rank 3
                     -5,   0,   5,   5,   5,   5,   0,   0,  // Rank 4
                     -5,   0,   5,   5,   5,   5,   0,  -5,  // Rank 5
                    -10,   0,   5,   5,   5,   5,   0, -10,  // Rank 6
                    -10,   0,   0,   0,   0,   0,   0, -10,  // Rank 7
                    -20, -10, -10,  -5,  -5, -10, -10, -20   // Rank 8
                };
        }
    }
    
    private int[] getKingTable() {
        switch (tableType) {
            case PESTO_MG:
                // PeSTO middlegame king table - keep king safe
                return new int[] {
                    -15,  36,  12, -54,   8, -28,  24,  14,  // Rank 1
                      1,   7,  -8, -64, -43, -16,   9,   8,  // Rank 2
                    -14, -14, -22, -46, -44, -30, -15, -27,  // Rank 3
                    -49,  -1, -27, -39, -46, -44, -33, -51,  // Rank 4
                    -17, -20, -12, -27, -30, -25, -14, -36,  // Rank 5
                     -9,  24,   2, -16, -20,   6,  22, -22,  // Rank 6
                     29,  -1, -20,  -7,  -8,  -4, -38, -29,  // Rank 7
                    -65,  23,  16, -15, -56, -34,   2,  13   // Rank 8
                };
            case PESTO_EG:
                // PeSTO endgame king table - king becomes active
                return new int[] {
                    -53, -34, -21, -11, -28, -14, -24, -43,  // Rank 1
                    -27, -11,   4,  13,  14,   4,  -5, -17,  // Rank 2
                    -19,  -3,  11,  21,  23,  16,   7,  -9,  // Rank 3
                    -18,  -4,  21,  24,  27,  23,   9, -11,  // Rank 4
                     -8,  22,  24,  27,  26,  33,  26,   3,  // Rank 5
                     10,  17,  23,  15,  20,  45,  44,  13,  // Rank 6
                    -12,  17,  14,  17,  17,  38,  23,  11,  // Rank 7
                    -74, -35, -18, -18, -11,  15,   4, -17   // Rank 8
                };
            case AGGRESSIVE:
                // In aggressive mode, king can advance sooner
                return new int[] {
                     20,  30,  10,   0,   0,  10,  30,  20,  // Rank 1
                     10,  20,   0,   0,   0,   0,  20,  10,  // Rank 2
                    -10, -10, -20, -20, -20, -20, -10, -10,  // Rank 3
                    -20, -30, -30, -40, -40, -30, -30, -20,  // Rank 4
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 5
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 6
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 7
                    -30, -40, -40, -50, -50, -40, -40, -30   // Rank 8
                };
            case DEFENSIVE:
                // In defensive mode, king stays very safe
                return new int[] {
                     30,  40,  30,  10,  10,  30,  40,  30,  // Rank 1
                     30,  30,  20,   0,   0,  20,  30,  30,  // Rank 2
                      0,   0, -10, -20, -20, -10,   0,   0,  // Rank 3
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 4
                    -40, -50, -50, -60, -60, -50, -50, -40,  // Rank 5
                    -40, -50, -50, -60, -60, -50, -50, -40,  // Rank 6
                    -40, -50, -50, -60, -60, -50, -50, -40,  // Rank 7
                    -50, -60, -60, -70, -70, -60, -60, -50   // Rank 8
                };
            case SIMPLIFIED:
            default:
                // Tomasz Michniewski's Simplified Evaluation - middlegame king
                return new int[] {
                     20,  30,  10,   0,   0,  10,  30,  20,  // Rank 1
                     20,  20,   0,   0,   0,   0,  20,  20,  // Rank 2
                    -10, -20, -20, -20, -20, -20, -20, -10,  // Rank 3
                    -20, -30, -30, -40, -40, -30, -30, -20,  // Rank 4
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 5
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 6
                    -30, -40, -40, -50, -50, -40, -40, -30,  // Rank 7
                    -30, -40, -40, -50, -50, -40, -40, -30   // Rank 8
                };
        }
    }
    
    /**
     * Get the endgame king table (Simplified Evaluation Function)
     * Used separately for king_endgame piece type option
     */
    public static int[] getKingEndgameTable() {
        return new int[] {
            -50, -30, -30, -30, -30, -30, -30, -50,  // Rank 1
            -30, -30,   0,   0,   0,   0, -30, -30,  // Rank 2
            -30, -10,  20,  30,  30,  20, -10, -30,  // Rank 3
            -30, -10,  30,  40,  40,  30, -10, -30,  // Rank 4
            -30, -10,  30,  40,  40,  30, -10, -30,  // Rank 5
            -30, -10,  20,  30,  30,  20, -10, -30,  // Rank 6
            -30, -20, -10,   0,   0, -10, -20, -30,  // Rank 7
            -50, -40, -30, -20, -20, -30, -40, -50   // Rank 8
        };
    }
}
