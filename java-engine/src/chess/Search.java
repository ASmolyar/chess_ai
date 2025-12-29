package chess;

import static chess.Types.*;
import static chess.Bitboard.*;

/**
 * Alpha-beta search with various pruning techniques.
 */
public class Search {
    
    // Move ordering scores
    private static final int TT_MOVE_SCORE = 10000000;
    private static final int GOOD_CAPTURE_SCORE = 8000000;
    private static final int KILLER1_SCORE = 900000;
    private static final int KILLER2_SCORE = 800000;
    private static final int BAD_CAPTURE_SCORE = -1000000;
    
    // MVV-LVA table
    private static final int[][] MVV_LVA = {
        {0, 0, 0, 0, 0, 0, 0},
        {0, 105, 205, 305, 405, 505, 0},
        {0, 104, 204, 304, 404, 504, 0},
        {0, 103, 203, 303, 403, 503, 0},
        {0, 102, 202, 302, 402, 502, 0},
        {0, 101, 201, 301, 401, 501, 0},
        {0, 100, 200, 300, 400, 500, 0}
    };
    
    private static final int HISTORY_MAX = 8000;
    
    // Search state
    private final TranspositionTable tt;
    private final Move[][] killers = new Move[128][2];
    private final int[][][] history = new int[2][64][64];
    private final int[] moveScores = new int[256];
    
    private boolean stopped;
    private long startTime;
    private int allocatedTime;
    
    // Search limits
    private int maxDepth;
    private int moveTime;
    private long maxNodes;
    private boolean infinite;
    
    // Search info
    private int infoDepth;
    private int infoSelDepth;
    private int infoScore;
    private long infoNodes;
    private long infoTime;
    private Move infoBestMove;
    
    public Search() {
        this.tt = new TranspositionTable(32);
        clear();
    }
    
    public void clear() {
        tt.clear();
        for (int i = 0; i < 128; i++) {
            killers[i][0] = null;
            killers[i][1] = null;
        }
        for (int c = 0; c < 2; c++) {
            for (int f = 0; f < 64; f++) {
                for (int t = 0; t < 64; t++) {
                    history[c][f][t] = 0;
                }
            }
        }
        stopped = false;
        infoNodes = 0;
    }
    
    public void setLimits(int depth, int time, long nodes, boolean inf) {
        this.maxDepth = depth > 0 ? depth : 100;
        this.moveTime = time;
        this.maxNodes = nodes;
        this.infinite = inf;
    }
    
    public Move search(Position pos) {
        stopped = false;
        infoNodes = 0;
        infoDepth = 0;
        infoSelDepth = 0;
        infoBestMove = null;
        
        startTime = System.currentTimeMillis();
        
        // Time management
        if (moveTime > 0) {
            allocatedTime = moveTime;
        } else {
            allocatedTime = 1000000000; // Effectively infinite
        }
        
        tt.newSearch();
        
        return iterativeDeepening(pos);
    }
    
    private Move iterativeDeepening(Position pos) {
        Move bestMove = null;
        int bestScore = -SCORE_INFINITE;
        
        int alpha = -SCORE_INFINITE;
        int beta = SCORE_INFINITE;
        int aspirationDelta = 25;
        
        for (int depth = 1; depth <= maxDepth; depth++) {
            int delta = aspirationDelta;
            
            // Use aspiration windows after depth 4
            if (depth >= 5) {
                alpha = Math.max(-SCORE_INFINITE, bestScore - delta);
                beta = Math.min(SCORE_INFINITE, bestScore + delta);
            }
            
            int score;
            int failCount = 0;
            
            while (true) {
                score = alphaBeta(pos, depth, alpha, beta, true, 0);
                
                if (stopped) break;
                
                failCount++;
                if (failCount > 5) {
                    alpha = -SCORE_INFINITE;
                    beta = SCORE_INFINITE;
                    score = alphaBeta(pos, depth, alpha, beta, true, 0);
                    break;
                }
                
                if (score <= alpha) {
                    alpha = Math.max(-SCORE_INFINITE, alpha - delta);
                    delta *= 2;
                } else if (score >= beta) {
                    beta = Math.min(SCORE_INFINITE, beta + delta);
                    delta *= 2;
                } else {
                    break;
                }
            }
            
            if (stopped) break;
            
            bestScore = score;
            
            // Get best move from TT
            TranspositionTable.TTEntry entry = tt.probe(pos.key());
            if (entry != null && entry.getBestMove() != null) {
                bestMove = entry.getBestMove();
            }
            
            infoDepth = depth;
            infoScore = bestScore;
            infoBestMove = bestMove;
            infoTime = System.currentTimeMillis() - startTime;
            
            // Check if we should stop
            if (System.currentTimeMillis() - startTime > allocatedTime / 2) {
                break;
            }
            
            // Early exit for forced mate
            if (bestScore >= SCORE_MATE_IN_MAX_PLY || bestScore <= -SCORE_MATE_IN_MAX_PLY) {
                break;
            }
        }
        
        return bestMove;
    }
    
    private int alphaBeta(Position pos, int depth, int alpha, int beta, boolean isPV, int ply) {
        if (ply >= 127) {
            return Eval.evaluate(pos);
        }
        
        // Check time periodically
        if ((infoNodes & 2047) == 0) {
            checkTime();
        }
        
        if (stopped) return 0;
        
        if (ply > infoSelDepth) {
            infoSelDepth = ply;
        }
        
        // Draw detection
        if (ply > 0 && pos.isDraw(ply)) {
            return SCORE_DRAW;
        }
        
        boolean inCheck = pos.inCheck();
        
        // Quiescence at depth 0
        if (depth <= 0) {
            return quiescence(pos, alpha, beta, ply);
        }
        
        // Check extension
        if (inCheck && ply < 50 && depth < 10) {
            depth++;
        }
        
        infoNodes++;
        
        // Probe TT
        TranspositionTable.TTEntry ttEntry = tt.probe(pos.key());
        Move ttMove = null;
        
        if (ttEntry != null) {
            ttMove = ttEntry.getBestMove();
            
            if (!isPV && ttEntry.depth >= depth) {
                if (ttEntry.flag == TT_EXACT) {
                    return ttEntry.score;
                } else if (ttEntry.flag == TT_BETA && ttEntry.score >= beta) {
                    return ttEntry.score;
                } else if (ttEntry.flag == TT_ALPHA && ttEntry.score <= alpha) {
                    return ttEntry.score;
                }
            }
        }
        
        // Null move pruning
        if (!isPV && !inCheck && depth >= 3 &&
            (pos.pieces(pos.sideToMove()) & ~pos.pieces(pos.sideToMove(), PAWN) & ~pos.pieces(pos.sideToMove(), KING)) != 0) {
            
            int R = 3 + depth / 4;
            pos.doNullMove();
            int nullScore = -alphaBeta(pos, depth - 1 - R, -beta, -beta + 1, false, ply + 1);
            pos.undoNullMove();
            
            if (stopped) return 0;
            
            if (nullScore >= beta) {
                // Verification search at high depths to avoid zugzwang issues
                if (depth >= 12) {
                    int verifyScore = alphaBeta(pos, depth - 5, beta - 1, beta, false, ply);
                    if (stopped) return 0;
                    if (verifyScore < beta) {
                        // Verification failed, don't trust null move result
                        // Fall through to normal search
                    } else {
                        return beta;
                    }
                } else {
                    return beta;
                }
            }
        }
        
        // Generate moves
        MoveList moves = new MoveList();
        MoveGen.generateLegalMoves(pos, moves);
        
        // Checkmate / stalemate
        if (moves.size() == 0) {
            if (inCheck) {
                return matedIn(ply);
            }
            return SCORE_DRAW;
        }
        
        // Move ordering
        scoreMoves(pos, moves, ttMove, ply);
        
        Move bestMove = null;
        int bestScore = -SCORE_INFINITE;
        int origAlpha = alpha;
        
        for (int i = 0; i < moves.size(); i++) {
            pickBestMove(moves, i);
            Move move = moves.get(i);
            
            boolean isCapture = pos.pieceOn(move.to()) != NO_PIECE || move.type() == EN_PASSANT;
            
            pos.doMove(move);
            boolean givesCheck = pos.inCheck();
            
            int score = 0;
            boolean doFullSearch = true;
            
            // Late move reductions
            if (depth >= 3 && i > 3 && !inCheck && !givesCheck &&
                !isCapture && move.type() != PROMOTION) {
                
                int reduction = 1;
                if (i > 6) reduction++;
                if (i > 12) reduction++;
                if (!isPV) reduction++;
                
                if (killers[ply][0] != null && move.equals(killers[ply][0]) ||
                    killers[ply][1] != null && move.equals(killers[ply][1])) {
                    reduction = Math.max(1, reduction - 1);
                }
                
                score = -alphaBeta(pos, depth - 1 - reduction, -alpha - 1, -alpha, false, ply + 1);
                doFullSearch = score > alpha;
            }
            
            if (doFullSearch) {
                if (i == 0) {
                    score = -alphaBeta(pos, depth - 1, -beta, -alpha, isPV, ply + 1);
                } else {
                    score = -alphaBeta(pos, depth - 1, -alpha - 1, -alpha, false, ply + 1);
                    if (score > alpha && score < beta) {
                        score = -alphaBeta(pos, depth - 1, -beta, -alpha, isPV, ply + 1);
                    }
                }
            }
            
            pos.undoMove(move);
            
            if (stopped) return 0;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                
                if (score > alpha) {
                    alpha = score;
                    
                    if (score >= beta) {
                        // Update killers and history
                        if (!isCapture) {
                            if (killers[ply][0] == null || !move.equals(killers[ply][0])) {
                                killers[ply][1] = killers[ply][0];
                                killers[ply][0] = move;
                            }
                            
                            int us = pos.sideToMove();
                            int bonus = depth * depth;
                            history[us][move.from()][move.to()] += bonus;
                            
                            if (history[us][move.from()][move.to()] > HISTORY_MAX) {
                                for (int c = 0; c < 2; c++) {
                                    for (int f = 0; f < 64; f++) {
                                        for (int t = 0; t < 64; t++) {
                                            history[c][f][t] /= 2;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }
        
        // Store in TT
        if (!stopped) {
            int flag = bestScore >= beta ? TT_BETA : (bestScore > origAlpha ? TT_EXACT : TT_ALPHA);
            tt.store(pos.key(), bestMove, bestScore, depth, flag);
        }
        
        return bestScore;
    }
    
    private int quiescence(Position pos, int alpha, int beta, int ply) {
        if (ply >= 127) {
            return Eval.evaluate(pos);
        }
        
        if ((infoNodes & 2047) == 0) {
            checkTime();
        }
        
        if (stopped) return 0;
        
        infoNodes++;
        
        if (ply > infoSelDepth) {
            infoSelDepth = ply;
        }
        
        boolean inCheck = pos.inCheck();
        
        if (inCheck) {
            if (ply >= 126) {
                return -SCORE_MATE + ply;
            }
            
            MoveList moves = new MoveList();
            MoveGen.generateLegalMoves(pos, moves);
            
            if (moves.size() == 0) {
                return matedIn(ply);
            }
            
            int bestScore = -SCORE_INFINITE;
            int maxEvasions = Math.min(moves.size(), 4);
            
            for (int i = 0; i < maxEvasions; i++) {
                Move move = moves.get(i);
                pos.doMove(move);
                int score = -quiescence(pos, -beta, -alpha, ply + 1);
                pos.undoMove(move);
                
                if (stopped) return 0;
                
                if (score > bestScore) {
                    bestScore = score;
                    if (score > alpha) {
                        alpha = score;
                        if (score >= beta) {
                            return beta;
                        }
                    }
                }
            }
            
            return bestScore;
        }
        
        // Stand pat
        int standPat = Eval.evaluate(pos);
        
        if (standPat >= beta) {
            return beta;
        }
        
        if (standPat > alpha) {
            alpha = standPat;
        }
        
        // Delta pruning
        int delta = Eval.getPieceValue(QUEEN) + 200;
        if (standPat + delta < alpha) {
            return alpha;
        }
        
        if (ply >= 126) {
            return standPat;
        }
        
        // Generate captures
        MoveList moves = new MoveList();
        MoveGen.generateCaptures(pos, moves);
        
        // Score and sort captures
        int[] captureScores = new int[moves.size()];
        for (int i = 0; i < moves.size(); i++) {
            Move m = moves.get(i);
            int captured = pos.pieceOn(m.to());
            if (m.type() == EN_PASSANT) captured = makePiece(opposite(pos.sideToMove()), PAWN);
            int attacker = pos.pieceOn(m.from());
            captureScores[i] = MVV_LVA[pieceType(attacker)][pieceType(captured)];
        }
        
        for (int i = 0; i < moves.size(); i++) {
            // Pick best capture
            int bestIdx = i;
            for (int j = i + 1; j < moves.size(); j++) {
                if (captureScores[j] > captureScores[bestIdx]) {
                    bestIdx = j;
                }
            }
            if (bestIdx != i) {
                moves.swap(i, bestIdx);
                int temp = captureScores[i];
                captureScores[i] = captureScores[bestIdx];
                captureScores[bestIdx] = temp;
            }
            
            Move move = moves.get(i);
            
            if (!pos.isLegal(move)) continue;
            
            // Delta pruning for individual moves
            int captured = pos.pieceOn(move.to());
            if (move.type() == EN_PASSANT) captured = makePiece(opposite(pos.sideToMove()), PAWN);
            int captureValue = Eval.getPieceValue(pieceType(captured));
            
            if (standPat + captureValue + 200 < alpha && move.type() != PROMOTION) {
                continue;
            }
            
            // SEE pruning - skip captures that lose material
            if (!pos.seeGe(move, 0)) {
                continue;
            }
            
            pos.doMove(move);
            int score = -quiescence(pos, -beta, -alpha, ply + 1);
            pos.undoMove(move);
            
            if (stopped) return 0;
            
            if (score >= beta) {
                return beta;
            }
            
            if (score > alpha) {
                alpha = score;
            }
        }
        
        return alpha;
    }
    
    private void scoreMoves(Position pos, MoveList moves, Move ttMove, int ply) {
        int us = pos.sideToMove();
        
        for (int i = 0; i < moves.size(); i++) {
            Move m = moves.get(i);
            int score = 0;
            
            if (ttMove != null && m.equals(ttMove)) {
                score = TT_MOVE_SCORE;
            } else {
                int captured = pos.pieceOn(m.to());
                if (m.type() == EN_PASSANT) captured = makePiece(opposite(us), PAWN);
                
                if (captured != NO_PIECE) {
                    // Use SEE to distinguish good captures from bad ones
                    int attacker = pos.pieceOn(m.from());
                    if (pos.seeGe(m, 0)) {
                        score = GOOD_CAPTURE_SCORE + MVV_LVA[pieceType(attacker)][pieceType(captured)];
                    } else {
                        score = BAD_CAPTURE_SCORE + MVV_LVA[pieceType(attacker)][pieceType(captured)];
                    }
                } else if (killers[ply][0] != null && m.equals(killers[ply][0])) {
                    score = KILLER1_SCORE;
                } else if (killers[ply][1] != null && m.equals(killers[ply][1])) {
                    score = KILLER2_SCORE;
                } else {
                    score = history[us][m.from()][m.to()];
                }
            }
            
            moveScores[i] = score;
        }
    }
    
    private void pickBestMove(MoveList moves, int startIdx) {
        int bestIdx = startIdx;
        int bestScore = moveScores[startIdx];
        
        for (int i = startIdx + 1; i < moves.size(); i++) {
            if (moveScores[i] > bestScore) {
                bestScore = moveScores[i];
                bestIdx = i;
            }
        }
        
        if (bestIdx != startIdx) {
            moves.swap(startIdx, bestIdx);
            int temp = moveScores[startIdx];
            moveScores[startIdx] = moveScores[bestIdx];
            moveScores[bestIdx] = temp;
        }
    }
    
    private void checkTime() {
        if (infinite) return;
        
        long elapsed = System.currentTimeMillis() - startTime;
        if (elapsed >= allocatedTime) {
            stopped = true;
        }
        
        if (maxNodes > 0 && infoNodes >= maxNodes) {
            stopped = true;
        }
    }
    
    public void stop() {
        stopped = true;
    }
    
    // Search info getters
    public int getDepth() { return infoDepth; }
    public int getSelDepth() { return infoSelDepth; }
    public int getScore() { return infoScore; }
    public long getNodes() { return infoNodes; }
    public long getTime() { return infoTime; }
    public Move getBestMove() { return infoBestMove; }
}

