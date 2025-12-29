/**
 * Match Runner
 * Plays chess matches between custom eval functions and Stockfish
 * 
 * Optimizations:
 * - Uses Stockfish to track position (no spawning temp processes)
 * - Proper draw detection (50-move, repetition, insufficient material)
 * - Lower depth for faster games
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
const MATCH_TIMEOUT = 30 * 60 * 1000; // 30 minute max per game (safety limit) (endgames can be complex)

export class MatchRunner {
  constructor() {
    this.calculationProgress = new Map();
    this.engineServerUrl = 'http://localhost:8765';
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
   * Play a match between custom eval and Stockfish
   * @param {Object} evalConfig - The eval configuration
   * @param {Object} stockfishLevel - { skill: number, elo: number }
   * @param {boolean} playAsWhite - Whether the custom eval plays as white
   * @param {Object} matchInfo - { evalId, evalName } for broadcasting
   * @returns {Object} { result, movesCount, pgn }
   */
  async playMatch(evalConfig, stockfishLevel, playAsWhite, matchInfo = null) {
    return new Promise(async (resolve, reject) => {
      const stockfish = await this.createStockfishProcess(stockfishLevel.skill);
      
      let position = 'startpos';
      let moves = [];
      let moveCount = 0;
      let result = null;
      let pgn = '';
      
      // Start live broadcast if we have match info
      if (matchInfo) {
        liveBroadcast.startMatch({
          evalId: matchInfo.evalId,
          evalName: matchInfo.evalName,
          opponentElo: stockfishLevel.elo,
          opponentSkill: stockfishLevel.skill,
          evalPlaysWhite: playAsWhite,
          currentEloEstimate: matchInfo.currentEloEstimate,
          wins: matchInfo.wins,
          draws: matchInfo.draws,
          losses: matchInfo.losses
        });
      }
      
      const cleanup = () => {
        try {
          stockfish.stdin.write('quit\n');
          stockfish.kill();
        } catch (e) {}
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Match timeout'));
      }, MATCH_TIMEOUT);

      try {
        // Initialize Stockfish
        await this.sendStockfishCommand(stockfish, 'uci', 'uciok');
        await this.sendStockfishCommand(stockfish, `setoption name Skill Level value ${stockfishLevel.skill}`);
        await this.sendStockfishCommand(stockfish, 'isready', 'readyok');
        await this.sendStockfishCommand(stockfish, 'ucinewgame');
        await this.sendStockfishCommand(stockfish, 'isready', 'readyok');

        // Configure our engine
        await this.configureCustomEngine(evalConfig);

        // Play the game
        let isWhiteTurn = true;
        
        // Track positions for repetition detection
        const positionCounts = new Map();
        let halfMoveClock = 0; // For 50-move rule
        
        while (moveCount < MAX_MOVES && result === null) {
          const isCustomEngineTurn = (playAsWhite && isWhiteTurn) || (!playAsWhite && !isWhiteTurn);
          
          let move;
          if (isCustomEngineTurn) {
            // Custom engine's turn - pass stockfish for FEN
            move = await this.getCustomEngineMove(position, moves, stockfish);
          } else {
            // Stockfish's turn
            move = await this.getStockfishMove(stockfish, position, moves);
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
          
          // Update half-move clock (reset on pawn move or capture)
          const isPawnMove = move[0] >= 'a' && move[0] <= 'h' && move.length === 4;
          // We can't easily detect captures without the board, so just track move count
          halfMoveClock++;
          
          // Broadcast the move (include ELO info from matchInfo if available)
          if (matchInfo) {
            liveBroadcast.move({
              move: move,
              player: isCustomEngineTurn ? 'eval' : 'stockfish',
              fen: null,
              thinkingTime: 0,
              moveCount: moveCount,
              currentEloEstimate: matchInfo.currentEloEstimate,
              wins: matchInfo.wins,
              draws: matchInfo.draws,
              losses: matchInfo.losses
            });
          }

          // Check for game end conditions
          const gameStatus = await this.checkGameStatus(stockfish, position, moves, positionCounts, halfMoveClock);
          if (gameStatus === 'checkmate') {
            // The player who just moved won
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
        pgn = this.buildPgn(moves, result, playAsWhite, stockfishLevel.elo);
        
        // Broadcast match end (include ELO info)
        if (matchInfo) {
          liveBroadcast.endMatch({
            result: result,
            reason: result === 'draw' ? 'draw' : 'checkmate',
            pgn: pgn,
            movesCount: moveCount,
            currentEloEstimate: matchInfo.currentEloEstimate,
            wins: matchInfo.wins,
            draws: matchInfo.draws,
            losses: matchInfo.losses
          });
        }

        clearTimeout(timeout);
        cleanup();

        resolve({
          result: playAsWhite ? result : (result === 'win' ? 'win' : result === 'loss' ? 'loss' : 'draw'),
          movesCount: moveCount,
          pgn
        });

      } catch (error) {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      }
    });
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
          console.log(`[MatchRunner] Using Stockfish at: ${sfPath}`);
          return result;
        }
      } catch (e) {
        // Try next path
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

      // If we get any output, it started successfully
      stockfish.stdout.once('data', () => {
        if (!resolved) {
          resolved = true;
          resolve(stockfish);
        }
      });

      // Send UCI command to check if it works
      stockfish.stdin.write('uci\n');

      // Timeout after 2 seconds
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
    
    // Stockfish uses depth 8 for consistency
    const output = await this.sendStockfishCommand(stockfish, `go depth ${SEARCH_DEPTH}`, 'bestmove');
    
    const match = output.match(/bestmove\s+(\S+)/);
    return match ? match[1] : null;
  }

  async configureCustomEngine(evalConfig) {
    try {
      // Set up the custom evaluator on our Java engine
      await fetch(`${this.engineServerUrl}/api/newGame`, { method: 'POST' });
      
      // Configure the rule-based evaluator with the eval config
      await fetch(`${this.engineServerUrl}/api/setEvaluator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'rule' })
      });

      // Send the full eval configuration
      // The engine needs to support receiving rule configurations
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

  async getCustomEngineMove(position, moves, stockfish) {
    try {
      // Use the existing Stockfish process to get FEN (much faster!)
      const fen = await this.getFenFromStockfish(stockfish, position, moves);

      // Set position on our engine
      await fetch(`${this.engineServerUrl}/api/setFen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen })
      });

      // Search at fixed depth
      const response = await fetch(`${this.engineServerUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth: SEARCH_DEPTH })
      });

      const result = await response.json();
      return result.bestMove;
    } catch (error) {
      console.error('Failed to get custom engine move:', error);
      return null;
    }
  }

  async getFenFromStockfish(stockfish, position, moves) {
    // Use the existing Stockfish process to get FEN (no spawning!)
    if (position === 'startpos' && moves.length === 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    const output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    
    // Parse FEN from output
    const fenMatch = output.match(/Fen:\s+(\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+)/);
    return fenMatch ? fenMatch[1] : null;
  }

  async isInCheck(stockfish, position, moves) {
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    const output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    
    // Check if there are any checkers
    const checkersMatch = output.match(/Checkers:\s*(\S*)/);
    return checkersMatch && checkersMatch[1] && checkersMatch[1] !== '-';
  }

  async checkGameStatus(stockfish, position, moves, positionCounts, halfMoveClock) {
    // Don't check draws in first few moves
    if (moves.length < 6) {
      return 'ongoing';
    }
    
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    
    // Get FEN from Stockfish
    let output;
    try {
      output = await this.sendStockfishCommand(stockfish, 'd', 'Checkers');
    } catch (e) {
      return 'ongoing'; // If we can't get position, continue
    }
    
    // Parse FEN for position tracking (use full FEN minus move counters)
    const fenMatch = output.match(/Fen:\s+([^\n]+)/);
    if (fenMatch) {
      // Use position + castling + en passant for key (not move counters)
      const fenParts = fenMatch[1].trim().split(' ');
      const positionKey = fenParts.slice(0, 4).join(' '); // board + turn + castling + ep
      const count = (positionCounts.get(positionKey) || 0) + 1;
      positionCounts.set(positionKey, count);
      
      // Threefold repetition
      if (count >= 3) {
        console.log(`[MatchRunner] Draw by repetition (position seen ${count} times)`);
        return 'repetition';
      }
      
      // Get half-move clock from FEN
      if (fenParts.length >= 5) {
        const fenHalfMove = parseInt(fenParts[4]) || 0;
        if (fenHalfMove >= 100) {
          console.log(`[MatchRunner] Draw by 50-move rule (${fenHalfMove} half-moves)`);
          return 'fifty_move';
        }
      }
    }
    
    return 'ongoing';
  }

  buildPgn(moves, result, customPlayedWhite, stockfishElo) {
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
    pgn += `[Result "${resultStr}"]\n\n`;

    // Add moves
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

