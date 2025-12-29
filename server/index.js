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

// ============ ELO CALCULATION ============

async function calculateEloForEval(evalId) {
  const evalData = db.prepare('SELECT * FROM evals WHERE id = ?').get(evalId);
  if (!evalData) {
    throw new Error('Eval not found');
  }
  
  const evalConfig = JSON.parse(evalData.eval_config);
  
  console.log(`Starting ELO calculation for "${evalData.name}" (${evalId})`);
  
  // Stockfish ELO levels to test against (approximate ratings)
  // We'll play multiple games at each level
  const stockfishLevels = [
    { skill: 0, elo: 800 },
    { skill: 3, elo: 1000 },
    { skill: 5, elo: 1200 },
    { skill: 8, elo: 1400 },
    { skill: 10, elo: 1600 },
    { skill: 13, elo: 1800 },
    { skill: 15, elo: 2000 },
    { skill: 17, elo: 2200 },
    { skill: 19, elo: 2400 },
    { skill: 20, elo: 2600 },
  ];
  
  const gamesPerLevel = 4; // 2 as white, 2 as black
  const results = [];
  
  matchRunner.startCalculation(evalId, stockfishLevels.length * gamesPerLevel);
  
  try {
    for (const level of stockfishLevels) {
      // Play games at this level
      for (let i = 0; i < gamesPerLevel; i++) {
        const playAsWhite = i % 2 === 0;
        
        try {
          const result = await matchRunner.playMatch(evalConfig, level, playAsWhite);
          results.push({
            opponentElo: level.elo,
            result: result.result, // 'win', 'loss', 'draw'
            movesCount: result.movesCount,
            pgn: result.pgn
          });
          
          // Record match in database
          const matchId = uuidv4();
          db.prepare(`
            INSERT INTO matches (id, eval_id, opponent_type, opponent_elo, result, moves_count, pgn)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(matchId, evalId, `stockfish_skill_${level.skill}`, level.elo, result.result, result.movesCount, result.pgn);
          
          matchRunner.incrementProgress(evalId);
          
        } catch (matchError) {
          console.error(`Match error at skill ${level.skill}:`, matchError);
          matchRunner.incrementProgress(evalId);
        }
      }
    }
    
    // Calculate final ELO
    const { elo, confidence, wins, losses, draws } = eloCalculator.calculateFromResults(results);
    
    // Update database
    db.prepare(`
      UPDATE evals 
      SET elo = ?, elo_confidence = ?, games_played = ?, wins = ?, losses = ?, draws = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(elo, confidence, results.length, wins, losses, draws, evalId);
    
    console.log(`ELO calculation complete for "${evalData.name}": ${elo} (±${confidence})`);
    
  } finally {
    matchRunner.endCalculation(evalId);
  }
}

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`Chess Eval Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/evals          - List all public evals (leaderboard)');
  console.log('  POST /api/evals          - Submit a new eval');
  console.log('  GET  /api/evals/:id      - Get eval details');
  console.log('  POST /api/evals/:id/calculate-elo - Trigger ELO calculation');
  console.log('  GET  /api/stats          - Get leaderboard statistics');
});

export default app;

