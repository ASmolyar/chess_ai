/**
 * Chess Game Application
 * Handles UI, user interaction, and game flow
 */

// Piece type names for CSS classes
const PIECE_NAMES = {
    'k': 'king',
    'q': 'queen',
    'r': 'rook',
    'b': 'bishop',
    'n': 'knight',
    'p': 'pawn'
};

class ChessApp {
    constructor() {
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.isFlipped = false;
        this.humanColor = COLORS.WHITE;
        this.selectedColor = 'white'; // 'white', 'black', or 'random'
        this.bot = null;
        this.isBotThinking = false;
        this.pendingPromotion = null;
        
        // Drag and drop state
        this.isDragging = false;
        this.dragStarted = false; // True after mousedown, before actual drag begins
        this.draggedPiece = null;
        this.draggedFrom = null;
        this.dragStartPos = null; // Starting mouse position
        this.ghostPiece = null;
        this.justDragged = false; // Prevents click from firing after drag
        
        // Pre-selection state (selecting pieces during opponent's turn)
        this.preSelectedSquare = null;
        this.preDragData = null; // { from, ghostPiece, pieceEl }
        
        // Move preview state
        this.isPreviewMode = false;
        this.previewMoveIndex = -1; // -1 means viewing current position
        this.previewBoard = null; // Cached board state for preview
        
        this.initializeBot();
        this.initializeUI();
        this.renderBoard();
        this.updateUI();
    }

    initializeBot() {
        const botSelect = document.getElementById('bot-select');
        const botId = botSelect.value;
        this.bot = botRegistry.create(botId);
        this.updatePlayerLabels();
    }

    updatePlayerLabels() {
        const topName = document.getElementById('black-player-name');
        const bottomName = document.getElementById('human-player-name');
        const topLabel = document.getElementById('opponent-label');
        const bottomLabel = document.getElementById('human-label');
        const topAvatar = document.querySelector('.opponent-bar .player-avatar');
        const bottomAvatar = document.querySelector('.player-bar-bottom .player-avatar');
        
        const botSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/></svg>';
        const humanSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>';
        
        if (this.humanColor === COLORS.WHITE) {
            // Top = Bot (black pieces), Bottom = You (white pieces)
            topName.textContent = this.bot.name;
            topLabel.textContent = 'BOT';
            topAvatar.innerHTML = botSvg;
            bottomName.textContent = 'You';
            bottomLabel.textContent = 'HUMAN';
            bottomAvatar.innerHTML = humanSvg;
        } else {
            // Board is flipped: Top = Bot (white pieces), Bottom = You (black pieces)
            topName.textContent = this.bot.name;
            topLabel.textContent = 'BOT';
            topAvatar.innerHTML = botSvg;
            bottomName.textContent = 'You';
            bottomLabel.textContent = 'HUMAN';
            bottomAvatar.innerHTML = humanSvg;
        }
    }

    initializeUI() {
        const boardEl = document.getElementById('chess-board');
        
        // Board click handling
        boardEl.addEventListener('click', (e) => {
            // Ignore clicks that happen right after a drag
            if (this.justDragged) {
                this.justDragged = false;
                return;
            }
            if (this.isDragging) return;
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });

        // Drag and drop - Mouse events
        boardEl.addEventListener('mousedown', (e) => this.handleDragStart(e));
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));

        // Drag and drop - Touch events for mobile
        boardEl.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // Button handlers
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('rematch-btn').addEventListener('click', () => this.newGame());
        document.getElementById('modal-close').addEventListener('click', () => this.closeGameOverModal());

        // Color selector
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedColor = btn.dataset.color;
            });
        });

        // Bot selector
        document.getElementById('bot-select').addEventListener('change', (e) => {
            this.bot = botRegistry.create(e.target.value);
            this.updatePlayerLabels();
        });

        // Promotion modal
        document.getElementById('promotion-pieces').addEventListener('click', (e) => {
            const piece = e.target.closest('.promotion-piece');
            if (piece) {
                this.handlePromotion(piece.dataset.piece);
            }
        });

        // Populate bot selector
        this.populateBotSelector();
        
        // Keyboard navigation for move preview
        document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    }
    
    // Handle keyboard navigation for move preview
    handleKeyNavigation(e) {
        if (this.game.moveHistory.length === 0) return;
        
        // Don't handle if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        // Up/Right = newer moves, Down/Left = older moves
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigatePreview(1);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigatePreview(-1);
        }
    }
    
    // Navigate preview by delta (-1 for previous, +1 for next)
    navigatePreview(delta) {
        const totalMoves = this.game.moveHistory.length;
        if (totalMoves === 0) return;
        
        // Calculate current index (in preview or at current position)
        let currentIndex = this.isPreviewMode ? this.previewMoveIndex : totalMoves - 1;
        let newIndex = currentIndex + delta;
        
        // Clamp to valid range (-1 is start position, totalMoves-1 is current)
        newIndex = Math.max(-1, Math.min(totalMoves - 1, newIndex));
        
        // If we're at the current position, exit preview mode
        if (newIndex === totalMoves - 1) {
            this.exitPreviewMode();
        } else {
            this.enterPreviewMode(newIndex);
        }
    }
    
    // Enter preview mode at a specific move index
    enterPreviewMode(moveIndex) {
        this.isPreviewMode = true;
        this.previewMoveIndex = moveIndex;
        this.previewBoard = this.computeBoardAtMove(moveIndex);
        this.renderBoard();
        this.updateMoveHistory();
        this.updateStatus();
    }
    
    // Exit preview mode and return to current game state
    exitPreviewMode() {
        if (!this.isPreviewMode) return;
        
        this.isPreviewMode = false;
        this.previewMoveIndex = -1;
        this.previewBoard = null;
        this.renderBoard();
        this.updateMoveHistory();
        this.updateStatus();
    }
    
    // Compute board state at a specific move index
    computeBoardAtMove(moveIndex) {
        // Create a fresh game and replay moves up to moveIndex
        const tempGame = new ChessGame();
        
        for (let i = 0; i <= moveIndex; i++) {
            const move = this.game.moveHistory[i];
            tempGame.makeMove(
                move.from.row, move.from.col,
                move.to.row, move.to.col,
                move.promotion
            );
        }
        
        return tempGame.board;
    }
    
    // Get the piece at a position (respecting preview mode)
    getDisplayPiece(row, col) {
        if (this.isPreviewMode && this.previewBoard) {
            return this.previewBoard[row][col];
        }
        return this.game.getPiece(row, col);
    }
    
    // Get the last move to highlight (respecting preview mode)
    getDisplayLastMove() {
        if (this.isPreviewMode) {
            if (this.previewMoveIndex >= 0) {
                return this.game.moveHistory[this.previewMoveIndex];
            }
            return null; // At start position
        }
        return this.lastMove;
    }
    
    // Handle click on a move in the history
    handleMoveClick(moveIndex) {
        const totalMoves = this.game.moveHistory.length;
        
        if (moveIndex === totalMoves - 1) {
            this.exitPreviewMode();
        } else {
            this.enterPreviewMode(moveIndex);
        }
    }

    // Drag and Drop Handlers
    handleDragStart(e) {
        // Exit preview mode when board is interacted with
        if (this.isPreviewMode) {
            this.exitPreviewMode();
            return;
        }
        
        if (this.game.gameOver) return;

        // Get coordinates and target element
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // For mouse events, use e.target directly
        // For touch events, use elementFromPoint
        let pieceEl, square;
        
        if (e.touches) {
            const target = document.elementFromPoint(clientX, clientY);
            pieceEl = target?.closest('.piece');
            square = target?.closest('.square');
        } else {
            pieceEl = e.target.closest('.piece');
            square = e.target.closest('.square');
        }
        
        if (!square || !pieceEl) return;
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.game.getPiece(row, col);
        
        // Only allow dragging own pieces
        if (!piece || piece.color !== this.humanColor) return;
        
        // Store info for potential drag, but don't start dragging yet
        this.dragStarted = true;
        this.dragStartPos = { x: clientX, y: clientY };
        this.draggedFrom = { row, col };
        this.draggedPiece = piece;
        this.dragPieceEl = pieceEl;
        
        // If it's our turn, get legal moves; otherwise leave empty (pre-drag)
        if (this.game.turn === this.humanColor) {
            this.legalMoves = this.game.getLegalMoves(row, col);
        } else {
            // Pre-drag: store the starting position but don't get moves yet
            this.legalMoves = [];
            this.preSelectedSquare = { row, col };
        }
    }
    
    // Actually begin the drag (create ghost piece, etc.)
    beginActualDrag(clientX, clientY) {
        if (!this.dragStarted || this.isDragging) return;
        
        this.isDragging = true;
        
        // Create ghost piece that follows cursor
        this.ghostPiece = this.dragPieceEl.cloneNode(true);
        this.ghostPiece.classList.add('ghost-piece');
        document.body.appendChild(this.ghostPiece);
        
        // Position ghost piece at cursor
        this.updateGhostPosition(clientX, clientY);
        
        // Hide original piece
        this.dragPieceEl.classList.add('dragging');
        
        // Select the square and show legal moves (if it's our turn)
        this.selectedSquare = { row: this.draggedFrom.row, col: this.draggedFrom.col };
        if (this.game.turn === this.humanColor) {
            this.legalMoves = this.game.getLegalMoves(this.draggedFrom.row, this.draggedFrom.col);
        }
        this.updateBoardHighlights();
    }

    handleDragMove(e) {
        const touch = e.touches ? e.touches[0] : e;
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        
        // Check if we should start actual dragging (mouse moved enough)
        if (this.dragStarted && !this.isDragging && this.dragStartPos) {
            const dx = clientX - this.dragStartPos.x;
            const dy = clientY - this.dragStartPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Start drag if moved more than 5 pixels
            if (distance > 5) {
                e.preventDefault();
                this.beginActualDrag(clientX, clientY);
            }
            return;
        }
        
        if (!this.isDragging || !this.ghostPiece) return;
        
        e.preventDefault();
        
        this.updateGhostPosition(clientX, clientY);
        
        // Hide ghost piece temporarily to detect square underneath
        this.ghostPiece.style.pointerEvents = 'none';
        this.ghostPiece.style.display = 'none';
        
        // Highlight square under cursor
        const target = document.elementFromPoint(clientX, clientY);
        const square = target?.closest('.square');
        
        // Show ghost piece again
        this.ghostPiece.style.display = '';
        
        // Remove hover highlight from all squares
        document.querySelectorAll('.square.drag-hover').forEach(sq => {
            sq.classList.remove('drag-hover');
        });
        
        if (square) {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const isLegal = this.legalMoves.some(m => m.row === row && m.col === col);
            if (isLegal) {
                square.classList.add('drag-hover');
            }
        }
    }

    handleDragEnd(e) {
        // If drag was never actually started (just a click), let click handler work
        if (this.dragStarted && !this.isDragging) {
            this.dragStarted = false;
            this.dragStartPos = null;
            this.draggedPiece = null;
            this.draggedFrom = null;
            this.dragPieceEl = null;
            // Don't clear legalMoves if we're pre-selecting
            if (this.game.turn === this.humanColor) {
                this.legalMoves = [];
            }
            return; // Let the click event handle this
        }
        
        if (!this.isDragging) return;
        
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        
        // Hide ghost piece FIRST so elementFromPoint finds the square underneath
        if (this.ghostPiece) {
            this.ghostPiece.style.display = 'none';
        }
        
        // Now detect what's under the cursor
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const square = target?.closest('.square');
        
        // Remove ghost piece
        if (this.ghostPiece) {
            this.ghostPiece.remove();
            this.ghostPiece = null;
        }
        
        // Remove dragging class from original
        document.querySelectorAll('.piece.dragging').forEach(p => {
            p.classList.remove('dragging');
        });
        
        // Remove hover highlights
        document.querySelectorAll('.square.drag-hover').forEach(sq => {
            sq.classList.remove('drag-hover');
        });
        
        if (square && this.draggedFrom) {
            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);
            
            // If it's not our turn, store as pre-move
            if (this.game.turn !== this.humanColor) {
                this.preDragData = {
                    from: { row: this.draggedFrom.row, col: this.draggedFrom.col },
                    to: { row: toRow, col: toCol }
                };
                // Keep piece selected visually
                this.selectedSquare = { row: this.draggedFrom.row, col: this.draggedFrom.col };
                this.renderBoard();
            } else {
                // It's our turn - try to make the move
                // Get legal moves if not already set
                if (this.legalMoves.length === 0) {
                    this.legalMoves = this.game.getLegalMoves(this.draggedFrom.row, this.draggedFrom.col);
                }
                
                const move = this.legalMoves.find(m => m.row === toRow && m.col === toCol);
                
                if (move) {
                    if (move.promotion) {
                        this.showPromotionDialog(
                            this.draggedFrom.row, 
                            this.draggedFrom.col, 
                            toRow, 
                            toCol
                        );
                    } else {
                        this.makeHumanMove(
                            this.draggedFrom.row, 
                            this.draggedFrom.col, 
                            toRow, 
                            toCol
                        );
                    }
                } else {
                    // Invalid move - re-render to reset piece position
                    this.renderBoard();
                }
            }
        } else {
            // Dropped outside board - re-render
            this.renderBoard();
        }
        
        // Reset drag state
        this.isDragging = false;
        this.dragStarted = false;
        this.dragStartPos = null;
        this.draggedPiece = null;
        this.draggedFrom = null;
        this.dragPieceEl = null;
        this.selectedSquare = null;
        this.legalMoves = [];
        this.justDragged = true; // Prevent click from firing after drag
        this.updateBoardHighlights();
    }

    updateGhostPosition(x, y) {
        if (!this.ghostPiece) return;
        
        const size = this.ghostPiece.offsetWidth || 60;
        this.ghostPiece.style.left = `${x - size / 2}px`;
        this.ghostPiece.style.top = `${y - size / 2}px`;
    }

    populateBotSelector() {
        const select = document.getElementById('bot-select');
        const bots = botRegistry.getAvailable();
        
        select.innerHTML = '';
        for (const bot of bots) {
            const option = document.createElement('option');
            option.value = bot.id;
            option.textContent = bot.name;
            option.title = bot.description;
            select.appendChild(option);
        }
    }

    renderBoard() {
        const boardEl = document.getElementById('chess-board');
        boardEl.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = this.isFlipped ? 7 - row : row;
                const displayCol = this.isFlipped ? 7 - col : col;
                
                const square = document.createElement('div');
                square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;

                // Use preview board if in preview mode
                const piece = this.getDisplayPiece(displayRow, displayCol);
                if (piece) {
                    const pieceEl = document.createElement('div');
                    const colorClass = piece.color === COLORS.WHITE ? 'white' : 'black';
                    const pieceClass = PIECE_NAMES[piece.type];
                    pieceEl.className = `piece ${colorClass} ${pieceClass}`;
                    pieceEl.draggable = false; // Prevent native HTML5 drag
                    
                    // Make pieces draggable via cursor style (only when not in preview mode)
                    if (!this.isPreviewMode &&
                        piece.color === this.humanColor && 
                        this.game.turn === this.humanColor && 
                        !this.game.gameOver && 
                        !this.isBotThinking) {
                        pieceEl.style.cursor = 'grab';
                    }
                    
                    square.appendChild(pieceEl);
                }

                boardEl.appendChild(square);
            }
        }

        this.updateBoardHighlights();
        this.updateCoordinates();
    }

    updateCoordinates() {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        const displayFiles = this.isFlipped ? [...files].reverse() : files;
        const displayRanks = this.isFlipped ? [...ranks].reverse() : ranks;
        
        // Update bottom coordinates
        const bottomCoords = document.getElementById('coords-bottom');
        if (bottomCoords) {
            const spans = bottomCoords.querySelectorAll('span');
            spans.forEach((span, i) => span.textContent = displayFiles[i]);
        }
        
        // Update left coordinates
        const leftCoords = document.getElementById('coords-left');
        if (leftCoords) {
            const spans = leftCoords.querySelectorAll('span');
            spans.forEach((span, i) => span.textContent = displayRanks[i]);
        }
        
        // Update right coordinates
        const rightCoords = document.getElementById('coords-right');
        if (rightCoords) {
            const spans = rightCoords.querySelectorAll('span');
            spans.forEach((span, i) => span.textContent = displayRanks[i]);
        }
    }

    updateBoardHighlights() {
        const squares = document.querySelectorAll('.square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            // Clear previous highlights (but preserve check-flash for animation)
            square.classList.remove('selected', 'legal-move', 'capture-move', 'last-move', 'check', 'checkmate', 'winner-square', 'draw-square');
            
            // Remove any existing banners/badges
            const existingBanner = square.querySelector('.checkmate-banner');
            const existingBadge = square.querySelector('.winner-badge');
            const existingDrawBadge = square.querySelector('.draw-badge');
            if (existingBanner) existingBanner.remove();
            if (existingBadge) existingBadge.remove();
            if (existingDrawBadge) existingDrawBadge.remove();
            
            // Selected square
            if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Legal moves
            const isLegalMove = this.legalMoves.find(m => m.row === row && m.col === col);
            if (isLegalMove) {
                const targetPiece = this.game.getPiece(row, col);
                if (targetPiece || isLegalMove.enPassant) {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('legal-move');
                }
            }
            
            // Last move (respects preview mode)
            const displayLastMove = this.getDisplayLastMove();
            if (displayLastMove) {
                if ((displayLastMove.from.row === row && displayLastMove.from.col === col) ||
                    (displayLastMove.to.row === row && displayLastMove.to.col === col)) {
                    square.classList.add('last-move');
                }
            }
            
            const piece = this.game.getPiece(row, col);
            
            // Checkmate visualization
            if (this.game.gameOver && this.game.gameResult?.type === 'checkmate') {
                const losingColor = this.game.gameResult.winner === 'White' ? COLORS.BLACK : COLORS.WHITE;
                const winningColor = this.game.gameResult.winner === 'White' ? COLORS.WHITE : COLORS.BLACK;
                
                // Mark the checkmated king (loser)
                if (piece && piece.type === PIECES.KING && piece.color === losingColor) {
                    square.classList.add('checkmate');
                    
                    // Add checkmate banner (sideways king icon via CSS)
                    const banner = document.createElement('div');
                    banner.className = 'checkmate-banner';
                    square.appendChild(banner);
                }
                
                // Mark the winning king
                if (piece && piece.type === PIECES.KING && piece.color === winningColor) {
                    square.classList.add('winner-square');
                    
                    // Add winner badge (crown icon via CSS)
                    const badge = document.createElement('div');
                    badge.className = 'winner-badge';
                    square.appendChild(badge);
                }
            } else if (this.game.gameOver && this.game.gameResult?.type !== 'checkmate') {
                // Draw - mark both kings with grey squares
                if (piece && piece.type === PIECES.KING) {
                    square.classList.add('draw-square');
                    
                    // Add draw badge (1/2 icon)
                    const badge = document.createElement('div');
                    badge.className = 'draw-badge';
                    badge.textContent = '½';
                    square.appendChild(badge);
                }
            } else if (!this.game.gameOver) {
                // King in check (non-checkmate) - add persistent subtle indicator
                if (piece && piece.type === PIECES.KING && 
                    piece.color === this.game.turn && 
                    this.game.isKingInCheck(this.game.turn)) {
                    square.classList.add('check');
                }
            }
        });
    }
    
    // Trigger check flash animation
    triggerCheckFlash() {
        const squares = document.querySelectorAll('.square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.game.getPiece(row, col);
            
            if (piece && piece.type === PIECES.KING && 
                piece.color === this.game.turn && 
                this.game.isKingInCheck(this.game.turn)) {
                // Remove and re-add to restart animation
                square.classList.remove('check-flash');
                void square.offsetWidth; // Force reflow
                square.classList.add('check-flash');
                
                // Remove after animation completes
                setTimeout(() => {
                    square.classList.remove('check-flash');
                }, 600);
            }
        });
    }

    handleSquareClick(row, col) {
        // Exit preview mode when board is interacted with
        if (this.isPreviewMode) {
            this.exitPreviewMode();
            return;
        }
        
        if (this.game.gameOver) return;

        const piece = this.game.getPiece(row, col);

        // If it's NOT the human's turn (opponent/bot is playing)
        if (this.game.turn !== this.humanColor) {
            // Allow pre-selecting own pieces
            if (piece && piece.color === this.humanColor) {
                this.preSelectedSquare = { row, col };
                this.selectedSquare = { row, col };
                // Can't get legal moves yet since it's not our turn, but show selection
                this.legalMoves = [];
                this.updateBoardHighlights();
            }
            return;
        }

        // It IS the human's turn
        // If clicking on own piece, select it
        if (piece && piece.color === this.humanColor) {
            this.selectedSquare = { row, col };
            this.legalMoves = this.game.getLegalMoves(row, col);
            this.preSelectedSquare = null; // Clear pre-selection
            this.updateBoardHighlights();
            return;
        }

        // If a piece is selected and clicking on a valid destination
        if (this.selectedSquare) {
            const move = this.legalMoves.find(m => m.row === row && m.col === col);
            if (move) {
                if (move.promotion) {
                    this.showPromotionDialog(this.selectedSquare.row, this.selectedSquare.col, row, col);
                } else {
                    this.makeHumanMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                }
            } else {
                // Deselect
                this.selectedSquare = null;
                this.legalMoves = [];
                this.preSelectedSquare = null;
                this.updateBoardHighlights();
            }
        }
    }

    showPromotionDialog(fromRow, fromCol, toRow, toCol) {
        this.pendingPromotion = { fromRow, fromCol, toRow, toCol };
        
        const modal = document.getElementById('promotion-modal');
        const piecesContainer = document.getElementById('promotion-pieces');
        
        const color = this.game.turn;
        const colorClass = color === COLORS.WHITE ? 'white' : 'black';
        const pieces = ['q', 'r', 'b', 'n'];
        
        piecesContainer.innerHTML = '';
        for (const pieceType of pieces) {
            const el = document.createElement('div');
            el.className = `promotion-piece ${colorClass} ${PIECE_NAMES[pieceType]}`;
            el.dataset.piece = pieceType;
            piecesContainer.appendChild(el);
        }
        
        modal.classList.add('active');
    }

    handlePromotion(pieceType) {
        const modal = document.getElementById('promotion-modal');
        modal.classList.remove('active');
        
        if (this.pendingPromotion) {
            const { fromRow, fromCol, toRow, toCol } = this.pendingPromotion;
            this.makeHumanMove(fromRow, fromCol, toRow, toCol, pieceType);
            this.pendingPromotion = null;
        }
    }

    makeHumanMove(fromRow, fromCol, toRow, toCol, promotion = null) {
        const move = this.game.makeMove(fromRow, fromCol, toRow, toCol, promotion);
        
        if (move) {
            this.lastMove = move;
            this.selectedSquare = null;
            this.legalMoves = [];
            this.renderBoard();
            this.updateUI();
            
            // Trigger check flash if opponent is now in check (but not checkmate)
            if (!this.game.gameOver && this.game.isKingInCheck(this.game.turn)) {
                this.triggerCheckFlash();
            }
            
            if (!this.game.gameOver) {
                this.makeBotMove();
            }
        }
    }

    async makeBotMove() {
        if (this.game.gameOver || this.game.turn === this.humanColor) return;
        
        this.isBotThinking = true;
        this.updateStatus('Bot is thinking...');
        
        // #region agent log
        console.log('[DEBUG] makeBotMove: starting, turn=', this.game.turn);
        fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:start',message:'Bot move starting',data:{turn:this.game.turn,gameOver:this.game.gameOver},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        try {
            const move = await this.bot.getMove(this.game);
            
            // #region agent log
            console.log('[DEBUG] makeBotMove: got move=', move);
            fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:gotMove',message:'Bot returned move',data:{move:move,moveExists:!!move,fromRow:move?.from?.row,fromCol:move?.from?.col,toRow:move?.to?.row,toCol:move?.to?.col},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
            // #endregion
            
            if (move) {
                // #region agent log
                const legalMoves = this.game.getLegalMoves(move.from.row, move.from.col);
                const matchingMove = legalMoves.find(m => m.row === move.to.row && m.col === move.to.col);
                fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:beforeMakeMove',message:'Checking legal moves',data:{fromRow:move.from.row,fromCol:move.from.col,toRow:move.to.row,toCol:move.to.col,legalMovesCount:legalMoves.length,matchingMoveFound:!!matchingMove,legalMoves:legalMoves.map(m=>({row:m.row,col:m.col}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                
                const result = this.game.makeMove(
                    move.from.row, move.from.col,
                    move.to.row, move.to.col,
                    move.promotion
                );
                
                // #region agent log
                console.log('[DEBUG] makeBotMove: makeMove result=', result);
                fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:afterMakeMove',message:'makeMove result',data:{resultExists:!!result,newTurn:this.game.turn},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
                // #endregion
                
                if (result) {
                    this.lastMove = result;
                    this.renderBoard();
                    this.updateUI();
                    
                    // Trigger check flash if human is now in check (but not checkmate)
                    if (!this.game.gameOver && this.game.isKingInCheck(this.game.turn)) {
                        this.triggerCheckFlash();
                    }
                } else {
                    // #region agent log
                    console.log('[DEBUG] makeBotMove: move was ILLEGAL, from=', move.from, 'to=', move.to);
                    fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:illegalMove',message:'Move was ILLEGAL',data:{from:move.from,to:move.to},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,E'})}).catch(()=>{});
                    // #endregion
                }
            } else {
                // #region agent log
                console.log('[DEBUG] makeBotMove: bot returned null/undefined move');
                fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:nullMove',message:'Bot returned null move',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
            }
        } catch (error) {
            // #region agent log
            console.error('Bot error:', error);
            fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:error',message:'Bot threw error',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
            // #endregion
        }
        
        this.isBotThinking = false;
        
        // #region agent log
        console.log('[DEBUG] makeBotMove: finished, isBotThinking=', this.isBotThinking);
        fetch('http://127.0.0.1:7243/ingest/66ecc795-c53e-444d-be01-0c98a7a1efba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:makeBotMove:finished',message:'Bot move finished',data:{isBotThinking:this.isBotThinking,currentTurn:this.game.turn},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Apply any pre-selection or pre-move now that it's human's turn
        this.applyPreSelection();
    }
    
    // Apply pre-selection or pre-move after bot finishes
    applyPreSelection() {
        if (this.game.gameOver || this.game.turn !== this.humanColor) return;
        
        // Check if there's a pre-move (drag that was completed during bot's turn)
        if (this.preDragData) {
            const { from, to } = this.preDragData;
            this.preDragData = null;
            this.preSelectedSquare = null;
            
            // Check if the pre-move is still valid
            const piece = this.game.getPiece(from.row, from.col);
            if (piece && piece.color === this.humanColor) {
                const legalMoves = this.game.getLegalMoves(from.row, from.col);
                const move = legalMoves.find(m => m.row === to.row && m.col === to.col);
                
                if (move) {
                    // Execute the pre-move!
                    if (move.promotion) {
                        this.showPromotionDialog(from.row, from.col, to.row, to.col);
                    } else {
                        this.makeHumanMove(from.row, from.col, to.row, to.col);
                    }
                    return;
                }
            }
            // Pre-move was invalid, just render normally
            this.renderBoard();
            return;
        }
        
        // Check if there's a pre-selected square
        if (this.preSelectedSquare) {
            const { row, col } = this.preSelectedSquare;
            this.preSelectedSquare = null;
            
            // Check if the piece is still there and is ours
            const piece = this.game.getPiece(row, col);
            if (piece && piece.color === this.humanColor) {
                this.selectedSquare = { row, col };
                this.legalMoves = this.game.getLegalMoves(row, col);
                this.updateBoardHighlights();
            }
        }
    }

    updateUI() {
        this.updateStatus();
        this.updateTurnIndicators();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updateBotSelector();
        this.checkGameOver();
    }

    updateStatus(customStatus = null) {
        const statusEl = document.getElementById('game-status');
        const textEl = statusEl.querySelector('.status-text');
        
        textEl.classList.remove('check', 'checkmate', 'stalemate', 'preview');
        
        if (customStatus) {
            textEl.textContent = customStatus;
            return;
        }
        
        // Show preview status when in preview mode
        if (this.isPreviewMode) {
            const moveNum = Math.floor(this.previewMoveIndex / 2) + 1;
            const isWhiteMove = this.previewMoveIndex % 2 === 0;
            const moveColor = isWhiteMove ? 'White' : 'Black';
            textEl.textContent = `Move ${moveNum}. ${moveColor}`;
            textEl.classList.add('preview');
            return;
        }
        
        if (this.game.gameOver) {
            if (this.game.gameResult.type === 'checkmate') {
                textEl.textContent = `Checkmate! ${this.game.gameResult.winner} wins!`;
                textEl.classList.add('checkmate');
            } else if (this.game.gameResult.type === 'stalemate') {
                textEl.textContent = 'Stalemate - Draw';
                textEl.classList.add('stalemate');
            } else {
                textEl.textContent = `Draw - ${this.game.gameResult.type}`;
                textEl.classList.add('stalemate');
            }
        } else if (this.game.isKingInCheck(this.game.turn)) {
            const color = this.game.turn === COLORS.WHITE ? 'White' : 'Black';
            textEl.textContent = `${color} is in check!`;
            textEl.classList.add('check');
        } else {
            const color = this.game.turn === COLORS.WHITE ? 'White' : 'Black';
            textEl.textContent = `${color} to move`;
        }
    }

    updateTurnIndicators() {
        const humanTurn = document.getElementById('human-turn');
        const opponentTurn = document.getElementById('opponent-turn');
        
        const isHumanTurn = this.game.turn === this.humanColor;
        
        humanTurn.classList.toggle('active', isHumanTurn);
        opponentTurn.classList.toggle('active', !isHumanTurn);
    }

    updateMoveHistory() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        
        const moves = this.game.moveHistory;
        let currentMoveNum = 1;
        
        // Determine which move index is "active" (either previewed or current)
        const activeMoveIndex = this.isPreviewMode ? this.previewMoveIndex : moves.length - 1;
        
        for (let i = 0; i < moves.length; i += 2) {
            const row = document.createElement('div');
            row.className = 'move-row';
            
            const numEl = document.createElement('div');
            numEl.className = 'move-number';
            numEl.textContent = `${currentMoveNum}.`;
            row.appendChild(numEl);
            
            // White move
            const whiteMove = document.createElement('div');
            whiteMove.className = 'move white-move';
            if (i === activeMoveIndex) whiteMove.classList.add('current');
            if (this.isPreviewMode && i === activeMoveIndex) whiteMove.classList.add('previewing');
            
            const whiteMoveText = document.createElement('span');
            whiteMoveText.textContent = moves[i].notation;
            whiteMove.appendChild(whiteMoveText);
            
            // Add click handler
            const whiteMoveIndex = i;
            whiteMove.addEventListener('click', () => this.handleMoveClick(whiteMoveIndex));
            
            row.appendChild(whiteMove);
            
            // Black move
            if (moves[i + 1]) {
                const blackMove = document.createElement('div');
                blackMove.className = 'move black-move';
                if (i + 1 === activeMoveIndex) blackMove.classList.add('current');
                if (this.isPreviewMode && i + 1 === activeMoveIndex) blackMove.classList.add('previewing');
                
                const blackMoveText = document.createElement('span');
                blackMoveText.textContent = moves[i + 1].notation;
                blackMove.appendChild(blackMoveText);
                
                // Add click handler
                const blackMoveIndex = i + 1;
                blackMove.addEventListener('click', () => this.handleMoveClick(blackMoveIndex));
                
                row.appendChild(blackMove);
            } else {
                const emptyMove = document.createElement('div');
                emptyMove.className = 'move black-move';
                row.appendChild(emptyMove);
            }
            
            movesList.appendChild(row);
            currentMoveNum++;
        }
        
        // Scroll to show active move
        const movesPanel = document.querySelector('.moves-panel');
        if (movesPanel) {
            if (!this.isPreviewMode) {
                // Scroll to bottom when at current position
                movesPanel.scrollTop = movesPanel.scrollHeight;
            } else {
                // Scroll to show the previewed move
                const activeEl = movesList.querySelector('.current');
                if (activeEl) {
                    activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        }
    }

    updateBotSelector() {
        const botSelect = document.getElementById('bot-select');
        // Disable bot selector if game has started (moves have been made)
        if (this.game.moveHistory.length > 0) {
            botSelect.disabled = true;
        } else {
            botSelect.disabled = false;
        }
    }

    updateCapturedPieces() {
        const humanCapturedEl = document.getElementById('human-captured-pieces');
        const opponentCapturedEl = document.getElementById('opponent-captured-pieces');
        
        // Sort by piece value
        const sortByValue = (a, b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type];
        
        const whiteCaptured = [...this.game.capturedPieces.white].sort(sortByValue);
        const blackCaptured = [...this.game.capturedPieces.black].sort(sortByValue);
        
        // Calculate material difference
        const whiteMaterial = whiteCaptured.reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);
        const blackMaterial = blackCaptured.reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);
        const diff = whiteMaterial - blackMaterial;
        
        // Human captured pieces (what human has captured)
        // Opponent captured pieces (what opponent has captured)
        let humanCapturedPieces, opponentCapturedPieces;
        let humanDiff, opponentDiff;
        
        if (this.humanColor === COLORS.WHITE) {
            // Human is white - human captured black pieces
            humanCapturedPieces = whiteCaptured;
            opponentCapturedPieces = blackCaptured;
            humanDiff = diff > 0 ? diff : 0;
            opponentDiff = diff < 0 ? Math.abs(diff) : 0;
        } else {
            // Human is black - human captured white pieces
            humanCapturedPieces = blackCaptured;
            opponentCapturedPieces = whiteCaptured;
            humanDiff = diff < 0 ? Math.abs(diff) : 0;
            opponentDiff = diff > 0 ? diff : 0;
        }
        
        const humanColor = this.humanColor === COLORS.WHITE ? 'b' : 'w';
        const opponentColor = this.humanColor === COLORS.WHITE ? 'w' : 'b';
        
        humanCapturedEl.innerHTML = this.renderCapturedPieces(humanCapturedPieces, humanColor);
        if (humanDiff > 0) {
            humanCapturedEl.innerHTML += `<span class="material-diff">+${humanDiff}</span>`;
        }
        
        opponentCapturedEl.innerHTML = this.renderCapturedPieces(opponentCapturedPieces, opponentColor);
        if (opponentDiff > 0) {
            opponentCapturedEl.innerHTML += `<span class="material-diff">+${opponentDiff}</span>`;
        }
    }

    renderCapturedPieces(pieces, colorPrefix) {
        // Group pieces by type
        const grouped = {};
        for (const p of pieces) {
            if (!grouped[p.type]) grouped[p.type] = 0;
            grouped[p.type]++;
        }
        
        // Order: q, r, b, n, p
        const order = ['q', 'r', 'b', 'n', 'p'];
        let html = '';
        let isFirstPiece = true;
        
        for (const type of order) {
            if (grouped[type]) {
                for (let i = 0; i < grouped[type]; i++) {
                    const colorClass = colorPrefix === 'w' ? 'white' : 'black';
                    // First piece of a group starts fresh, subsequent pieces of same type get stacked
                    const stackClass = i === 0 ? 'group-start' : 'stacked';
                    const firstClass = isFirstPiece ? 'first-piece' : '';
                    html += `<div class="captured-piece piece ${colorClass} ${PIECE_NAMES[type]} ${stackClass} ${firstClass}"></div>`;
                    isFirstPiece = false;
                }
            }
        }
        
        return html;
    }

    checkGameOver() {
        if (this.game.gameOver) {
            const modal = document.getElementById('game-over-modal');
            const title = document.getElementById('game-over-title');
            const message = document.getElementById('game-over-message');
            const icon = document.getElementById('game-over-icon');
            
            // Reset icon classes
            icon.className = 'game-over-icon';
            
            if (this.game.gameResult.type === 'checkmate') {
                title.textContent = `${this.game.gameResult.winner} Won`;
                message.textContent = 'by checkmate';
                icon.classList.add('win');
            } else if (this.game.gameResult.type === 'stalemate') {
                title.textContent = 'Draw';
                message.textContent = 'by stalemate';
                icon.classList.add('draw');
            } else if (this.game.gameResult.type === 'insufficient_material') {
                title.textContent = 'Draw';
                message.textContent = 'by insufficient material';
                icon.classList.add('draw');
            } else if (this.game.gameResult.type === 'threefold_repetition') {
                title.textContent = 'Draw';
                message.textContent = 'by repetition';
                icon.classList.add('draw');
            } else if (this.game.gameResult.type === 'fifty_move_rule') {
                title.textContent = 'Draw';
                message.textContent = 'by fifty-move rule';
                icon.classList.add('draw');
            } else {
                title.textContent = 'Draw';
                message.textContent = `by ${this.game.gameResult.type}`;
                icon.classList.add('draw');
            }
            
            // Delay modal by 1 second to allow king tile animations to complete
            setTimeout(() => {
                modal.classList.add('active');
            }, 1000);
        }
    }

    closeGameOverModal() {
        document.getElementById('game-over-modal').classList.remove('active');
    }

    newGame() {
        this.closeGameOverModal();
        
        // Determine human color based on selection
        if (this.selectedColor === 'random') {
            this.humanColor = Math.random() < 0.5 ? COLORS.WHITE : COLORS.BLACK;
        } else if (this.selectedColor === 'black') {
            this.humanColor = COLORS.BLACK;
        } else {
            this.humanColor = COLORS.WHITE;
        }
        
        // Flip board if playing as black
        this.isFlipped = this.humanColor === COLORS.BLACK;
        
        this.game.reset();
        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.isBotThinking = false;
        this.pendingPromotion = null;
        this.isDragging = false;
        this.dragStarted = false;
        this.dragStartPos = null;
        this.draggedPiece = null;
        this.draggedFrom = null;
        this.dragPieceEl = null;
        this.justDragged = false;
        this.preSelectedSquare = null;
        this.preDragData = null;
        this.isPreviewMode = false;
        this.previewMoveIndex = -1;
        this.previewBoard = null;
        if (this.ghostPiece) {
            this.ghostPiece.remove();
            this.ghostPiece = null;
        }
        
        this.updatePlayerLabels();
        this.renderBoard();
        this.updateUI();
        
        // If human is black, bot moves first
        if (this.humanColor === COLORS.BLACK) {
            this.makeBotMove();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
});
