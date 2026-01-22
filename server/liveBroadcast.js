/**
 * Live Game Broadcast System
 * Streams chess matches in real-time via WebSocket
 * 
 * Supports both single-game and parallel multi-game broadcasts
 */

import { WebSocketServer } from 'ws';

class LiveBroadcast {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    
    // Single game state (legacy)
    this.currentMatch = null;
    
    // Multi-game batch state
    this.currentBatch = null;
    this.activeGames = new Map(); // gameId -> game state
  }

  /**
   * Start WebSocket server on specified port
   */
  start(port = 3002) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      console.log('[LiveBroadcast] Client connected');
      this.clients.add(ws);
      
      // Send current state if one is in progress
      if (this.currentBatch) {
        ws.send(JSON.stringify({
          type: 'batch_state',
          data: {
            ...this.currentBatch,
            games: Array.from(this.activeGames.values())
          }
        }));
      } else if (this.currentMatch) {
        ws.send(JSON.stringify({
          type: 'match_state',
          data: this.currentMatch
        }));
      }
      
      ws.on('close', () => {
        console.log('[LiveBroadcast] Client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (err) => {
        console.error('[LiveBroadcast] WebSocket error:', err);
        this.clients.delete(ws);
      });
    });
    
    console.log(`[LiveBroadcast] WebSocket server running on ws://localhost:${port}`);
    return this;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  // ============ BATCH/PARALLEL GAME METHODS ============

  /**
   * Start a new batch of parallel games
   */
  batchStart(batchInfo) {
    this.currentBatch = {
      evalId: batchInfo.evalId,
      evalName: batchInfo.evalName,
      round: batchInfo.round,
      totalRounds: batchInfo.totalRounds,
      opponentElo: batchInfo.opponentElo,
      opponentSkill: batchInfo.opponentSkill,
      currentStats: batchInfo.currentStats,
      startTime: Date.now(),
      status: 'in_progress',
    };
    
    // Initialize all games in the batch
    this.activeGames.clear();
    for (const game of batchInfo.games) {
      this.activeGames.set(game.id, {
        id: game.id,
        opening: game.opening,
        openingFen: game.openingFen,
        evalPlaysWhite: game.playAsWhite,
        moves: [],
        fen: game.openingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        status: 'waiting',
        moveCount: 0,
      });
    }
    
    this.broadcast({
      type: 'batch_start',
      data: {
        ...this.currentBatch,
        games: Array.from(this.activeGames.values())
      }
    });
  }

  /**
   * Game within batch has started
   */
  gameStart(gameInfo) {
    const game = this.activeGames.get(gameInfo.gameId);
    if (!game) return;
    
    game.status = 'in_progress';
    game.opponentElo = gameInfo.opponentElo;
    game.startTime = Date.now();
    
    this.broadcast({
      type: 'game_start',
      data: {
        gameId: gameInfo.gameId,
        opening: game.opening,
        openingFen: game.openingFen,
        evalPlaysWhite: game.evalPlaysWhite,
        opponentElo: gameInfo.opponentElo,
      }
    });
  }

  /**
   * Move made in a parallel game
   */
  gameMove(moveData) {
    const game = this.activeGames.get(moveData.gameId);
    if (!game) return;
    
    game.moves.push(moveData.move);
    game.lastMove = moveData.move;
    game.lastMoveBy = moveData.player;
    game.moveCount = moveData.moveCount;
    
    this.broadcast({
      type: 'game_move',
      data: {
        gameId: moveData.gameId,
        move: moveData.move,
        player: moveData.player,
        moveCount: moveData.moveCount,
      }
    });
  }

  /**
   * Single game in batch has ended
   */
  gameEnd(endData) {
    const game = this.activeGames.get(endData.gameId);
    if (!game) return;
    
    game.status = 'completed';
    game.result = endData.result;
    game.movesCount = endData.movesCount;
    game.pgn = endData.pgn;
    game.endTime = Date.now();
    game.duration = game.endTime - (game.startTime || game.endTime);
    
    this.broadcast({
      type: 'game_end',
      data: {
        gameId: endData.gameId,
        result: endData.result,
        movesCount: endData.movesCount,
        pgn: endData.pgn,
        duration: game.duration,
      }
    });
  }

  /**
   * All games in batch have completed
   */
  batchComplete(batchData) {
    if (!this.currentBatch) return;
    
    this.currentBatch.status = 'completed';
    this.currentBatch.endTime = Date.now();
    
    // Collect results
    const games = Array.from(this.activeGames.values());
    const wins = games.filter(g => g.result === 'win').length;
    const draws = games.filter(g => g.result === 'draw').length;
    const losses = games.filter(g => g.result === 'loss').length;
    
    this.broadcast({
      type: 'batch_complete',
      data: {
        round: batchData.round,
        games: games,
        wins,
        draws,
        losses,
      }
    });
  }

  // ============ LEGACY SINGLE GAME METHODS ============

  /**
   * Start a new match broadcast (legacy)
   */
  startMatch(matchInfo) {
    this.currentMatch = {
      evalId: matchInfo.evalId,
      evalName: matchInfo.evalName,
      opponentElo: matchInfo.opponentElo,
      opponentSkill: matchInfo.opponentSkill,
      evalPlaysWhite: matchInfo.evalPlaysWhite,
      moves: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      status: 'in_progress',
      startTime: Date.now()
    };
    
    this.broadcast({
      type: 'match_start',
      data: this.currentMatch
    });
  }

  /**
   * Broadcast a move (legacy)
   */
  move(moveData) {
    if (!this.currentMatch) return;
    
    this.currentMatch.moves.push(moveData.move);
    this.currentMatch.fen = moveData.fen || this.currentMatch.fen;
    this.currentMatch.lastMove = moveData.move;
    this.currentMatch.lastMoveBy = moveData.player;
    this.currentMatch.moveNumber = this.currentMatch.moves.length;
    
    this.broadcast({
      type: 'move',
      data: {
        move: moveData.move,
        fen: moveData.fen,
        player: moveData.player,
        moveNumber: this.currentMatch.moves.length,
        thinkingTime: moveData.thinkingTime
      }
    });
  }

  /**
   * End current match (legacy)
   */
  endMatch(result) {
    if (!this.currentMatch) return;
    
    this.currentMatch.status = 'completed';
    this.currentMatch.result = result.result;
    this.currentMatch.endTime = Date.now();
    this.currentMatch.duration = this.currentMatch.endTime - this.currentMatch.startTime;
    
    this.broadcast({
      type: 'match_end',
      data: {
        result: result.result,
        reason: result.reason,
        movesCount: this.currentMatch.moves.length,
        duration: this.currentMatch.duration,
        pgn: result.pgn
      }
    });
    
    this.currentMatch = null;
  }

  // ============ SHARED METHODS ============

  /**
   * Send progress update
   */
  progress(progressData) {
    this.broadcast({
      type: 'progress',
      data: progressData
    });
  }

  /**
   * Send calculation status
   */
  calculationStatus(status) {
    // Clear batch state when calculation ends
    if (status.status === 'completed' || status.status === 'error') {
      this.currentBatch = null;
      this.activeGames.clear();
    }
    
    this.broadcast({
      type: 'calculation_status',
      data: status
    });
  }

  /**
   * Get client count
   */
  getClientCount() {
    return this.clients.size;
  }
}

// Singleton instance
export const liveBroadcast = new LiveBroadcast();
export default liveBroadcast;
