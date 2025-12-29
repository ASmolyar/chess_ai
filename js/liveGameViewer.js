/**
 * Live Game Viewer
 * Shows live chess matches with proper board visualization during ELO calculation
 */

const WS_URL = 'ws://localhost:3002';

// Piece names for CSS classes (same as app.js)
const LIVE_PIECE_NAMES = {
    'k': 'king', 'q': 'queen', 'r': 'rook',
    'b': 'bishop', 'n': 'knight', 'p': 'pawn'
};

class LiveGameViewer {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.currentMatch = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Set();
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[LiveViewer] Connected to live broadcast server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('[LiveViewer] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[LiveViewer] Disconnected from live broadcast server');
        this.isConnected = false;
        this.notifyListeners({ type: 'disconnected' });
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[LiveViewer] WebSocket error:', error);
      };
    } catch (e) {
      console.error('[LiveViewer] Failed to connect:', e);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'match_state':
      case 'match_start':
        this.currentMatch = message.data;
        break;
      case 'move':
        if (this.currentMatch) {
          this.currentMatch.moves.push(message.data.move);
          this.currentMatch.lastMove = message.data.move;
          this.currentMatch.lastMoveBy = message.data.player;
        }
        break;
      case 'match_end':
        if (this.currentMatch) {
          this.currentMatch.status = 'completed';
          this.currentMatch.result = message.data.result;
        }
        break;
    }
    this.notifyListeners(message);
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(message) {
    this.listeners.forEach(callback => {
      try { callback(message); } catch (e) { console.error('[LiveViewer] Listener error:', e); }
    });
  }
}

// Live Viewer UI Component with proper chess board
class LiveViewerUI {
  constructor() {
    this.viewer = new LiveGameViewer();
    this.container = null;
    this.isVisible = false;
    this.isMinimized = false;
    
    // Board state (8x8 array, [row][col], row 0 = rank 8)
    this.boardState = this.createInitialBoard();
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
    
    // Game history tracking
    this.gameResults = []; // Array of { opponent, elo, result, moveCount }
    this.currentEloEstimate = 1200;
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
  }

  createInitialBoard() {
    // Return starting position
    // Board is row 0 = rank 8 (black's back rank), row 7 = rank 1 (white's back rank)
    return [
      [{c:'b',t:'r'},{c:'b',t:'n'},{c:'b',t:'b'},{c:'b',t:'q'},{c:'b',t:'k'},{c:'b',t:'b'},{c:'b',t:'n'},{c:'b',t:'r'}],
      [{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'},{c:'b',t:'p'}],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'},{c:'w',t:'p'}],
      [{c:'w',t:'r'},{c:'w',t:'n'},{c:'w',t:'b'},{c:'w',t:'q'},{c:'w',t:'k'},{c:'w',t:'b'},{c:'w',t:'n'},{c:'w',t:'r'}]
    ];
  }

  init() {
    this.createUI();
    this.viewer.connect();
    this.viewer.addListener((message) => this.handleUpdate(message));
  }

  createUI() {
    const container = document.createElement('div');
    container.id = 'live-viewer';
    container.className = 'live-viewer';
    container.innerHTML = `
      <div class="live-viewer-header">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span class="live-text">LIVE</span>
        </div>
        <span class="live-title">ELO Calculation</span>
        <div class="live-header-actions">
          <button class="live-btn" id="live-minimize-btn" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="live-btn" id="live-close-btn" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      
      <div class="live-viewer-content" id="live-viewer-content">
        <div class="live-status-bar" id="live-status-bar">
          <span class="connection-status" id="live-connection-status">Connecting...</span>
        </div>
        
        <div class="live-match-info" id="live-match-info">
          <div class="live-waiting">Waiting for ELO calculation to start...</div>
        </div>
        
        <div class="live-board-wrapper">
          <div class="live-board" id="live-board"></div>
        </div>
        
        <div class="live-elo-tracker" id="live-elo-tracker">
          <div class="elo-current">
            <span class="elo-label">Estimated ELO</span>
            <span class="elo-value" id="live-elo-value">—</span>
          </div>
          <div class="elo-record">
            <span class="record-wins" id="live-wins">0W</span>
            <span class="record-draws" id="live-draws">0D</span>
            <span class="record-losses" id="live-losses">0L</span>
          </div>
        </div>
        
        <div class="live-game-log" id="live-game-log">
          <div class="log-header">Match History</div>
          <div class="log-entries" id="live-log-entries">
            <div class="log-empty">No matches played yet</div>
          </div>
        </div>
        
        <div class="live-progress" id="live-progress"></div>
      </div>
    `;
    
    const leaderboardTab = document.getElementById('leaderboard-tab');
    if (leaderboardTab) {
      leaderboardTab.appendChild(container);
    }
    
    this.container = container;
    this.bindEvents();
    this.renderBoard();
  }

  bindEvents() {
    document.getElementById('live-minimize-btn')?.addEventListener('click', () => this.toggleMinimize());
    document.getElementById('live-close-btn')?.addEventListener('click', () => this.hide());
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const content = document.getElementById('live-viewer-content');
    if (content) {
      content.classList.toggle('minimized', this.isMinimized);
    }
  }

  show() {
    this.isVisible = true;
    this.container?.classList.add('visible');
  }

  hide() {
    this.isVisible = false;
    this.container?.classList.remove('visible');
  }

  handleUpdate(message) {
    switch (message.type) {
      case 'connected':
        this.updateConnectionStatus(true);
        break;
      case 'disconnected':
        this.updateConnectionStatus(false);
        break;
      case 'match_start':
        this.onMatchStart(message.data);
        break;
      case 'move':
        this.onMove(message.data);
        break;
      case 'match_end':
        this.onMatchEnd(message.data);
        break;
      case 'progress':
        this.onProgress(message.data);
        break;
      case 'calculation_status':
        this.onCalculationStatus(message.data);
        break;
    }
  }

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('live-connection-status');
    if (statusEl) {
      statusEl.textContent = connected ? 'Connected' : 'Disconnected';
      statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    const liveDot = this.container?.querySelector('.live-dot');
    if (liveDot) {
      liveDot.classList.toggle('active', connected);
    }
  }

  onMatchStart(data) {
    // Reset board to starting position
    this.boardState = this.createInitialBoard();
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
    
    // Show the viewer
    this.show();
    
    // Update ELO and stats from server (if provided)
    if (data.currentEloEstimate) {
      this.currentEloEstimate = data.currentEloEstimate;
      const eloEl = document.getElementById('live-elo-value');
      if (eloEl) eloEl.textContent = data.currentEloEstimate;
    }
    if (data.wins !== undefined) {
      this.wins = data.wins;
      this.losses = data.losses;
      this.draws = data.draws;
      document.getElementById('live-wins').textContent = `${this.wins}W`;
      document.getElementById('live-draws').textContent = `${this.draws}D`;
      document.getElementById('live-losses').textContent = `${this.losses}L`;
    }
    
    // Update match info
    const infoEl = document.getElementById('live-match-info');
    if (infoEl) {
      const evalColor = data.evalPlaysWhite ? 'white' : 'black';
      const sfColor = data.evalPlaysWhite ? 'black' : 'white';
      
      infoEl.innerHTML = `
        <div class="match-players">
          <div class="match-player ${evalColor}">
            <div class="player-color-indicator ${evalColor}"></div>
            <div class="player-info">
              <div class="player-name">${data.evalName}</div>
              <div class="player-type">Your Eval</div>
            </div>
          </div>
          <div class="match-vs">VS</div>
          <div class="match-player ${sfColor}">
            <div class="player-color-indicator ${sfColor}"></div>
            <div class="player-info">
              <div class="player-name">Stockfish</div>
              <div class="player-type">${data.opponentElo} ELO</div>
            </div>
          </div>
        </div>
      `;
    }
    
    this.renderBoard();
  }

  onMove(data) {
    // Parse UCI move (e.g., "e2e4", "e7e8q")
    const move = data.move;
    if (!move || move.length < 4) return;
    
    const files = 'abcdefgh';
    const fromCol = files.indexOf(move[0]);
    const fromRow = 8 - parseInt(move[1]);
    const toCol = files.indexOf(move[2]);
    const toRow = 8 - parseInt(move[3]);
    
    if (fromCol < 0 || fromRow < 0 || toCol < 0 || toRow < 0) return;
    
    // Get the piece being moved
    const piece = this.boardState[fromRow][fromCol];
    if (!piece) return;
    
    // Handle castling
    if (piece.t === 'k' && Math.abs(fromCol - toCol) === 2) {
      if (toCol > fromCol) {
        // Kingside castling
        this.boardState[fromRow][5] = this.boardState[fromRow][7];
        this.boardState[fromRow][7] = null;
      } else {
        // Queenside castling
        this.boardState[fromRow][3] = this.boardState[fromRow][0];
        this.boardState[fromRow][0] = null;
      }
    }
    
    // Handle en passant
    if (piece.t === 'p' && fromCol !== toCol && !this.boardState[toRow][toCol]) {
      // Capturing en passant
      this.boardState[fromRow][toCol] = null;
    }
    
    // Move the piece
    this.boardState[fromRow][fromCol] = null;
    this.boardState[toRow][toCol] = piece;
    
    // Handle promotion
    if (move.length === 5) {
      const promoPiece = move[4].toLowerCase();
      this.boardState[toRow][toCol] = { c: piece.c, t: promoPiece };
    }
    
    // Store last move for highlighting
    this.lastMoveFrom = { row: fromRow, col: fromCol };
    this.lastMoveTo = { row: toRow, col: toCol };
    
    // Animate and render
    this.renderBoard(true);
  }

  onMatchEnd(data) {
    // Record the result
    const match = this.viewer.currentMatch;
    if (match) {
      this.gameResults.push({
        opponent: `SF ${match.opponentElo}`,
        elo: match.opponentElo,
        result: data.result,
        moveCount: data.movesCount
      });
      
      // Update W/D/L counts
      if (data.result === 'win') this.wins++;
      else if (data.result === 'loss') this.losses++;
      else this.draws++;
      
      // Calculate running ELO estimate
      this.updateEloEstimate();
      this.updateGameLog();
    }
    
    // Show result on board
    this.showMatchResult(data.result);
  }

  updateEloEstimate() {
    // Simple running ELO calculation
    let elo = 1200;
    const K = 32;
    
    for (const game of this.gameResults) {
      const expected = 1 / (1 + Math.pow(10, (game.elo - elo) / 400));
      const actual = game.result === 'win' ? 1 : (game.result === 'draw' ? 0.5 : 0);
      elo += K * (actual - expected);
    }
    
    this.currentEloEstimate = Math.round(elo);
    
    // Update display
    const eloEl = document.getElementById('live-elo-value');
    if (eloEl) eloEl.textContent = this.currentEloEstimate;
    
    document.getElementById('live-wins').textContent = `${this.wins}W`;
    document.getElementById('live-draws').textContent = `${this.draws}D`;
    document.getElementById('live-losses').textContent = `${this.losses}L`;
  }

  updateGameLog() {
    const entriesEl = document.getElementById('live-log-entries');
    if (!entriesEl) return;
    
    if (this.gameResults.length === 0) {
      entriesEl.innerHTML = '<div class="log-empty">No matches played yet</div>';
      return;
    }
    
    let html = '';
    for (let i = this.gameResults.length - 1; i >= Math.max(0, this.gameResults.length - 8); i--) {
      const game = this.gameResults[i];
      const resultClass = game.result === 'win' ? 'win' : (game.result === 'loss' ? 'loss' : 'draw');
      const resultIcon = game.result === 'win' ? '✓' : (game.result === 'loss' ? '✗' : '½');
      
      html += `
        <div class="log-entry ${resultClass}">
          <span class="log-result">${resultIcon}</span>
          <span class="log-opponent">${game.opponent}</span>
          <span class="log-moves">${game.moveCount} moves</span>
        </div>
      `;
    }
    
    entriesEl.innerHTML = html;
    entriesEl.scrollTop = 0;
  }

  showMatchResult(result) {
    const infoEl = document.getElementById('live-match-info');
    if (!infoEl) return;
    
    const resultEmoji = result === 'win' ? '🏆' : (result === 'loss' ? '❌' : '🤝');
    const resultText = result === 'win' ? 'Victory!' : (result === 'loss' ? 'Defeat' : 'Draw');
    const resultClass = result === 'win' ? 'win' : (result === 'loss' ? 'loss' : 'draw');
    
    const existingResult = infoEl.querySelector('.match-result-banner');
    if (existingResult) existingResult.remove();
    
    const banner = document.createElement('div');
    banner.className = `match-result-banner ${resultClass}`;
    banner.innerHTML = `<span class="result-icon">${resultEmoji}</span><span class="result-text">${resultText}</span>`;
    infoEl.appendChild(banner);
  }

  onProgress(data) {
    const progressEl = document.getElementById('live-progress');
    if (!progressEl) return;
    
    const percent = Math.round((data.gameNumber / data.totalGames) * 100);
    progressEl.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="progress-text">Game ${data.gameNumber} of ${data.totalGames}</div>
    `;
    
    // Update ELO from server's calculation (if provided)
    if (data.estimatedElo) {
      this.currentEloEstimate = data.estimatedElo;
      const eloEl = document.getElementById('live-elo-value');
      if (eloEl) eloEl.textContent = data.estimatedElo;
    }
    
    // Update W/D/L from server (if provided)
    if (data.wins !== undefined) {
      this.wins = data.wins;
      this.losses = data.losses;
      this.draws = data.draws;
      document.getElementById('live-wins').textContent = `${this.wins}W`;
      document.getElementById('live-draws').textContent = `${this.draws}D`;
      document.getElementById('live-losses').textContent = `${this.losses}L`;
    }
  }

  onCalculationStatus(data) {
    if (data.status === 'started') {
      // Reset for new calculation
      this.gameResults = [];
      this.wins = 0;
      this.losses = 0;
      this.draws = 0;
      this.currentEloEstimate = 1200;
      this.updateGameLog();
      this.show();
      
      const infoEl = document.getElementById('live-match-info');
      if (infoEl) {
        infoEl.innerHTML = `<div class="calc-starting">Starting ELO calculation for "${data.evalName}"...</div>`;
      }
    } else if (data.status === 'completed') {
      const progressEl = document.getElementById('live-progress');
      if (progressEl) {
        progressEl.innerHTML = `
          <div class="calc-complete">
            <span class="complete-icon">✅</span>
            <span class="complete-text">Final ELO: <strong>${data.elo}</strong> (±${data.confidence})</span>
          </div>
        `;
      }
      
      // Update final ELO
      const eloEl = document.getElementById('live-elo-value');
      if (eloEl) eloEl.textContent = data.elo;
    } else if (data.status === 'error') {
      const progressEl = document.getElementById('live-progress');
      if (progressEl) {
        progressEl.innerHTML = `
          <div class="calc-error">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${data.message}</span>
          </div>
        `;
      }
    }
  }

  renderBoard(animate = false) {
    const boardEl = document.getElementById('live-board');
    if (!boardEl) return;
    
    let html = '';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const piece = this.boardState[row][col];
        
        // Check if this square is part of the last move
        const isLastMoveFrom = this.lastMoveFrom && this.lastMoveFrom.row === row && this.lastMoveFrom.col === col;
        const isLastMoveTo = this.lastMoveTo && this.lastMoveTo.row === row && this.lastMoveTo.col === col;
        const isLastMove = isLastMoveFrom || isLastMoveTo;
        
        let squareClass = `square ${isLight ? 'light' : 'dark'}`;
        if (isLastMove) {
          squareClass += ` last-move`;
        }
        
        html += `<div class="${squareClass}">`;
        
        if (piece) {
          const colorClass = piece.c === 'w' ? 'white' : 'black';
          const pieceClass = LIVE_PIECE_NAMES[piece.t];
          const animClass = animate && isLastMoveTo ? 'piece-animate' : '';
          html += `<div class="piece ${colorClass} ${pieceClass} ${animClass}"></div>`;
        }
        
        html += '</div>';
      }
    }
    
    boardEl.innerHTML = html;
  }
}

// Export for global access
window.LiveGameViewer = LiveGameViewer;
window.LiveViewerUI = LiveViewerUI;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('leaderboard-tab')) {
    window.liveViewerUI = new LiveViewerUI();
    window.liveViewerUI.init();
  }
});
