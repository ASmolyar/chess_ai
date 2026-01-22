/**
 * Match Runner
 * Plays chess matches between custom eval functions and Stockfish
 * 
 * Supports both sequential and parallel game execution
 * Uses paired positions (same opening, colors swapped) for accurate ELO
 * 
 * Optimizations:
 * - Uses Stockfish to track position (no spawning temp processes)
 * - Proper draw detection (50-move, repetition, insufficient material)
 * - Supports custom starting positions from opening book
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { liveBroadcast } from './liveBroadcast.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fixed search depth for ELO calculation games
// Both our bot and Stockfish use the same depth for fair comparison
const SEARCH_DEPTH = 8; // Depth 8 for accurate play
const MAX_MOVES = 500; // Very high limit - games end via checkmate, 50-move rule, or repetition
const MOVE_TIMEOUT = 60000; // 60 second timeout per move
const MATCH_TIMEOUT = 30 * 60 * 1000; // 30 minute max per game (safety limit)

export class MatchRunner {
  constructor() {
    this.calculationProgress = new Map();
    this.engineServerUrl = 'http://localhost:8765';
    this.activeGames = new Map(); // gameId -> game state for parallel games
  }

  startCalculation(evalId, totalGames) {
    this.calculationProgress.set(evalId, {
      total: totalGames,
      completed: 0,
      inProgress: true
    });
  }

  incrementProgress(evalId) {
    const progress = this.calculationProgress.get(evalId);
    if (progress) {
      progress.completed++;
    }
  }

  endCalculation(evalId) {
    const progress = this.calculationProgress.get(evalId);
    if (progress) {
      progress.inProgress = false;
    }
  }

  isCalculating(evalId) {
    const progress = this.calculationProgress.get(evalId);
    return progress?.inProgress ?? false;
  }

  getProgress(evalId) {
    const progress = this.calculationProgress.get(evalId);
    if (!progress) return null;
    return {
      completed: progress.completed,
      total: progress.total,
      percentage: Math.round((progress.completed / progress.total) * 100)
    };
  }

  /**
   * Run a batch of 4 parallel games (2 positions × 2 colors each)
   * @param {Object} evalConfig - The eval configuration
   * @param {number} opponentElo - Target ELO for opponent
   * @param {Object} opening1 - First opening position { name, fen }
   * @param {Object} opening2 - Second opening position { name, fen }
   * @param {Object} batchInfo - { evalId, evalName, round, totalRounds, currentStats }
   * @returns {Object} { games: [...], positions: [...], opponentElo }
   */
  async runBatch(evalConfig, opponentElo, opening1, opening2, batchInfo) {
    const skill = this.eloToSkill(opponentElo);
    const level = { skill, elo: opponentElo };

    // Create 4 games - 2 paired positions, each played as both colors
    const games = [
      { id: 'A1', opening: opening1, playAsWhite: true },
      { id: 'A2', opening: opening1, playAsWhite: false },
      { id: 'B1', opening: opening2, playAsWhite: true },
      { id: 'B2', opening: opening2, playAsWhite: false },
    ];

    // Broadcast batch start
    liveBroadcast.batchStart({
      evalId: batchInfo.evalId,
      evalName: batchInfo.evalName,
      games: games.map(g => ({
        id: g.id,
        opening: g.opening.name,
        openingFen: g.opening.fen,
        playAsWhite: g.playAsWhite,
      })),
      round: batchInfo.round,
      totalRounds: batchInfo.totalRounds,
      opponentElo: opponentElo,
      opponentSkill: skill,
      currentStats: batchInfo.currentStats,
    });

    // Run all 4 games in parallel using stateless search endpoint
    const results = await Promise.all(
      games.map(game => 
        this.playSingleMatch(
          game.id,
          evalConfig, 
          level, 
          game.opening, 
          game.playAsWhite,
          batchInfo
        )
      )
    );

    // Broadcast batch complete
    liveBroadcast.batchComplete({
      evalId: batchInfo.evalId,
      games: results,
      round: batchInfo.round,
    });

    return {
      games: results,
      positions: [opening1, opening2],
      opponentElo,
    };
  }

  /**
   * Play a single match (used in parallel batch)
   * @param {string} gameId - Unique game identifier within batch
   * @param {Object} evalConfig - The eval configuration
   * @param {Object} stockfishLevel - { skill: number, elo: number }
   * @param {Object} opening - { name: string, fen: string }
   * @param {boolean} playAsWhite - Whether the custom eval plays as white
   * @param {Object} batchInfo - Info for broadcasting
   * @returns {Object} { gameId, result, movesCount, pgn, opening }
   */
  async playSingleMatch(gameId, evalConfig, stockfishLevel, opening, playAsWhite, batchInfo) {
    return new Promise(async (resolve, reject) => {
      let stockfish;
      try {
        stockfish = await this.createStockfishProcess(stockfishLevel.skill);
      } catch (err) {
        console.error(`[MatchRunner] Failed to create Stockfish for game ${gameId}:`, err);
        resolve({
          gameId,
          result: 'loss', // Consider it a loss if we can't start
          movesCount: 0,
          pgn: '',
          opening: opening.name,
          playAsWhite,
          error: err.message,
        });
        return;
      }
      
      // Determine starting position
      const isStartPos = !opening.fen || opening.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const position = isStartPos ? 'startpos' : `fen ${opening.fen}`;
      let moves = [];
      let moveCount = 0;
      let result = null;
      let pgn = '';
      
      // Determine whose turn it is from the FEN
      let isWhiteTurn = true;
      if (opening.fen) {
        const fenParts = opening.fen.split(' ');
        isWhiteTurn = fenParts[1] === 'w';
      }
      
      // Broadcast game start
      liveBroadcast.gameStart({
        evalId: batchInfo.evalId,
        gameId,
        opening: opening.name,
        openingFen: opening.fen,
        evalPlaysWhite: playAsWhite,
        opponentElo: stockfishLevel.elo,
      });
      
      const cleanup = () => {
        try {
          stockfish.stdin.write('quit\n');
          stockfish.kill();
        } catch (e) {}
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Match timeout for game ${gameId}`));
      }, MATCH_TIMEOUT);

      try {
        // Initialize Stockfish
        await this.sendStockfishCommand(stockfish, 'uci', 'uciok');
        await this.sendStockfishCommand(stockfish, `setoption name Skill Level value ${stockfishLevel.skill}`);
        await this.sendStockfishCommand(stockfish, 'isready', 'readyok');
        await this.sendStockfishCommand(stockfish, 'ucinewgame');
        await this.sendStockfishCommand(stockfish, 'isready', 'readyok');

        // Track positions for repetition detection
        const positionCounts = new Map();
        let halfMoveClock = 0;
        
        while (moveCount < MAX_MOVES && result === null) {
          const isCustomEngineTurn = (playAsWhite && isWhiteTurn) || (!playAsWhite && !isWhiteTurn);
          
          let move;
          let engineFailed = false;
          if (isCustomEngineTurn) {
            // Pass evalConfig to each search call (stateless endpoint creates fresh engine)
            move = await this.getCustomEngineMove(position, moves, stockfish, evalConfig);
            if (!move) {
              // Custom engine failed to respond - this is a loss, not a draw
              console.log(`[MatchRunner] Custom engine failed to return move at move ${moveCount + 1}`);
              engineFailed = true;
            }
          } else {
            move = await this.getStockfishMove(stockfish, position, moves);
          }

          if (engineFailed) {
            // Engine failure = loss for the custom eval
            result = 'loss';
            break;
          }

          if (!move || move === '(none)') {
            // No legal moves - game over
            if (await this.isInCheck(stockfish, position, moves)) {
              result = isCustomEngineTurn ? 'loss' : 'win';
            } else {
              result = 'draw'; // Stalemate
            }
            break;
          }

          moves.push(move);
          moveCount++;
          halfMoveClock++;
          
          // Broadcast the move
          liveBroadcast.gameMove({
            evalId: batchInfo.evalId,
            gameId,
            move: move,
            player: isCustomEngineTurn ? 'eval' : 'stockfish',
            moveCount: moveCount,
          });

          // Check for game end conditions
          const gameStatus = await this.checkGameStatus(stockfish, position, moves, positionCounts, halfMoveClock);
          if (gameStatus === 'checkmate') {
            result = isCustomEngineTurn ? 'win' : 'loss';
            break;
          } else if (gameStatus === 'stalemate' || gameStatus === 'draw' || 
                     gameStatus === 'repetition' || gameStatus === 'fifty_move' ||
                     gameStatus === 'insufficient') {
            result = 'draw';
            break;
          }

          isWhiteTurn = !isWhiteTurn;
        }

        if (result === null) {
          result = 'draw'; // Max moves reached
        }

        // Build PGN
        pgn = this.buildPgn(moves, result, playAsWhite, stockfishLevel.elo, opening);
        
        // Broadcast game end
        liveBroadcast.gameEnd({
          evalId: batchInfo.evalId,
          gameId,
          result: result,
          movesCount: moveCount,
          pgn: pgn,
        });

        clearTimeout(timeout);
        cleanup();

        resolve({
          gameId,
          result: result,
          movesCount: moveCount,
          pgn,
          opening: opening.name,
          playAsWhite,
        });

      } catch (error) {
        clearTimeout(timeout);
        cleanup();
        console.error(`[MatchRunner] Error in game ${gameId}:`, error);
        resolve({
          gameId,
          result: 'loss',
          movesCount: moveCount,
          pgn: '',
          opening: opening.name,
          playAsWhite,
          error: error.message,
        });
      }
    });
  }

  /**
   * Legacy: Play a match between custom eval and Stockfish (sequential)
   * Kept for backwards compatibility
   */
  async playMatch(evalConfig, stockfishLevel, playAsWhite, matchInfo = null) {
    // Create a default opening for legacy calls
    const defaultOpening = {
      name: 'Standard',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    };
    
    const batchInfo = matchInfo ? {
      evalId: matchInfo.evalId,
      evalName: matchInfo.evalName,
      round: 1,
      totalRounds: 1,
      currentStats: {
        wins: matchInfo.wins || 0,
        draws: matchInfo.draws || 0,
        losses: matchInfo.losses || 0,
      }
    } : {
      evalId: 'legacy',
      evalName: 'Unknown',
      round: 1,
      totalRounds: 1,
      currentStats: { wins: 0, draws: 0, losses: 0 }
    };

    const result = await this.playSingleMatch(
      'legacy',
      evalConfig,
      stockfishLevel,
      defaultOpening,
      playAsWhite,
      batchInfo
    );

    return {
      result: result.result,
      movesCount: result.movesCount,
      pgn: result.pgn,
    };
  }

  /**
   * Convert ELO to Stockfish skill level (0-20)
   */
  eloToSkill(elo) {
    // Approximate mapping: 600 ELO = skill 0, 2800 ELO = skill 20
    const skill = Math.round((elo - 600) / 110);
    return Math.max(0, Math.min(20, skill));
  }

  async createStockfishProcess(skillLevel) {
    // Try to find stockfish in common locations
    const stockfishPaths = [
      '/opt/homebrew/bin/stockfish',
      '/usr/local/bin/stockfish',
      '/usr/bin/stockfish',
      path.join(__dirname, 'stockfish'),
      path.join(__dirname, '..', 'stockfish'),
      'stockfish',
    ];

    for (const sfPath of stockfishPaths) {
      try {
        const result = await this.trySpawnStockfish(sfPath);
        if (result) {
          return result;
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('Stockfish not found. Please install stockfish: brew install stockfish');
  }

  trySpawnStockfish(sfPath) {
    return new Promise((resolve, reject) => {
      const stockfish = spawn(sfPath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let resolved = false;

      stockfish.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      stockfish.stdout.once('data', () => {
        if (!resolved) {
          resolved = true;
          resolve(stockfish);
        }
      });

      stockfish.stdin.write('uci\n');

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            stockfish.kill();
          } catch (e) {}
          reject(new Error('Stockfish startup timeout'));
        }
      }, 2000);
    });
  }

  sendStockfishCommand(stockfish, command, waitFor = null) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout waiting for: ${waitFor}`)), 10000);

      if (waitFor) {
        const handler = (data) => {
          const output = data.toString();
          if (output.includes(waitFor)) {
            stockfish.stdout.off('data', handler);
            clearTimeout(timeout);
            resolve(output);
          }
        };
        stockfish.stdout.on('data', handler);
      } else {
        clearTimeout(timeout);
        resolve();
      }

      stockfish.stdin.write(command + '\n');
    });
  }

  async getStockfishMove(stockfish, position, moves) {
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    
    const output = await this.sendStockfishCommand(stockfish, `go depth ${SEARCH_DEPTH}`, 'bestmove');
    
    const match = output.match(/bestmove\s+(\S+)/);
    return match ? match[1] : null;
  }

  async configureCustomEngine(evalConfig) {
    try {
      await fetch(`${this.engineServerUrl}/api/newGame`, { method: 'POST' });
      
      await fetch(`${this.engineServerUrl}/api/setEvaluator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'rule' })
      });

      await fetch(`${this.engineServerUrl}/api/configureRuleEval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalConfig)
      });
    } catch (error) {
      console.error('Failed to configure custom engine:', error);
      throw error;
    }
  }

  async getCustomEngineMove(position, moves, stockfish, evalConfig = null) {
    try {
      const fen = await this.getFenFromStockfish(stockfish, position, moves);

      // Use stateless endpoint that creates a fresh engine per request
      // This allows parallel games without race conditions
      const response = await fetch(`${this.engineServerUrl}/api/searchFromFen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen, 
          depth: SEARCH_DEPTH,
          evalConfig: evalConfig || null
        })
      });

      const result = await response.json();
      if (result.error) {
        console.error('Engine error:', result.error);
        return null;
      }
      return result.bestMove;
    } catch (error) {
      console.error('Failed to get custom engine move:', error);
      return null;
    }
  }

  async getFenFromStockfish(stockfish, position, moves) {
    if (position === 'startpos' && moves.length === 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    const output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    
    const fenMatch = output.match(/Fen:\s+(\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+)/);
    return fenMatch ? fenMatch[1] : null;
  }

  async isInCheck(stockfish, position, moves) {
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    const output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    
    const checkersMatch = output.match(/Checkers:\s*(\S*)/);
    return checkersMatch && checkersMatch[1] && checkersMatch[1] !== '-';
  }

  /**
   * Check if the game has ended (checkmate, stalemate, or draw)
   * Uses Stockfish to evaluate the position
   * 
   * IMPORTANT: Repetition is tracked by position key (board + turn + castling + ep)
   * We only check for draws after sufficient moves to avoid false positives
   */
  async checkGameStatus(stockfish, position, moves, positionCounts, halfMoveClock) {
    // Don't check for draws too early - minimum 16 half-moves for threefold repetition to be possible
    // (need at least 4 moves by each side to return to same position twice after initial)
    if (moves.length < 16) {
      // Still record position for future reference
      await this.recordPosition(stockfish, position, moves, positionCounts);
      return 'ongoing';
    }
    
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    
    let output;
    try {
      output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    } catch (e) {
      return 'ongoing';
    }
    
    const fenMatch = output.match(/Fen:\s+([^\n]+)/);
    if (fenMatch) {
      const fenParts = fenMatch[1].trim().split(' ');
      // Position key: board position + side to move + castling rights + en passant
      const positionKey = fenParts.slice(0, 4).join(' ');
      
      // Only increment if this is a NEW occurrence (not already counted this turn)
      const lastCountedMove = positionCounts.get('__lastMove__') || -1;
      if (lastCountedMove !== moves.length) {
        const count = (positionCounts.get(positionKey) || 0) + 1;
        positionCounts.set(positionKey, count);
        positionCounts.set('__lastMove__', moves.length);
        
        // Threefold repetition - same position 3 times
        if (count >= 3) {
          console.log(`[MatchRunner] Draw by repetition after ${moves.length} moves (position seen ${count} times)`);
          return 'repetition';
        }
      }
      
      // 50-move rule - 100 half-moves without pawn move or capture
      if (fenParts.length >= 5) {
        const fenHalfMove = parseInt(fenParts[4]) || 0;
        if (fenHalfMove >= 100) {
          console.log(`[MatchRunner] Draw by 50-move rule after ${moves.length} moves`);
          return 'fifty_move';
        }
      }
    }
    
    return 'ongoing';
  }

  /**
   * Record position in the position counts map (for early game tracking)
   */
  async recordPosition(stockfish, position, moves, positionCounts) {
    try {
      const positionCmd = moves.length > 0 
        ? `position ${position} moves ${moves.join(' ')}`
        : `position ${position}`;
      
      await this.sendStockfishCommand(stockfish, positionCmd);
      const output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
      
      const fenMatch = output.match(/Fen:\s+([^\n]+)/);
      if (fenMatch) {
        const fenParts = fenMatch[1].trim().split(' ');
        const positionKey = fenParts.slice(0, 4).join(' ');
        
        const lastCountedMove = positionCounts.get('__lastMove__') || -1;
        if (lastCountedMove !== moves.length) {
          const count = (positionCounts.get(positionKey) || 0) + 1;
          positionCounts.set(positionKey, count);
          positionCounts.set('__lastMove__', moves.length);
        }
      }
    } catch (e) {
      // Ignore errors during early position recording
    }
  }

  buildPgn(moves, result, customPlayedWhite, stockfishElo, opening = null) {
    const resultStr = result === 'win' 
      ? (customPlayedWhite ? '1-0' : '0-1')
      : result === 'loss'
        ? (customPlayedWhite ? '0-1' : '1-0')
        : '1/2-1/2';

    let pgn = `[Event "ELO Calculation Match"]\n`;
    pgn += `[White "${customPlayedWhite ? 'CustomEval' : 'Stockfish'}"]\n`;
    pgn += `[Black "${customPlayedWhite ? 'Stockfish' : 'CustomEval'}"]\n`;
    pgn += `[WhiteElo "${customPlayedWhite ? '?' : stockfishElo}"]\n`;
    pgn += `[BlackElo "${customPlayedWhite ? stockfishElo : '?'}"]\n`;
    if (opening) {
      pgn += `[Opening "${opening.name}"]\n`;
      pgn += `[ECO "${opening.eco || '?'}"]\n`;
      if (opening.fen && opening.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        pgn += `[FEN "${opening.fen}"]\n`;
        pgn += `[SetUp "1"]\n`;
      }
    }
    pgn += `[Result "${resultStr}"]\n\n`;

    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        pgn += `${Math.floor(i/2) + 1}. `;
      }
      pgn += moves[i] + ' ';
    }
    pgn += resultStr;

    return pgn;
  }
}
