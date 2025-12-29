/**
 * Chess Game Engine
 * Handles all chess rules, move validation, and game state
 */

const PIECES = {
    KING: 'k',
    QUEEN: 'q',
    ROOK: 'r',
    BISHOP: 'b',
    KNIGHT: 'n',
    PAWN: 'p'
};

const COLORS = {
    WHITE: 'w',
    BLACK: 'b'
};

const PIECE_SYMBOLS = {
    'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
    'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
};

const PIECE_VALUES = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
};

class ChessGame {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.turn = COLORS.WHITE;
        this.castlingRights = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        };
        this.enPassantSquare = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.positionHistory = [];
        this.gameOver = false;
        this.gameResult = null;
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pawns
        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: PIECES.PAWN, color: COLORS.BLACK };
            board[6][col] = { type: PIECES.PAWN, color: COLORS.WHITE };
        }
        
        // Place other pieces
        const backRank = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN, 
                         PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
        
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: COLORS.BLACK };
            board[7][col] = { type: backRank[col], color: COLORS.WHITE };
        }
        
        return board;
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    setPiece(row, col, piece) {
        this.board[row][col] = piece;
    }

    // Convert algebraic notation to coordinates
    algebraicToCoords(notation) {
        const col = notation.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - parseInt(notation[1]);
        return { row, col };
    }

    // Convert coordinates to algebraic notation
    coordsToAlgebraic(row, col) {
        const file = String.fromCharCode('a'.charCodeAt(0) + col);
        const rank = 8 - row;
        return `${file}${rank}`;
    }

    // Get all legal moves for a piece at given position
    getLegalMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.color !== this.turn) return [];
        
        const pseudoLegalMoves = this.getPseudoLegalMoves(row, col);
        const legalMoves = [];
        
        for (const move of pseudoLegalMoves) {
            if (this.isMoveLegal(row, col, move.row, move.col)) {
                legalMoves.push(move);
            }
        }
        
        return legalMoves;
    }

    // Get pseudo-legal moves (doesn't check for leaving king in check)
    getPseudoLegalMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];
        
        switch (piece.type) {
            case PIECES.PAWN:
                return this.getPawnMoves(row, col, piece.color);
            case PIECES.KNIGHT:
                return this.getKnightMoves(row, col, piece.color);
            case PIECES.BISHOP:
                return this.getBishopMoves(row, col, piece.color);
            case PIECES.ROOK:
                return this.getRookMoves(row, col, piece.color);
            case PIECES.QUEEN:
                return this.getQueenMoves(row, col, piece.color);
            case PIECES.KING:
                return this.getKingMoves(row, col, piece.color);
            default:
                return [];
        }
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === COLORS.WHITE ? -1 : 1;
        const startRow = color === COLORS.WHITE ? 6 : 1;
        const promotionRow = color === COLORS.WHITE ? 0 : 7;
        
        // Forward move
        const newRow = row + direction;
        if (newRow >= 0 && newRow <= 7 && !this.getPiece(newRow, col)) {
            if (newRow === promotionRow) {
                moves.push({ row: newRow, col, promotion: true });
            } else {
                moves.push({ row: newRow, col });
            }
            
            // Double move from starting position
            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (!this.getPiece(doubleRow, col)) {
                    moves.push({ row: doubleRow, col });
                }
            }
        }
        
        // Captures
        for (const captureCol of [col - 1, col + 1]) {
            if (captureCol >= 0 && captureCol <= 7) {
                const target = this.getPiece(newRow, captureCol);
                if (target && target.color !== color) {
                    if (newRow === promotionRow) {
                        moves.push({ row: newRow, col: captureCol, promotion: true });
                    } else {
                        moves.push({ row: newRow, col: captureCol });
                    }
                }
                
                // En passant
                if (this.enPassantSquare && 
                    this.enPassantSquare.row === newRow && 
                    this.enPassantSquare.col === captureCol) {
                    moves.push({ row: newRow, col: captureCol, enPassant: true });
                }
            }
        }
        
        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                const target = this.getPiece(newRow, newCol);
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        
        return moves;
    }

    getSlidingMoves(row, col, color, directions) {
        const moves = [];
        
        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            while (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                const target = this.getPiece(newRow, newCol);
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        }
        
        return moves;
    }

    getBishopMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    getRookMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    getQueenMoves(row, col, color) {
        return [
            ...this.getBishopMoves(row, col, color),
            ...this.getRookMoves(row, col, color)
        ];
    }

    getKingMoves(row, col, color) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                const target = this.getPiece(newRow, newCol);
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        
        // Castling
        if (!this.isKingInCheck(color)) {
            if (color === COLORS.WHITE) {
                if (this.castlingRights.whiteKingside && this.canCastle(7, 4, 7, 7)) {
                    moves.push({ row: 7, col: 6, castling: 'kingside' });
                }
                if (this.castlingRights.whiteQueenside && this.canCastle(7, 4, 7, 0)) {
                    moves.push({ row: 7, col: 2, castling: 'queenside' });
                }
            } else {
                if (this.castlingRights.blackKingside && this.canCastle(0, 4, 0, 7)) {
                    moves.push({ row: 0, col: 6, castling: 'kingside' });
                }
                if (this.castlingRights.blackQueenside && this.canCastle(0, 4, 0, 0)) {
                    moves.push({ row: 0, col: 2, castling: 'queenside' });
                }
            }
        }
        
        return moves;
    }

    canCastle(kingRow, kingCol, rookRow, rookCol) {
        // Check rook is there
        const rook = this.getPiece(rookRow, rookCol);
        if (!rook || rook.type !== PIECES.ROOK) return false;
        
        // Check squares between king and rook are empty
        const direction = rookCol > kingCol ? 1 : -1;
        for (let col = kingCol + direction; col !== rookCol; col += direction) {
            if (this.getPiece(kingRow, col)) return false;
        }
        
        // Check king doesn't pass through check
        const passCol = kingCol + direction;
        const destCol = kingCol + 2 * direction;
        
        if (this.wouldBeInCheck(kingRow, kingCol, kingRow, passCol)) return false;
        if (this.wouldBeInCheck(kingRow, kingCol, kingRow, destCol)) return false;
        
        return true;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.type === PIECES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        // Direct attack checks to avoid infinite recursion
        // (getPseudoLegalMoves calls getKingMoves which calls isKingInCheck)
        
        // Check pawn attacks
        const pawnDir = byColor === COLORS.WHITE ? 1 : -1;
        for (const dc of [-1, 1]) {
            const pr = row + pawnDir;
            const pc = col + dc;
            if (pr >= 0 && pr <= 7 && pc >= 0 && pc <= 7) {
                const piece = this.getPiece(pr, pc);
                if (piece && piece.type === PIECES.PAWN && piece.color === byColor) {
                    return true;
                }
            }
        }
        
        // Check knight attacks
        const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightOffsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const piece = this.getPiece(nr, nc);
                if (piece && piece.type === PIECES.KNIGHT && piece.color === byColor) {
                    return true;
                }
            }
        }
        
        // Check king attacks (for adjacent squares)
        const kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dr, dc] of kingOffsets) {
            const kr = row + dr;
            const kc = col + dc;
            if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
                const piece = this.getPiece(kr, kc);
                if (piece && piece.type === PIECES.KING && piece.color === byColor) {
                    return true;
                }
            }
        }
        
        // Check sliding piece attacks (rooks, bishops, queens)
        // Rook/Queen directions
        const rookDirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of rookDirs) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const piece = this.getPiece(r, c);
                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECES.ROOK || piece.type === PIECES.QUEEN)) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        // Bishop/Queen directions
        const bishopDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of bishopDirs) {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const piece = this.getPiece(r, c);
                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        return false;
    }

    isKingInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return this.isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const piece = this.getPiece(fromRow, fromCol);
        const captured = this.getPiece(toRow, toCol);
        
        this.setPiece(fromRow, fromCol, null);
        this.setPiece(toRow, toCol, piece);
        
        const inCheck = this.isKingInCheck(piece.color);
        
        // Undo temporary move
        this.setPiece(fromRow, fromCol, piece);
        this.setPiece(toRow, toCol, captured);
        
        return inCheck;
    }

    isMoveLegal(fromRow, fromCol, toRow, toCol) {
        return !this.wouldBeInCheck(fromRow, fromCol, toRow, toCol);
    }

    // Get all legal moves for current player
    getAllLegalMoves() {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === this.turn) {
                    const pieceMoves = this.getLegalMoves(row, col);
                    for (const move of pieceMoves) {
                        moves.push({
                            from: { row, col },
                            to: move,
                            piece: piece
                        });
                    }
                }
            }
        }
        return moves;
    }

    // Make a move
    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece) return null;
        
        const legalMoves = this.getLegalMoves(fromRow, fromCol);
        const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
        if (!move) return null;
        
        // Check for promotion
        if (move.promotion && !promotionPiece) {
            return { needsPromotion: true, move };
        }
        
        // Store move for history
        const moveRecord = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            captured: this.getPiece(toRow, toCol),
            castling: move.castling,
            enPassant: move.enPassant,
            promotion: promotionPiece,
            previousEnPassant: this.enPassantSquare ? { ...this.enPassantSquare } : null,
            previousCastling: { ...this.castlingRights },
            previousHalfMove: this.halfMoveClock
        };
        
        // Handle en passant capture
        if (move.enPassant) {
            const capturedPawnRow = piece.color === COLORS.WHITE ? toRow + 1 : toRow - 1;
            moveRecord.captured = this.getPiece(capturedPawnRow, toCol);
            this.setPiece(capturedPawnRow, toCol, null);
        }
        
        // Handle castling
        if (move.castling) {
            if (move.castling === 'kingside') {
                const rookCol = 7;
                const rook = this.getPiece(fromRow, rookCol);
                this.setPiece(fromRow, rookCol, null);
                this.setPiece(fromRow, 5, rook);
            } else {
                const rookCol = 0;
                const rook = this.getPiece(fromRow, rookCol);
                this.setPiece(fromRow, rookCol, null);
                this.setPiece(fromRow, 3, rook);
            }
        }
        
        // Track captured piece
        if (moveRecord.captured) {
            if (piece.color === COLORS.WHITE) {
                this.capturedPieces.white.push(moveRecord.captured);
            } else {
                this.capturedPieces.black.push(moveRecord.captured);
            }
        }
        
        // Move the piece
        this.setPiece(fromRow, fromCol, null);
        if (promotionPiece) {
            this.setPiece(toRow, toCol, { type: promotionPiece, color: piece.color });
        } else {
            this.setPiece(toRow, toCol, piece);
        }
        
        // Update en passant square
        this.enPassantSquare = null;
        if (piece.type === PIECES.PAWN && Math.abs(toRow - fromRow) === 2) {
            this.enPassantSquare = {
                row: (fromRow + toRow) / 2,
                col: fromCol
            };
        }
        
        // Update castling rights
        if (piece.type === PIECES.KING) {
            if (piece.color === COLORS.WHITE) {
                this.castlingRights.whiteKingside = false;
                this.castlingRights.whiteQueenside = false;
            } else {
                this.castlingRights.blackKingside = false;
                this.castlingRights.blackQueenside = false;
            }
        }
        if (piece.type === PIECES.ROOK) {
            if (fromRow === 0 && fromCol === 0) this.castlingRights.blackQueenside = false;
            if (fromRow === 0 && fromCol === 7) this.castlingRights.blackKingside = false;
            if (fromRow === 7 && fromCol === 0) this.castlingRights.whiteQueenside = false;
            if (fromRow === 7 && fromCol === 7) this.castlingRights.whiteKingside = false;
        }
        // Rook captured
        if (toRow === 0 && toCol === 0) this.castlingRights.blackQueenside = false;
        if (toRow === 0 && toCol === 7) this.castlingRights.blackKingside = false;
        if (toRow === 7 && toCol === 0) this.castlingRights.whiteQueenside = false;
        if (toRow === 7 && toCol === 7) this.castlingRights.whiteKingside = false;
        
        // Update clocks
        if (piece.type === PIECES.PAWN || moveRecord.captured) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }
        
        if (this.turn === COLORS.BLACK) {
            this.fullMoveNumber++;
        }
        
        // Generate algebraic notation
        moveRecord.notation = this.generateMoveNotation(moveRecord, promotionPiece);
        
        // Switch turn
        this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        // Add to history
        this.moveHistory.push(moveRecord);
        
        // Check game state
        this.checkGameState();
        
        return moveRecord;
    }

    generateMoveNotation(move, promotionPiece) {
        const pieceLetters = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };
        const piece = move.piece;
        const from = this.coordsToAlgebraic(move.from.row, move.from.col);
        const to = this.coordsToAlgebraic(move.to.row, move.to.col);
        
        // Castling
        if (move.castling === 'kingside') return 'O-O';
        if (move.castling === 'queenside') return 'O-O-O';
        
        let notation = pieceLetters[piece.type];
        
        // For pawns, include file if capturing
        if (piece.type === PIECES.PAWN && move.captured) {
            notation = from[0];
        }
        
        // Add capture symbol
        if (move.captured) {
            notation += 'x';
        }
        
        notation += to;
        
        // Add promotion
        if (promotionPiece) {
            notation += '=' + pieceLetters[promotionPiece].toUpperCase();
        }
        
        // Check for check/checkmate
        const opponentColor = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        if (this.isKingInCheck(opponentColor)) {
            const opponentMoves = this.getAllLegalMovesForColor(opponentColor);
            if (opponentMoves.length === 0) {
                notation += '#';
            } else {
                notation += '+';
            }
        }
        
        return notation;
    }

    getAllLegalMovesForColor(color) {
        const originalTurn = this.turn;
        this.turn = color;
        const moves = this.getAllLegalMoves();
        this.turn = originalTurn;
        return moves;
    }

    checkGameState() {
        const legalMoves = this.getAllLegalMoves();
        
        if (legalMoves.length === 0) {
            this.gameOver = true;
            if (this.isKingInCheck(this.turn)) {
                const winner = this.turn === COLORS.WHITE ? 'Black' : 'White';
                this.gameResult = { type: 'checkmate', winner };
            } else {
                this.gameResult = { type: 'stalemate' };
            }
        } else if (this.halfMoveClock >= 100) {
            this.gameOver = true;
            this.gameResult = { type: 'fifty-move-rule' };
        } else if (this.isInsufficientMaterial()) {
            this.gameOver = true;
            this.gameResult = { type: 'insufficient-material' };
        }
    }

    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece) {
                    const color = piece.color === COLORS.WHITE ? 'white' : 'black';
                    pieces[color].push(piece.type);
                }
            }
        }
        
        // King vs King
        if (pieces.white.length === 1 && pieces.black.length === 1) return true;
        
        // King + Bishop/Knight vs King
        if (pieces.white.length === 1 && pieces.black.length === 2) {
            if (pieces.black.includes(PIECES.BISHOP) || pieces.black.includes(PIECES.KNIGHT)) {
                return true;
            }
        }
        if (pieces.black.length === 1 && pieces.white.length === 2) {
            if (pieces.white.includes(PIECES.BISHOP) || pieces.white.includes(PIECES.KNIGHT)) {
                return true;
            }
        }
        
        return false;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        const move = this.moveHistory.pop();
        
        // Restore piece to original position
        this.setPiece(move.from.row, move.from.col, move.piece);
        
        // Handle promotion - restore to pawn
        if (move.promotion) {
            this.setPiece(move.to.row, move.to.col, move.captured);
        } else {
            this.setPiece(move.to.row, move.to.col, move.captured);
        }
        
        // Handle en passant
        if (move.enPassant) {
            const capturedPawnRow = move.piece.color === COLORS.WHITE ? move.to.row + 1 : move.to.row - 1;
            this.setPiece(capturedPawnRow, move.to.col, move.captured);
            this.setPiece(move.to.row, move.to.col, null);
        }
        
        // Handle castling
        if (move.castling) {
            if (move.castling === 'kingside') {
                const rook = this.getPiece(move.from.row, 5);
                this.setPiece(move.from.row, 5, null);
                this.setPiece(move.from.row, 7, rook);
            } else {
                const rook = this.getPiece(move.from.row, 3);
                this.setPiece(move.from.row, 3, null);
                this.setPiece(move.from.row, 0, rook);
            }
        }
        
        // Remove from captured pieces
        if (move.captured) {
            if (move.piece.color === COLORS.WHITE) {
                this.capturedPieces.white.pop();
            } else {
                this.capturedPieces.black.pop();
            }
        }
        
        // Restore game state
        this.enPassantSquare = move.previousEnPassant;
        this.castlingRights = move.previousCastling;
        this.halfMoveClock = move.previousHalfMove;
        
        if (this.turn === COLORS.WHITE) {
            this.fullMoveNumber--;
        }
        
        this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        this.gameOver = false;
        this.gameResult = null;
        
        return true;
    }

    // Clone the game state
    clone() {
        const clone = new ChessGame();
        clone.board = this.board.map(row => row.map(piece => piece ? { ...piece } : null));
        clone.turn = this.turn;
        clone.castlingRights = { ...this.castlingRights };
        clone.enPassantSquare = this.enPassantSquare ? { ...this.enPassantSquare } : null;
        clone.halfMoveClock = this.halfMoveClock;
        clone.fullMoveNumber = this.fullMoveNumber;
        clone.gameOver = this.gameOver;
        clone.gameResult = this.gameResult ? { ...this.gameResult } : null;
        return clone;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessGame, PIECES, COLORS, PIECE_SYMBOLS, PIECE_VALUES };
}

