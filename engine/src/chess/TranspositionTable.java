package chess;

import static chess.Types.*;

/**
 * Transposition table for storing search results.
 */
public class TranspositionTable {
    
    private TTEntry[] table;
    private int entryCount;
    private int generation;
    
    public TranspositionTable(int mbSize) {
        resize(mbSize);
    }
    
    public void resize(int mbSize) {
        if (mbSize <= 0) {
            table = null;
            entryCount = 0;
            return;
        }
        
        // Each entry is roughly 24 bytes (key + data)
        entryCount = (mbSize * 1024 * 1024) / 24;
        
        // Round down to power of 2 for fast modulo
        int power = 1;
        while (power * 2 <= entryCount) power *= 2;
        entryCount = power;
        
        table = new TTEntry[entryCount];
        for (int i = 0; i < entryCount; i++) {
            table[i] = new TTEntry();
        }
        
        generation = 0;
    }
    
    public void clear() {
        if (table != null) {
            for (int i = 0; i < entryCount; i++) {
                table[i].clear();
            }
        }
        generation = 0;
    }
    
    public void newSearch() {
        generation++;
    }
    
    public int currentGeneration() {
        return generation;
    }
    
    public TTEntry probe(long key) {
        if (table == null || entryCount == 0) {
            return null;
        }
        int idx = (int) (key & (entryCount - 1));
        TTEntry entry = table[idx];
        if (entry.key == key && entry.flag != TT_NONE) {
            return entry;
        }
        return null;
    }
    
    public TTEntry getEntry(long key) {
        if (table == null || entryCount == 0) {
            return new TTEntry(); // Dummy entry
        }
        int idx = (int) (key & (entryCount - 1));
        return table[idx];
    }
    
    public void store(long key, Move bestMove, int score, int depth, int flag) {
        if (table == null || entryCount == 0) return;
        
        int idx = (int) (key & (entryCount - 1));
        TTEntry entry = table[idx];
        
        // Replace if: different position, or deeper search, or same generation with equal depth
        if (entry.key != key || depth >= entry.depth || entry.generation != generation) {
            entry.key = key;
            entry.bestMove = bestMove != null ? bestMove.raw() : 0;
            entry.score = (short) score;
            entry.depth = (byte) depth;
            entry.flag = (byte) flag;
            entry.generation = (byte) generation;
        }
    }
    
    public int hashfull() {
        if (table == null) return 0;
        int cnt = 0;
        int sample = Math.min(1000, entryCount);
        for (int i = 0; i < sample; i++) {
            if (table[i].flag != TT_NONE && table[i].generation == generation) {
                cnt++;
            }
        }
        return cnt * 1000 / sample;
    }
    
    /**
     * Transposition table entry.
     */
    public static class TTEntry {
        public long key;
        public short bestMove;
        public short score;
        public byte depth;
        public byte flag;
        public byte generation;
        
        public void clear() {
            key = 0;
            bestMove = 0;
            score = 0;
            depth = 0;
            flag = TT_NONE;
            generation = 0;
        }
        
        public Move getBestMove() {
            return bestMove != 0 ? new Move(bestMove) : null;
        }
    }
}

