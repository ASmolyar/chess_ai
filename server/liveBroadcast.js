/**
 * Live Game Broadcast System
 * Streams chess matches in real-time via WebSocket
 */

import { WebSocketServer } from 'ws';

class LiveBroadcast {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.currentMatch = null;
  }

  /**
   * Start WebSocket server on specified port
   */
  start(port = 3002) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      console.log('[LiveBroadcast] Client connected');
      this.clients.add(ws);
      
      // Send current match state if one is in progress
      if (this.currentMatch) {
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

  /**
   * Start a new match broadcast
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
   * Broadcast a move
   */
  move(moveData) {
    if (!this.currentMatch) return;
    
    this.currentMatch.moves.push(moveData.move);
    this.currentMatch.fen = moveData.fen || this.currentMatch.fen;
    this.currentMatch.lastMove = moveData.move;
    this.currentMatch.lastMoveBy = moveData.player; // 'eval' or 'stockfish'
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
   * End current match
   */
  endMatch(result) {
    if (!this.currentMatch) return;
    
    this.currentMatch.status = 'completed';
    this.currentMatch.result = result.result; // 'win', 'loss', 'draw'
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

