/**
 * Database module for Vercel Postgres
 * Provides database operations for the Chess AI Arena
 */

import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDb() {
  try {
    // Create evals table
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create matches table
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_evals_elo ON evals(elo DESC NULLS LAST)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evals_public ON evals(is_public)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_eval ON matches(eval_id)`;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

// Get all public evals
export async function getEvals(sort = 'elo', order = 'desc', limit = 100) {
  const validSorts = ['elo', 'created_at', 'games_played', 'name'];
  const sortColumn = validSorts.includes(sort) ? sort : 'elo';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  
  const result = await sql`
    SELECT id, name, description, author, elo, elo_confidence, 
           games_played, wins, losses, draws, created_at
    FROM evals 
    WHERE is_public = 1
    ORDER BY 
      CASE WHEN ${sortColumn} = 'elo' THEN elo END DESC NULLS LAST,
      CASE WHEN ${sortColumn} = 'created_at' THEN created_at END DESC,
      CASE WHEN ${sortColumn} = 'games_played' THEN games_played END DESC,
      CASE WHEN ${sortColumn} = 'name' THEN name END
    LIMIT ${limit}
  `;
  
  return result.rows;
}

// Get a specific eval by ID
export async function getEval(id) {
  const result = await sql`SELECT * FROM evals WHERE id = ${id}`;
  return result.rows[0] || null;
}

// Create a new eval
export async function createEval(id, name, description, author, evalConfig, isPublic = true) {
  await sql`
    INSERT INTO evals (id, name, description, author, eval_config, is_public)
    VALUES (${id}, ${name}, ${description || ''}, ${author || 'Anonymous'}, ${evalConfig}, ${isPublic ? 1 : 0})
  `;
  return { id };
}

// Update an eval
export async function updateEval(id, updates) {
  const { name, description, author, eval_config, is_public, elo, elo_confidence, games_played, wins, losses, draws } = updates;
  
  await sql`
    UPDATE evals SET
      name = COALESCE(${name}, name),
      description = COALESCE(${description}, description),
      author = COALESCE(${author}, author),
      eval_config = COALESCE(${eval_config}, eval_config),
      is_public = COALESCE(${is_public}, is_public),
      elo = COALESCE(${elo}, elo),
      elo_confidence = COALESCE(${elo_confidence}, elo_confidence),
      games_played = COALESCE(${games_played}, games_played),
      wins = COALESCE(${wins}, wins),
      losses = COALESCE(${losses}, losses),
      draws = COALESCE(${draws}, draws),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
}

// Delete an eval
export async function deleteEval(id) {
  // Delete associated matches first
  await sql`DELETE FROM matches WHERE eval_id = ${id}`;
  const result = await sql`DELETE FROM evals WHERE id = ${id}`;
  return result.rowCount > 0;
}

// Get matches for an eval
export async function getMatches(evalId, limit = 50) {
  const result = await sql`
    SELECT * FROM matches 
    WHERE eval_id = ${evalId} 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows;
}

// Create a match record
export async function createMatch(id, evalId, opponentType, opponentElo, result, movesCount, pgn, opening, playedAs) {
  await sql`
    INSERT INTO matches (id, eval_id, opponent_type, opponent_elo, result, moves_count, pgn, opening, played_as)
    VALUES (${id}, ${evalId}, ${opponentType}, ${opponentElo}, ${result}, ${movesCount}, ${pgn || ''}, ${opening || ''}, ${playedAs || ''})
  `;
}

// Get stats
export async function getStats() {
  const totalEvals = await sql`SELECT COUNT(*) as count FROM evals WHERE is_public = 1`;
  const totalMatches = await sql`SELECT COUNT(*) as count FROM matches`;
  const topEval = await sql`
    SELECT name, elo FROM evals 
    WHERE is_public = 1 AND elo IS NOT NULL 
    ORDER BY elo DESC LIMIT 1
  `;
  
  return {
    total_evals: parseInt(totalEvals.rows[0]?.count || 0),
    total_matches: parseInt(totalMatches.rows[0]?.count || 0),
    top_eval: topEval.rows[0] || null
  };
}
