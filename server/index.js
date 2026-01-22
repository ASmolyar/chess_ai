/**
 * Chess Eval Server
 * Backend for storing eval functions and calculating ELO ratings
 * 
 * Now with parallel batch evaluation:
 * - 10 rounds × 4 games = 40 total games
 * - Each round: 2 openings × 2 colors (perfectly balanced)
 * - 4 games run in parallel per round
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { EloCalculator } from './elo.js';
import { MatchRunner } from './matchRunner.js';
import { liveBroadcast } from './liveBroadcast.js';
import { getOpeningPairs } from './openingBook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'evals.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS evals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'Anonymous',
    eval_config TEXT NOT NULL,
    elo INTEGER DEFAULT NULL,
    elo_confidence TEXT DEFAULT NULL,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    eval_id TEXT NOT NULL,
    opponent_type TEXT NOT NULL,
    opponent_elo INTEGER NOT NULL,
    result TEXT NOT NULL,
    moves_count INTEGER,
    pgn TEXT,
    opening TEXT,
    played_as TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eval_id) REFERENCES evals(id)
  );

  CREATE INDEX IF NOT EXISTS idx_evals_elo ON evals(elo DESC);
  CREATE INDEX IF NOT EXISTS idx_evals_public ON evals(is_public);
  CREATE INDEX IF NOT EXISTS idx_matches_eval ON matches(eval_id);
`);

// Add missing columns if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE matches ADD COLUMN opening TEXT`);
} catch (e) { /* Column already exists */ }
try {
  db.exec(`ALTER TABLE matches ADD COLUMN played_as TEXT`);
} catch (e) { /* Column already exists */ }

// ELO calculator instance
const eloCalculator = new EloCalculator();
const matchRunner = new MatchRunner();

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all public evals (leaderboard)
app.get('/api/evals', (req, res) => {
  try {
    const { sort = 'elo', order = 'desc', limit = 100 } = req.query;
    
    const validSorts = ['elo', 'created_at', 'games_played', 'name'];
    const sortColumn = validSorts.includes(sort) ? sort : 'elo';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    
    const stmt = db.prepare(`
      SELECT id, name, description, author, elo, elo_confidence, 
             games_played, wins, losses, draws, created_at
      FROM evals 
      WHERE is_public = 1
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT ?
    `);
    
    const evals = stmt.all(parseInt(limit));
    res.json({ evals });
  } catch (error) {
    console.error('Error fetching evals:', error);
    res.status(500).json({ error: 'Failed to fetch evals' });
  }
});

// Get a specific eval by ID
app.get('/api/evals/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM evals WHERE id = ?
    `);
    const evalData = stmt.get(req.params.id);
    
    if (!evalData) {
      return res.status(404).json({ error: 'Eval not found' });
    }
    
    // Parse the eval_config JSON
    evalData.eval_config = JSON.parse(evalData.eval_config);
    
    res.json({ eval: evalData });
  } catch (error) {
    console.error('Error fetching eval:', error);
    res.status(500).json({ error: 'Failed to fetch eval' });
  }
});

// Get matches for a specific eval
app.get('/api/evals/:id/matches', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM matches WHERE eval_id = ? ORDER BY created_at DESC LIMIT 50
    `);
    const matches = stmt.all(req.params.id);
    res.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Submit a new eval
app.post('/api/evals', (req, res) => {
  try {
    const { name, description, author, eval_config, is_public = true } = req.body;
    
    if (!name || !eval_config) {
      return res.status(400).json({ error: 'Name and eval_config are required' });
    }
    
    const id = uuidv4();
    const evalConfigJson = typeof eval_config === 'string' 
      ? eval_config 
      : JSON.stringify(eval_config);
    
    const stmt = db.prepare(`
      INSERT INTO evals (id, name, description, author, eval_config, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, description || '', author || 'Anonymous', evalConfigJson, is_public ? 1 : 0);
    
    res.json({ 
      success: true, 
      id,
      message: 'Eval submitted successfully. ELO calculation will begin shortly.'
    });
    
    // Trigger ELO calculation in the background
    if (is_public) {
      calculateEloForEval(id).catch(err => {
        console.error(`ELO calculation failed for ${id}:`, err);
      });
    }
    
  } catch (error) {
    console.error('Error submitting eval:', error);
    res.status(500).json({ error: 'Failed to submit eval' });
  }
});

// Update an eval
app.put('/api/evals/:id', (req, res) => {
  try {
    const { name, description, author, eval_config, is_public } = req.body;
    const { id } = req.params;
    
    // Check if eval exists
    const existing = db.prepare('SELECT id FROM evals WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Eval not found' });
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (author !== undefined) { updates.push('author = ?'); values.push(author); }
    if (eval_config !== undefined) { 
      updates.push('eval_config = ?'); 
      values.push(typeof eval_config === 'string' ? eval_config : JSON.stringify(eval_config));
      // Reset ELO if config changed
      updates.push('elo = NULL', 'games_played = 0', 'wins = 0', 'losses = 0', 'draws = 0');
    }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE evals SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    res.json({ success: true, message: 'Eval updated' });
    
    // Recalculate ELO if config was changed
    if (eval_config !== undefined && is_public !== false) {
      calculateEloForEval(id).catch(err => {
        console.error(`ELO calculation failed for ${id}:`, err);
      });
    }
    
  } catch (error) {
    console.error('Error updating eval:', error);
    res.status(500).json({ error: 'Failed to update eval' });
  }
});

// Delete an eval
app.delete('/api/evals/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM evals WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Eval not found' });
    }
    
    // Also delete associated matches
    db.prepare('DELETE FROM matches WHERE eval_id = ?').run(req.params.id);
    
    res.json({ success: true, message: 'Eval deleted' });
  } catch (error) {
    console.error('Error deleting eval:', error);
    res.status(500).json({ error: 'Failed to delete eval' });
  }
});

// Manually trigger ELO calculation for an eval
app.post('/api/evals/:id/calculate-elo', async (req, res) => {
  try {
    const { id } = req.params;
    
    const evalData = db.prepare('SELECT * FROM evals WHERE id = ?').get(id);
    if (!evalData) {
      return res.status(404).json({ error: 'Eval not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'ELO calculation started (40 games in 10 parallel batches)',
      status_endpoint: `/api/evals/${id}/status`
    });
    
    // Run calculation in background
    calculateEloForEval(id).catch(err => {
      console.error(`ELO calculation failed for ${id}:`, err);
    });
    
  } catch (error) {
    console.error('Error triggering ELO calculation:', error);
    res.status(500).json({ error: 'Failed to start ELO calculation' });
  }
});

// Get ELO calculation status for an eval
app.get('/api/evals/:id/status', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, elo, elo_confidence, games_played, wins, losses, draws
      FROM evals WHERE id = ?
    `);
    const evalData = stmt.get(req.params.id);
    
    if (!evalData) {
      return res.status(404).json({ error: 'Eval not found' });
    }
    
    const isCalculating = matchRunner.isCalculating(req.params.id);
    const progress = matchRunner.getProgress(req.params.id);
    
    res.json({
      ...evalData,
      is_calculating: isCalculating,
      calculation_progress: progress
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Get match history for an eval
app.get('/api/evals/:id/matches', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, opponent_type, opponent_elo, result, moves_count, opening, played_as, created_at
      FROM matches 
      WHERE eval_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `);
    const matches = stmt.all(req.params.id);
    
    res.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get leaderboard stats
app.get('/api/stats', (req, res) => {
  try {
    const totalEvals = db.prepare('SELECT COUNT(*) as count FROM evals WHERE is_public = 1').get();
    const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get();
    const topEval = db.prepare(`
      SELECT name, elo FROM evals 
      WHERE is_public = 1 AND elo IS NOT NULL 
      ORDER BY elo DESC LIMIT 1
    `).get();
    
    res.json({
      total_evals: totalEvals.count,
      total_matches: totalMatches.count,
      top_eval: topEval || null
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============ ELO CALCULATION (Parallel Batch with Opening Book) ============

/**
 * ELO calculation using parallel batch games
 * 
 * Structure:
 * - 10 rounds of 4 parallel games each (40 games total)
 * - Each round: 2 openings × 2 colors = perfectly balanced
 * - Adaptive opponent selection based on current ELO estimate
 * - Uses curated opening book for diverse positions
 */
async function calculateEloForEval(evalId) {
  const evalData = db.prepare('SELECT * FROM evals WHERE id = ?').get(evalId);
  if (!evalData) {
    throw new Error('Eval not found');
  }
  
  const evalConfig = JSON.parse(evalData.eval_config);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting ELO calculation for "${evalData.name}" (${evalId})`);
  console.log(`10 rounds × 4 games = 40 total games (parallel execution)`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Broadcast calculation start
  liveBroadcast.calculationStatus({
    evalId: evalId,
    evalName: evalData.name,
    status: 'started',
    message: 'ELO calculation started (40 games in 10 parallel batches)'
  });
  
  // Parameters
  const TOTAL_ROUNDS = 10;
  const GAMES_PER_ROUND = 4;
  const TOTAL_GAMES = TOTAL_ROUNDS * GAMES_PER_ROUND;
  const MIN_ELO = 600;
  const MAX_ELO = 2800;
  const STARTING_ELO = 1400;
  
  let currentEstimatedElo = STARTING_ELO;
  const results = [];
  
  // Get shuffled opening pairs for all rounds
  const openingPairs = getOpeningPairs(TOTAL_ROUNDS);
  
  // Track overall stats
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  
  matchRunner.startCalculation(evalId, TOTAL_GAMES);
  
  let stockfishAvailable = true;
  
  try {
    for (let round = 0; round < TOTAL_ROUNDS && stockfishAvailable; round++) {
      const openings = openingPairs[round];
      
      // Pick opponent at current estimated ELO (with slight variance)
      const variance = Math.floor(Math.random() * 100) - 50;
      const opponentElo = Math.max(MIN_ELO, Math.min(MAX_ELO, currentEstimatedElo + variance));
      
      console.log(`\n[Round ${round + 1}/${TOTAL_ROUNDS}] Est. ELO: ${currentEstimatedElo}, vs SF ~${opponentElo}`);
      console.log(`  Opening 1: ${openings.opening1.name}`);
      console.log(`  Opening 2: ${openings.opening2.name}`);
      
      // Broadcast progress
      liveBroadcast.progress({
        evalId: evalId,
        evalName: evalData.name,
        round: round + 1,
        totalRounds: TOTAL_ROUNDS,
        estimatedElo: currentEstimatedElo,
        opponentElo: opponentElo,
        wins: totalWins,
        draws: totalDraws,
        losses: totalLosses,
        message: `Round ${round + 1}/${TOTAL_ROUNDS}: 4 games vs SF ~${opponentElo} ELO`
      });
      
      try {
        // Run batch of 4 parallel games
        const batchInfo = {
          evalId,
          evalName: evalData.name,
          round: round + 1,
          totalRounds: TOTAL_ROUNDS,
          currentStats: {
            wins: totalWins,
            draws: totalDraws,
            losses: totalLosses,
          }
        };
        
        const batchResults = await matchRunner.runBatch(
          evalConfig,
          opponentElo,
          openings.opening1,
          openings.opening2,
          batchInfo
        );
        
        // Process results
        let roundWins = 0, roundDraws = 0, roundLosses = 0;
        
        for (const game of batchResults.games) {
          results.push({
            opponentElo: opponentElo,
            result: game.result,
            movesCount: game.movesCount,
            opening: game.opening,
            playAsWhite: game.playAsWhite,
          });
          
          if (game.result === 'win') { roundWins++; totalWins++; }
          else if (game.result === 'loss') { roundLosses++; totalLosses++; }
          else { roundDraws++; totalDraws++; }
          
          // Record match in database
          const matchId = uuidv4();
          db.prepare(`
            INSERT INTO matches (id, eval_id, opponent_type, opponent_elo, result, moves_count, pgn, opening, played_as)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            matchId, 
            evalId, 
            `stockfish_${opponentElo}`, 
            opponentElo, 
            game.result, 
            game.movesCount, 
            game.pgn || '',
            game.opening,
            game.playAsWhite ? 'white' : 'black'
          );
          
          matchRunner.incrementProgress(evalId);
        }
        
        // Recalculate ELO after batch
        const newCalc = eloCalculator.calculateFromResults(results);
        const previousElo = currentEstimatedElo;
        currentEstimatedElo = newCalc.elo || STARTING_ELO;
        
        console.log(`  Results: ${roundWins}W ${roundDraws}D ${roundLosses}L → ELO: ${previousElo} → ${currentEstimatedElo}`);
        
      } catch (batchError) {
        console.error(`Batch error at round ${round + 1}:`, batchError.message);
        
        // Increment progress for failed games
        for (let i = 0; i < GAMES_PER_ROUND; i++) {
          matchRunner.incrementProgress(evalId);
        }
        
        if (batchError.message.includes('Stockfish not found')) {
          console.error('Stockfish not available. ELO calculation cancelled.');
          stockfishAvailable = false;
          liveBroadcast.calculationStatus({
            evalId: evalId,
            evalName: evalData.name,
            status: 'error',
            message: 'Stockfish not found. Install with: brew install stockfish'
          });
          break;
        }
      }
    }
    
    if (results.length > 0) {
      // Calculate final ELO
      const { elo, confidence, wins, losses, draws } = eloCalculator.calculateFromResults(results);
      
      // Update database
      db.prepare(`
        UPDATE evals 
        SET elo = ?, elo_confidence = ?, games_played = ?, wins = ?, losses = ?, draws = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(elo, confidence, results.length, wins, losses, draws, evalId);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ELO calculation complete for "${evalData.name}"`);
      console.log(`Final ELO: ${elo} (${confidence})`);
      console.log(`Record: ${wins}W ${draws}D ${losses}L (${results.length} games)`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Broadcast completion
      liveBroadcast.calculationStatus({
        evalId: evalId,
        evalName: evalData.name,
        status: 'completed',
        elo: elo,
        confidence: confidence,
        wins: wins,
        losses: losses,
        draws: draws,
        gamesPlayed: results.length,
        message: `ELO calculation complete: ${elo} (${confidence})`
      });
    } else if (!stockfishAvailable) {
      console.log(`ELO calculation skipped for "${evalData.name}" - Stockfish not available.`);
      console.log('Install Stockfish to enable ELO calculation: brew install stockfish');
    }
    
  } finally {
    matchRunner.endCalculation(evalId);
  }
}

// ============ START SERVER ============

const WS_PORT = 3002;

app.listen(PORT, () => {
  console.log(`Chess Eval Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('ELO Calculation: 10 rounds × 4 parallel games = 40 games');
  console.log('  - Each round uses 2 openings, played as both white and black');
  console.log('  - Uses curated opening book for position variety');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/evals          - List all public evals (leaderboard)');
  console.log('  POST /api/evals          - Submit a new eval');
  console.log('  GET  /api/evals/:id      - Get eval details');
  console.log('  POST /api/evals/:id/calculate-elo - Trigger ELO calculation');
  console.log('  GET  /api/stats          - Get leaderboard statistics');
  
  // Start WebSocket server for live game broadcasting
  liveBroadcast.start(WS_PORT);
  console.log(`\nLive game broadcast available at ws://localhost:${WS_PORT}`);
});

export default app;
