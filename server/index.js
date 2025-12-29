/**
 * Chess Eval Server
 * Backend for storing eval functions and calculating ELO ratings
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eval_id) REFERENCES evals(id)
  );

  CREATE INDEX IF NOT EXISTS idx_evals_elo ON evals(elo DESC);
  CREATE INDEX IF NOT EXISTS idx_evals_public ON evals(is_public);
  CREATE INDEX IF NOT EXISTS idx_matches_eval ON matches(eval_id);
`);

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
      message: 'ELO calculation started',
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
      SELECT id, opponent_type, opponent_elo, result, moves_count, created_at
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

// ============ ELO CALCULATION (Adaptive Opponent Selection) ============

/**
 * ELO calculation using adaptive opponent selection
 * Plays 12 games against opponents at the current estimated ELO
 * After each game, recalculates ELO from all results and picks next opponent accordingly
 */
async function calculateEloForEval(evalId) {
  const evalData = db.prepare('SELECT * FROM evals WHERE id = ?').get(evalId);
  if (!evalData) {
    throw new Error('Eval not found');
  }
  
  const evalConfig = JSON.parse(evalData.eval_config);
  
  console.log(`Starting ELO calculation for "${evalData.name}" (${evalId})`);
  
  // Broadcast calculation start
  liveBroadcast.calculationStatus({
    evalId: evalId,
    evalName: evalData.name,
    status: 'started',
    message: 'ELO calculation started'
  });
  
  // Parameters
  const TOTAL_GAMES = 15;
  const MIN_ELO = 600;
  const MAX_ELO = 2800;
  const STARTING_ELO = 1400; // Initial estimate before any games
  
  let currentEstimatedElo = STARTING_ELO;
  const results = [];
  
  // Map ELO to Stockfish skill level (0-20)
  function eloToSkill(elo) {
    // Approximate mapping: 600 ELO = skill 0, 2800 ELO = skill 20
    const skill = Math.round((elo - 600) / 110);
    return Math.max(0, Math.min(20, skill));
  }
  
  // Calculate current stats from results
  function getStats() {
    let wins = 0, losses = 0, draws = 0;
    for (const r of results) {
      if (r.result === 'win') wins++;
      else if (r.result === 'loss') losses++;
      else draws++;
    }
    return { wins, losses, draws };
  }
  
  matchRunner.startCalculation(evalId, TOTAL_GAMES);
  
  let stockfishAvailable = true;
  
  try {
    for (let gameNum = 0; gameNum < TOTAL_GAMES && stockfishAvailable; gameNum++) {
      // Pick opponent at current estimated ELO (with slight random variance for diversity)
      const variance = Math.floor(Math.random() * 100) - 50; // ±50 ELO variance
      const opponentElo = Math.max(MIN_ELO, Math.min(MAX_ELO, currentEstimatedElo + variance));
      
      const skill = eloToSkill(opponentElo);
      const level = { skill, elo: opponentElo };
      const playAsWhite = gameNum % 2 === 0;
      const stats = getStats();
      
      // Broadcast progress with CURRENT estimated ELO
      liveBroadcast.progress({
        evalId: evalId,
        evalName: evalData.name,
        currentLevel: opponentElo,
        estimatedElo: currentEstimatedElo,
        gameNumber: gameNum + 1,
        totalGames: TOTAL_GAMES,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        message: `Game ${gameNum + 1}/${TOTAL_GAMES} vs SF ${opponentElo} ELO`
      });
      
      console.log(`[ELO Calc] Game ${gameNum + 1}: Est. ELO ${currentEstimatedElo}, playing vs ${opponentElo} (skill ${skill})`);
      
      try {
        const matchInfo = { 
          evalId, 
          evalName: evalData.name,
          currentEloEstimate: currentEstimatedElo,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses
        };
        const result = await matchRunner.playMatch(evalConfig, level, playAsWhite, matchInfo);
        
        results.push({
          opponentElo: opponentElo,
          result: result.result,
          movesCount: result.movesCount,
          pgn: result.pgn
        });
        
        // Record match in database
        const matchId = uuidv4();
        db.prepare(`
          INSERT INTO matches (id, eval_id, opponent_type, opponent_elo, result, moves_count, pgn)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(matchId, evalId, `stockfish_skill_${skill}`, opponentElo, result.result, result.movesCount, result.pgn);
        
        matchRunner.incrementProgress(evalId);
        
        // Recalculate ELO from ALL results so far
        const newCalc = eloCalculator.calculateFromResults(results);
        const previousElo = currentEstimatedElo;
        currentEstimatedElo = newCalc.elo || STARTING_ELO;
        
        console.log(`  → ${result.result.toUpperCase()}! ELO: ${previousElo} → ${currentEstimatedElo}`);
        
      } catch (matchError) {
        console.error(`Match error at ELO ${currentEstimatedElo}:`, matchError.message);
        matchRunner.incrementProgress(evalId);
        
        if (matchError.message.includes('Stockfish not found') || 
            matchError.message.includes('Failed to start stockfish')) {
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
      
      console.log(`ELO calculation complete for "${evalData.name}": ${elo} (±${confidence})`);
      
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
        message: `ELO calculation complete: ${elo} (±${confidence})`
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
  console.log('Endpoints:');
  console.log('  GET  /api/evals          - List all public evals (leaderboard)');
  console.log('  POST /api/evals          - Submit a new eval');
  console.log('  GET  /api/evals/:id      - Get eval details');
  console.log('  POST /api/evals/:id/calculate-elo - Trigger ELO calculation');
  console.log('  GET  /api/stats          - Get leaderboard statistics');
  
  // Start WebSocket server for live game broadcasting
  liveBroadcast.start(WS_PORT);
  console.log(`Live game broadcast available at ws://localhost:${WS_PORT}`);
});

export default app;

