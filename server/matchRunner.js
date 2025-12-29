/**
 * Match Runner
 * Plays chess matches between custom eval functions and Stockfish
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fixed search depth for all bots (except random/debug)
const SEARCH_DEPTH = 8;
const MAX_MOVES = 200; // Maximum moves per game
const MOVE_TIMEOUT = 30000; // 30 second timeout per move

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
   * @returns {Object} { result, movesCount, pgn }
   */
  async playMatch(evalConfig, stockfishLevel, playAsWhite) {
    return new Promise(async (resolve, reject) => {
      const stockfish = await this.createStockfishProcess(stockfishLevel.skill);
      
      let position = 'startpos';
      let moves = [];
      let moveCount = 0;
      let result = null;
      let pgn = '';
      
      const cleanup = () => {
        try {
          stockfish.stdin.write('quit\n');
          stockfish.kill();
        } catch (e) {}
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Match timeout'));
      }, MAX_MOVES * MOVE_TIMEOUT);

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
        
        while (moveCount < MAX_MOVES && result === null) {
          const isCustomEngineTurn = (playAsWhite && isWhiteTurn) || (!playAsWhite && !isWhiteTurn);
          
          let move;
          if (isCustomEngineTurn) {
            // Custom engine's turn
            move = await this.getCustomEngineMove(position, moves);
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

          // Check for game end conditions
          const gameStatus = await this.checkGameStatus(stockfish, position, moves);
          if (gameStatus === 'checkmate') {
            // The player who just moved won
            result = isCustomEngineTurn ? 'win' : 'loss';
            break;
          } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
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
      'stockfish',
      '/usr/local/bin/stockfish',
      '/usr/bin/stockfish',
      '/opt/homebrew/bin/stockfish',
      path.join(__dirname, 'stockfish'),
      path.join(__dirname, '..', 'stockfish'),
    ];

    for (const sfPath of stockfishPaths) {
      try {
        const stockfish = spawn(sfPath, [], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        return new Promise((resolve, reject) => {
          stockfish.on('error', () => reject(new Error(`Failed to start stockfish at ${sfPath}`)));
          
          // Give it a moment to start
          setTimeout(() => resolve(stockfish), 100);
        });
      } catch (e) {
        continue;
      }
    }

    throw new Error('Stockfish not found. Please install stockfish: brew install stockfish');
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

  async getCustomEngineMove(position, moves) {
    try {
      // Build FEN or send moves to our engine
      const fen = position === 'startpos' && moves.length === 0
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : await this.getFenAfterMoves(position, moves);

      // Set position
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

  async getFenAfterMoves(position, moves) {
    // Use Stockfish to get FEN after moves
    // This is a workaround - in production you'd want a proper chess library
    const tempSf = await this.createStockfishProcess(0);
    
    try {
      await this.sendStockfishCommand(tempSf, 'uci', 'uciok');
      
      const positionCmd = moves.length > 0 
        ? `position ${position} moves ${moves.join(' ')}`
        : `position ${position}`;
      
      await this.sendStockfishCommand(tempSf, positionCmd);
      const output = await this.sendStockfishCommand(tempSf, 'd', 'Checkers');
      
      // Parse FEN from output
      const fenMatch = output.match(/Fen:\s+(\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+)/);
      
      tempSf.stdin.write('quit\n');
      tempSf.kill();
      
      return fenMatch ? fenMatch[1] : null;
    } catch (e) {
      tempSf.kill();
      throw e;
    }
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

  async checkGameStatus(stockfish, position, moves) {
    const positionCmd = moves.length > 0 
      ? `position ${position} moves ${moves.join(' ')}`
      : `position ${position}`;
    
    await this.sendStockfishCommand(stockfish, positionCmd);
    
    // Check for legal moves
    const output = await this.sendStockfishCommand(stockfish, 'go perft 1', 'Nodes');
    const nodesMatch = output.match(/Nodes searched:\s*(\d+)/);
    const nodeCount = nodesMatch ? parseInt(nodesMatch[1]) : 1;
    
    if (nodeCount === 0) {
      // No legal moves
      const isCheck = await this.isInCheck(stockfish, position, moves);
      return isCheck ? 'checkmate' : 'stalemate';
    }
    
    // Check for 50-move rule (simplified - just check move count)
    // A proper implementation would track pawn moves and captures
    
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

