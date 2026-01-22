/**
 * Live Game Viewer
 * Shows live chess matches with proper board visualization during ELO calculation
 * 
 * Features:
 * - Default view: ELO graph showing rating over time
 * - Click game thumbnail: Shows that game's board
 * - Click again or X: Returns to graph view
 * - Parallel multi-game viewing with thumbnails
 */

const WS_URL = 'ws://localhost:3002';

// Piece names for CSS classes
const LIVE_PIECE_NAMES = {
    'k': 'king', 'q': 'queen', 'r': 'rook',
    'b': 'bishop', 'n': 'knight', 'p': 'pawn'
};

class LiveGameViewer {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Set();
    
    // Multi-game state
    this.currentBatch = null;
    this.activeGames = new Map(); // gameId -> game state with board
    this.focusedGameId = null; // null = show graph view
    
    // ELO history for graph
    this.eloHistory = []; // { round, elo, timestamp }
    
    // Legacy single game
    this.currentMatch = null;
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
      // Multi-game batch messages
      case 'batch_state':
      case 'batch_start':
        this.onBatchStart(message.data);
        break;
      case 'game_start':
        this.onGameStart(message.data);
        break;
      case 'game_move':
        this.onGameMove(message.data);
        break;
      case 'game_end':
        this.onGameEnd(message.data);
        break;
      case 'batch_complete':
        this.onBatchComplete(message.data);
        break;
        
      // Legacy single-game messages
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
        
      // Shared messages
      case 'progress':
      case 'calculation_status':
        break;
    }
    this.notifyListeners(message);
  }

  onBatchStart(data) {
    this.currentBatch = {
      evalId: data.evalId,
      evalName: data.evalName,
      round: data.round,
      totalRounds: data.totalRounds,
      opponentElo: data.opponentElo,
      currentStats: data.currentStats,
    };
    
    // Initialize games - DON'T clear focus, let user maintain their selection
    this.activeGames.clear();
    for (const game of data.games) {
      this.activeGames.set(game.id, {
        ...game,
        board: this.createBoardFromFen(game.openingFen),
        moves: [],
        moveCount: 0,
        lastMoveFrom: null,
        lastMoveTo: null,
      });
    }
    
    // Don't auto-focus any game - keep showing graph unless user clicked one
    // (focusedGameId stays as-is, could be null)
  }

  onGameStart(data) {
    const game = this.activeGames.get(data.gameId);
    if (game) {
      game.status = 'in_progress';
      game.opponentElo = data.opponentElo;
    }
  }

  onGameMove(data) {
    const game = this.activeGames.get(data.gameId);
    if (!game) return;
    
    game.moves.push(data.move);
    game.moveCount = data.moveCount;
    game.lastMoveBy = data.player;
    
    // Apply move to board
    this.applyMoveToBoard(game, data.move);
  }

  onGameEnd(data) {
    const game = this.activeGames.get(data.gameId);
    if (game) {
      game.status = 'completed';
      game.result = data.result;
      game.movesCount = data.movesCount;
      game.pgn = data.pgn;
    }
  }

  onBatchComplete(data) {
    if (this.currentBatch) {
      this.currentBatch.status = 'completed';
      this.currentBatch.results = {
        wins: data.wins,
        draws: data.draws,
        losses: data.losses,
      };
    }
  }

  createBoardFromFen(fen) {
    if (!fen) {
      return this.createInitialBoard();
    }
    
    const board = [];
    const fenParts = fen.split(' ');
    const rows = fenParts[0].split('/');
    
    for (let row = 0; row < 8; row++) {
      board[row] = [];
      let col = 0;
      for (const char of rows[row]) {
        if (char >= '1' && char <= '8') {
          for (let i = 0; i < parseInt(char); i++) {
            board[row][col++] = null;
          }
        } else {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase();
          board[row][col++] = { c: color, t: type };
        }
      }
    }
    
    return board;
  }

  createInitialBoard() {
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

  applyMoveToBoard(game, move) {
    if (!move || move.length < 4) return;
    
    const board = game.board;
    const files = 'abcdefgh';
    const fromCol = files.indexOf(move[0]);
    const fromRow = 8 - parseInt(move[1]);
    const toCol = files.indexOf(move[2]);
    const toRow = 8 - parseInt(move[3]);
    
    if (fromCol < 0 || fromRow < 0 || toCol < 0 || toRow < 0) return;
    
    const piece = board[fromRow][fromCol];
    if (!piece) return;
    
    // Handle castling
    if (piece.t === 'k' && Math.abs(fromCol - toCol) === 2) {
      if (toCol > fromCol) {
        board[fromRow][5] = board[fromRow][7];
        board[fromRow][7] = null;
      } else {
        board[fromRow][3] = board[fromRow][0];
        board[fromRow][0] = null;
      }
    }
    
    // Handle en passant
    if (piece.t === 'p' && fromCol !== toCol && !board[toRow][toCol]) {
      board[fromRow][toCol] = null;
    }
    
    // Move the piece
    board[fromRow][fromCol] = null;
    board[toRow][toCol] = piece;
    
    // Handle promotion
    if (move.length === 5) {
      const promoPiece = move[4].toLowerCase();
      board[toRow][toCol] = { c: piece.c, t: promoPiece };
    }
    
    // Store last move for highlighting
    game.lastMoveFrom = { row: fromRow, col: fromCol };
    game.lastMoveTo = { row: toRow, col: toCol };
  }

  // Toggle focus - if already focused, unfocus. If not focused, focus it.
  toggleFocus(gameId) {
    if (this.focusedGameId === gameId) {
      this.focusedGameId = null; // Unfocus - return to graph
    } else if (this.activeGames.has(gameId)) {
      this.focusedGameId = gameId;
    }
    this.notifyListeners({ type: 'focus_changed', data: { gameId: this.focusedGameId } });
  }

  unfocus() {
    this.focusedGameId = null;
    this.notifyListeners({ type: 'focus_changed', data: { gameId: null } });
  }

  getFocusedGame() {
    return this.activeGames.get(this.focusedGameId);
  }

  isShowingGraph() {
    return this.focusedGameId === null;
  }

  addEloDataPoint(round, elo) {
    this.eloHistory.push({ round, elo, timestamp: Date.now() });
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

// Live Viewer UI Component with graph + multi-game support
class LiveViewerUI {
  constructor() {
    this.viewer = new LiveGameViewer();
    this.container = null;
    this.isVisible = false;
    this.isMinimized = false;
    
    // Overall stats
    this.totalWins = 0;
    this.totalLosses = 0;
    this.totalDraws = 0;
    this.currentEloEstimate = 1400;
    this.gameResults = [];
    
    // ELO history for graph
    this.eloHistory = [{ round: 0, elo: 1400 }];
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
        
        <!-- Multi-game thumbnail grid -->
        <div class="game-thumbnails" id="game-thumbnails"></div>
        
        <div class="live-match-info" id="live-match-info">
          <div class="live-waiting">Waiting for ELO calculation to start...</div>
        </div>
        
        <!-- Main display area: either graph or focused game board -->
        <div class="live-main-display" id="live-main-display">
          <div class="live-graph-view" id="live-graph-view">
            <canvas id="elo-graph-canvas" width="340" height="200"></canvas>
          </div>
          <div class="live-board-wrapper" id="live-board-wrapper" style="display: none;">
            <button class="close-board-btn" id="close-board-btn" title="Back to graph">×</button>
            <div class="live-board" id="live-board"></div>
          </div>
        </div>
        
        <div class="live-elo-tracker" id="live-elo-tracker">
          <div class="elo-current">
            <span class="elo-label">Estimated ELO</span>
            <span class="elo-value" id="live-elo-value">1400</span>
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
    this.renderGraph();
  }

  bindEvents() {
    document.getElementById('live-minimize-btn')?.addEventListener('click', () => this.toggleMinimize());
    document.getElementById('live-close-btn')?.addEventListener('click', () => this.hide());
    document.getElementById('close-board-btn')?.addEventListener('click', () => this.showGraph());
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

  goToLeaderboard() {
    // Switch to leaderboard tab and hide the viewer
    const leaderboardTab = document.querySelector('[data-tab="leaderboard-tab"]');
    if (leaderboardTab) {
      leaderboardTab.click();
    }
    this.hide();
    
    // Refresh the leaderboard
    if (window.leaderboard && typeof window.leaderboard.loadLeaderboard === 'function') {
      setTimeout(() => window.leaderboard.loadLeaderboard(), 100);
    }
  }

  showGraph() {
    this.viewer.unfocus();
    document.getElementById('live-graph-view').style.display = 'block';
    document.getElementById('live-board-wrapper').style.display = 'none';
    this.renderGraph();
    this.renderThumbnails();
  }

  showBoard(gameId) {
    this.viewer.toggleFocus(gameId);
    if (this.viewer.isShowingGraph()) {
      this.showGraph();
    } else {
      document.getElementById('live-graph-view').style.display = 'none';
      document.getElementById('live-board-wrapper').style.display = 'flex';
      this.renderBoard();
      this.renderThumbnails();
      this.updateMatchInfo();
    }
  }

  handleUpdate(message) {
    switch (message.type) {
      case 'connected':
        this.updateConnectionStatus(true);
        break;
      case 'disconnected':
        this.updateConnectionStatus(false);
        break;
        
      // Multi-game batch
      case 'batch_state':
      case 'batch_start':
        this.onBatchStart(message.data);
        break;
      case 'game_start':
        this.onGameStart(message.data);
        break;
      case 'game_move':
        this.onGameMove(message.data);
        break;
      case 'game_end':
        this.onGameEnd(message.data);
        break;
      case 'batch_complete':
        this.onBatchComplete(message.data);
        break;
      case 'focus_changed':
        // Handled by showGraph/showBoard
        break;
        
      // Legacy single game
      case 'match_start':
        this.onMatchStart(message.data);
        break;
      case 'move':
        this.onMove(message.data);
        break;
      case 'match_end':
        this.onMatchEnd(message.data);
        break;
        
      // Shared
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

  // ============ MULTI-GAME BATCH HANDLERS ============

  onBatchStart(data) {
    this.show();
    
    // Update stats from server
    if (data.currentStats) {
      this.totalWins = data.currentStats.wins || 0;
      this.totalDraws = data.currentStats.draws || 0;
      this.totalLosses = data.currentStats.losses || 0;
      this.updateStatsDisplay();
    }
    
    // Render thumbnail grid
    this.renderThumbnails();
    
    // Update match info
    const infoEl = document.getElementById('live-match-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="batch-info">
          <div class="batch-round">Round ${data.round} of ${data.totalRounds}</div>
          <div class="batch-vs">
            <span class="eval-name">${data.evalName}</span>
            <span class="vs-text">vs</span>
            <span class="sf-elo">SF ~${data.opponentElo} ELO</span>
          </div>
          <div class="batch-games-label">4 parallel games • Click to view</div>
        </div>
      `;
    }
    
    // Refresh current view (graph or board)
    if (this.viewer.isShowingGraph()) {
      this.renderGraph();
    } else {
      this.renderBoard();
    }
  }

  onGameStart(data) {
    this.renderThumbnails();
  }

  onGameMove(data) {
    // Update thumbnail for this game
    this.renderThumbnails();
    
    // If this is the focused game, update main board
    if (data.gameId === this.viewer.focusedGameId) {
      this.renderBoard();
    }
  }

  onGameEnd(data) {
    // Record result
    const game = this.viewer.activeGames.get(data.gameId);
    if (game) {
      this.gameResults.push({
        opponent: `SF ${this.viewer.currentBatch?.opponentElo || '?'}`,
        elo: this.viewer.currentBatch?.opponentElo || 0,
        result: data.result,
        moveCount: data.movesCount,
        opening: game.opening,
        color: game.evalPlaysWhite ? 'W' : 'B',
      });
    }
    
    this.renderThumbnails();
    this.updateGameLog();
  }

  onBatchComplete(data) {
    // Update totals
    this.totalWins += data.wins;
    this.totalDraws += data.draws;
    this.totalLosses += data.losses;
    this.updateStatsDisplay();
    this.updateEloEstimate();
    
    // Add to ELO history for graph
    this.eloHistory.push({
      round: this.viewer.currentBatch?.round || this.eloHistory.length,
      elo: this.currentEloEstimate
    });
    
    // Refresh graph if showing
    if (this.viewer.isShowingGraph()) {
      this.renderGraph();
    }
  }

  renderThumbnails() {
    const container = document.getElementById('game-thumbnails');
    if (!container) return;
    
    const games = Array.from(this.viewer.activeGames.values());
    if (games.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    let html = '';
    for (const game of games) {
      const isFocused = game.id === this.viewer.focusedGameId;
      const statusClass = game.status || 'waiting';
      const resultClass = game.result || '';
      const colorLabel = game.evalPlaysWhite ? 'W' : 'B';
      
      let resultIcon = '';
      if (game.status === 'completed') {
        resultIcon = game.result === 'win' ? '✓' : (game.result === 'loss' ? '✗' : '½');
      }
      
      html += `
        <div class="game-thumb ${isFocused ? 'focused' : ''} ${statusClass} ${resultClass}" 
             onclick="window.liveViewerUI.showBoard('${game.id}')">
          <div class="thumb-mini-board">${this.renderMiniBoard(game)}</div>
          <div class="thumb-info">
            <span class="thumb-color ${game.evalPlaysWhite ? 'white' : 'black'}">${colorLabel}</span>
            <span class="thumb-opening" title="${game.opening}">${this.shortenOpening(game.opening)}</span>
            ${game.status === 'completed' ? `<span class="thumb-result ${game.result}">${resultIcon}</span>` : ''}
            ${game.status === 'in_progress' ? `<span class="thumb-moves">${game.moveCount}m</span>` : ''}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  shortenOpening(name) {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length > 2) {
      return words[0].substring(0, 3) + ' ' + (words[1] || '').substring(0, 3);
    }
    return name.length > 10 ? name.substring(0, 10) + '…' : name;
  }

  renderMiniBoard(game) {
    if (!game.board) return '';
    
    let html = '<div class="mini-board-grid">';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const piece = game.board[row][col];
        const isLastMove = (game.lastMoveFrom?.row === row && game.lastMoveFrom?.col === col) ||
                          (game.lastMoveTo?.row === row && game.lastMoveTo?.col === col);
        
        let squareClass = `mini-square ${isLight ? 'light' : 'dark'}`;
        if (isLastMove) squareClass += ' last-move';
        
        html += `<div class="${squareClass}">`;
        if (piece) {
          const colorClass = piece.c === 'w' ? 'white' : 'black';
          html += `<div class="mini-piece ${colorClass} ${piece.t}"></div>`;
        }
        html += '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  updateMatchInfo() {
    const game = this.viewer.getFocusedGame();
    if (!game) return;
    
    const infoEl = document.getElementById('live-match-info');
    if (!infoEl) return;
    
    const evalColor = game.evalPlaysWhite ? 'white' : 'black';
    const sfColor = game.evalPlaysWhite ? 'black' : 'white';
    const batch = this.viewer.currentBatch;
    
    infoEl.innerHTML = `
      <div class="match-players">
        <div class="match-player ${evalColor}">
          <div class="player-color-indicator ${evalColor}"></div>
          <div class="player-info">
            <div class="player-name">${batch?.evalName || 'Your Eval'}</div>
            <div class="player-type">${game.opening}</div>
          </div>
        </div>
        <div class="match-vs">VS</div>
        <div class="match-player ${sfColor}">
          <div class="player-color-indicator ${sfColor}"></div>
          <div class="player-info">
            <div class="player-name">Stockfish</div>
            <div class="player-type">${batch?.opponentElo || '?'} ELO</div>
          </div>
        </div>
      </div>
      ${game.status === 'completed' ? this.getResultBanner(game.result) : `<div class="move-count">Move ${game.moveCount || 0}</div>`}
    `;
  }

  getResultBanner(result) {
    const resultEmoji = result === 'win' ? '🏆' : (result === 'loss' ? '❌' : '🤝');
    const resultText = result === 'win' ? 'Victory!' : (result === 'loss' ? 'Defeat' : 'Draw');
    const resultClass = result === 'win' ? 'win' : (result === 'loss' ? 'loss' : 'draw');
    return `<div class="match-result-banner ${resultClass}"><span class="result-icon">${resultEmoji}</span><span class="result-text">${resultText}</span></div>`;
  }

  // ============ GRAPH RENDERING ============

  renderGraph() {
    const canvas = document.getElementById('elo-graph-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#1e1d1b';
    ctx.fillRect(0, 0, width, height);
    
    if (this.eloHistory.length < 2) {
      // Not enough data - show placeholder
      ctx.fillStyle = '#666';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ELO graph will appear after first round', width / 2, height / 2);
      return;
    }
    
    // Calculate bounds
    const elos = this.eloHistory.map(p => p.elo);
    const minElo = Math.min(...elos) - 50;
    const maxElo = Math.max(...elos) + 50;
    const range = maxElo - minElo || 100;
    
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (ELO markers)
    const eloStep = range > 200 ? 100 : 50;
    for (let elo = Math.ceil(minElo / eloStep) * eloStep; elo <= maxElo; elo += eloStep) {
      const y = padding.top + graphHeight - ((elo - minElo) / range) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // ELO label
      ctx.fillStyle = '#666';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(elo.toString(), padding.left - 5, y + 3);
    }
    
    // Draw ELO line
    ctx.strokeStyle = '#7b61ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < this.eloHistory.length; i++) {
      const point = this.eloHistory[i];
      const x = padding.left + (i / (this.eloHistory.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((point.elo - minElo) / range) * graphHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#7b61ff';
    for (let i = 0; i < this.eloHistory.length; i++) {
      const point = this.eloHistory[i];
      const x = padding.left + (i / (this.eloHistory.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((point.elo - minElo) / range) * graphHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Current ELO label
    const lastPoint = this.eloHistory[this.eloHistory.length - 1];
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const lastX = padding.left + graphWidth;
    const lastY = padding.top + graphHeight - ((lastPoint.elo - minElo) / range) * graphHeight;
    ctx.fillText(lastPoint.elo.toString(), lastX - 20, lastY - 10);
    
    // X-axis label
    ctx.fillStyle = '#666';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rounds', width / 2, height - 5);
  }

  // ============ LEGACY SINGLE GAME HANDLERS ============

  onMatchStart(data) {
    this.show();
    
    const game = {
      id: 'legacy',
      board: this.viewer.createInitialBoard(),
      evalPlaysWhite: data.evalPlaysWhite,
      opening: 'Standard',
      moves: [],
      status: 'in_progress',
    };
    this.viewer.activeGames.set('legacy', game);
    
    this.updateMatchInfo();
    this.renderBoard();
  }

  onMove(data) {
    const game = this.viewer.activeGames.get('legacy');
    if (game) {
      this.viewer.applyMoveToBoard(game, data.move);
    }
    this.renderBoard();
  }

  onMatchEnd(data) {
    const game = this.viewer.activeGames.get('legacy');
    if (game) {
      game.status = 'completed';
      game.result = data.result;
      
      if (data.result === 'win') this.totalWins++;
      else if (data.result === 'loss') this.totalLosses++;
      else this.totalDraws++;
      
      this.updateStatsDisplay();
      this.updateEloEstimate();
      this.updateGameLog();
    }
    this.updateMatchInfo();
  }

  // ============ SHARED METHODS ============

  renderBoard() {
    const boardEl = document.getElementById('live-board');
    if (!boardEl) return;
    
    const game = this.viewer.getFocusedGame();
    if (!game || !game.board) {
      boardEl.innerHTML = '<div class="board-placeholder">Select a game to view</div>';
      return;
    }
    
    let html = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const piece = game.board[row][col];
        
        const isLastMoveFrom = game.lastMoveFrom?.row === row && game.lastMoveFrom?.col === col;
        const isLastMoveTo = game.lastMoveTo?.row === row && game.lastMoveTo?.col === col;
        const isLastMove = isLastMoveFrom || isLastMoveTo;
        
        let squareClass = `square ${isLight ? 'light' : 'dark'}`;
        if (isLastMove) squareClass += ' last-move';
        
        html += `<div class="${squareClass}">`;
        if (piece) {
          const colorClass = piece.c === 'w' ? 'white' : 'black';
          const pieceClass = LIVE_PIECE_NAMES[piece.t];
          const animClass = isLastMoveTo ? 'piece-animate' : '';
          html += `<div class="piece ${colorClass} ${pieceClass} ${animClass}"></div>`;
        }
        html += '</div>';
      }
    }
    
    boardEl.innerHTML = html;
  }

  updateStatsDisplay() {
    document.getElementById('live-wins').textContent = `${this.totalWins}W`;
    document.getElementById('live-draws').textContent = `${this.totalDraws}D`;
    document.getElementById('live-losses').textContent = `${this.totalLosses}L`;
  }

  updateEloEstimate() {
    if (this.gameResults.length === 0) return;
    
    // Simple running ELO calculation
    let elo = 1400;
    const K = 32;
    
    for (const game of this.gameResults) {
      const expected = 1 / (1 + Math.pow(10, (game.elo - elo) / 400));
      const actual = game.result === 'win' ? 1 : (game.result === 'draw' ? 0.5 : 0);
      elo += K * (actual - expected);
    }
    
    this.currentEloEstimate = Math.round(elo);
    
    const eloEl = document.getElementById('live-elo-value');
    if (eloEl) eloEl.textContent = this.currentEloEstimate;
  }

  updateGameLog() {
    const entriesEl = document.getElementById('live-log-entries');
    if (!entriesEl) return;
    
    if (this.gameResults.length === 0) {
      entriesEl.innerHTML = '<div class="log-empty">No matches played yet</div>';
      return;
    }
    
    let html = '';
    // Show last 12 games
    for (let i = this.gameResults.length - 1; i >= Math.max(0, this.gameResults.length - 12); i--) {
      const game = this.gameResults[i];
      const resultClass = game.result === 'win' ? 'win' : (game.result === 'loss' ? 'loss' : 'draw');
      const resultIcon = game.result === 'win' ? '✓' : (game.result === 'loss' ? '✗' : '½');
      
      html += `
        <div class="log-entry ${resultClass}">
          <span class="log-result">${resultIcon}</span>
          <span class="log-color">${game.color}</span>
          <span class="log-opponent">${game.opponent}</span>
          <span class="log-opening" title="${game.opening}">${this.shortenOpening(game.opening)}</span>
        </div>
      `;
    }
    
    entriesEl.innerHTML = html;
    entriesEl.scrollTop = 0;
  }

  onProgress(data) {
    const progressEl = document.getElementById('live-progress');
    if (!progressEl) return;
    
    const totalGames = data.totalRounds ? data.totalRounds * 4 : data.totalGames;
    const completedGames = data.round ? (data.round - 1) * 4 : data.gameNumber;
    const percent = Math.round((completedGames / totalGames) * 100);
    
    progressEl.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="progress-text">
        ${data.round ? `Round ${data.round} of ${data.totalRounds}` : `Game ${data.gameNumber} of ${totalGames}`}
        • ${completedGames}/${totalGames} games (${percent}%)
      </div>
    `;
    
    if (data.estimatedElo) {
      this.currentEloEstimate = data.estimatedElo;
      const eloEl = document.getElementById('live-elo-value');
      if (eloEl) eloEl.textContent = data.estimatedElo;
    }
  }

  onCalculationStatus(data) {
    if (data.status === 'started') {
      // Reset for new calculation
      this.gameResults = [];
      this.totalWins = 0;
      this.totalLosses = 0;
      this.totalDraws = 0;
      this.currentEloEstimate = 1400;
      this.eloHistory = [{ round: 0, elo: 1400 }];
      this.updateStatsDisplay();
      this.updateGameLog();
      this.show();
      this.showGraph(); // Start with graph view
      
      const infoEl = document.getElementById('live-match-info');
      if (infoEl) {
        infoEl.innerHTML = `<div class="calc-starting">Starting ELO calculation for "${data.evalName}"...</div>`;
      }
      
      // Clear thumbnails
      const thumbEl = document.getElementById('game-thumbnails');
      if (thumbEl) thumbEl.innerHTML = '';
      
    } else if (data.status === 'completed') {
      const progressEl = document.getElementById('live-progress');
      if (progressEl) {
        progressEl.innerHTML = `
          <div class="calc-complete">
            <span class="complete-icon">✅</span>
            <span class="complete-text">Final ELO: <strong>${data.elo}</strong> (${data.confidence || '±100'})</span>
          </div>
          <div class="calc-actions">
            <button class="view-leaderboard-btn" onclick="window.liveViewerUI?.goToLeaderboard()">
              View on Leaderboard
            </button>
          </div>
        `;
      }
      
      const eloEl = document.getElementById('live-elo-value');
      if (eloEl) eloEl.textContent = data.elo;
      
      // Final graph update
      this.eloHistory.push({ round: this.eloHistory.length, elo: data.elo });
      this.showGraph();
      
      // Auto-refresh leaderboard if available
      if (window.leaderboard && typeof window.leaderboard.loadLeaderboard === 'function') {
        window.leaderboard.loadLeaderboard();
      }
      
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
