/**
 * Chess Engine Bot
 * Connects to the engine server via HTTP
 */

// Engine server configuration
const ENGINE_URL = 'http://localhost:8765';

// Check if the engine server is available
let serverAvailable = null;

async function checkEngineServer() {
    if (serverAvailable !== null) {
        return serverAvailable;
    }
    
    try {
        const response = await fetch(`${ENGINE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });
        serverAvailable = response.ok;
    } catch (error) {
        console.warn('[EngineBot] Engine server not available:', error.message);
        serverAvailable = false;
    }
    
    return serverAvailable;
}

// Initialize the engine on the server
async function initEngine() {
    const response = await fetch(`${ENGINE_URL}/api/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
}

// Set the evaluator function
async function setEvaluator(name) {
    const response = await fetch(`${ENGINE_URL}/api/setEvaluator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return response.json();
}

// Get available evaluators
async function getAvailableEvaluators() {
    const response = await fetch(`${ENGINE_URL}/api/getEvaluators`);
    return response.json();
}

// Get current evaluator info
async function getCurrentEvaluator() {
    const response = await fetch(`${ENGINE_URL}/api/getEvaluator`);
    return response.json();
}

// Configure custom evaluator weights
async function configureCustomEval(config) {
    const response = await fetch(`${ENGINE_URL}/api/configureCustomEval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    return response.json();
}

// Get current custom eval configuration
async function getCustomEvalConfig() {
    const response = await fetch(`${ENGINE_URL}/api/getCustomEvalConfig`);
    return response.json();
}

// Search for a move
async function searchWithEngine(fen, depth, timeMs) {
    // Set the position
    await fetch(`${ENGINE_URL}/api/setFen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen })
    });
    
    // Search for best move
    const searchResponse = await fetch(`${ENGINE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth, time: timeMs })
    });
    
    const searchResult = await searchResponse.json();
    
    // Get search info
    const infoResponse = await fetch(`${ENGINE_URL}/api/getInfo`);
    const info = await infoResponse.json();
    
    return {
        move: searchResult.bestMove,
        info
    };
}

// Convert our game state to FEN for the engine
function gameToFen(game) {
    // Build FEN string from game state
    let fen = '';
    
    // Piece placement
    for (let row = 0; row < 8; row++) {
        let empty = 0;
        for (let col = 0; col < 8; col++) {
            const piece = game.getPiece(row, col);
            if (!piece) {
                empty++;
            } else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const pieceChar = {
                    'p': 'p', 'n': 'n', 'b': 'b', 'r': 'r', 'q': 'q', 'k': 'k'
                }[piece.type];
                fen += piece.color === 'w' ? pieceChar.toUpperCase() : pieceChar;
            }
        }
        if (empty > 0) fen += empty;
        if (row < 7) fen += '/';
    }
    
    // Side to move
    fen += ' ' + game.turn;
    
    // Castling rights
    let castling = '';
    if (game.castlingRights.whiteKingside) castling += 'K';
    if (game.castlingRights.whiteQueenside) castling += 'Q';
    if (game.castlingRights.blackKingside) castling += 'k';
    if (game.castlingRights.blackQueenside) castling += 'q';
    fen += ' ' + (castling || '-');
    
    // En passant
    if (game.enPassantSquare) {
        const file = String.fromCharCode('a'.charCodeAt(0) + game.enPassantSquare.col);
        const rank = 8 - game.enPassantSquare.row;
        fen += ' ' + file + rank;
    } else {
        fen += ' -';
    }
    
    // Half move clock and full move number
    fen += ' ' + game.halfMoveClock;
    fen += ' ' + game.fullMoveNumber;
    
    return fen;
}

// Convert UCI move to our format
function uciToMove(uciMove, game) {
    if (!uciMove || uciMove.length < 4) {
        return null;
    }
    
    const fromCol = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(uciMove[1]);
    const toCol = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(uciMove[3]);
    
    let promotion = null;
    if (uciMove.length >= 5) {
        promotion = uciMove[4];
    }
    
    return {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        promotion
    };
}

/**
 * Factory function to create an engine-powered bot
 */
function createEngineBot(options = {}) {
    const {
        depth = 8,  // Fixed depth 8 for all non-debug bots
        timeMs = 0,
        name = 'Chess Engine',
        description = 'Chess engine with bitboards, TT, and advanced search',
        evaluator = 'turing',  // 'turing', 'material', 'custom', or 'rule'
        customEvalConfig = null  // Custom eval configuration (only used if evaluator='custom' or 'rule')
    } = options;

    class EngineBot extends ChessBot {
        constructor() {
            super(name, description);
            this.depth = depth;
            this.timeMs = timeMs;
            this.evaluator = evaluator;
            this.customEvalConfig = customEvalConfig;
            this.initialized = false;
            this.evaluatorSet = false;
        }

        async getMove(game) {
            // Check if server is available
            const available = await checkEngineServer();
            if (!available) {
                throw new Error('Engine server not available. Run: cd engine && ./run-server.sh');
            }
            
            // Initialize on first use
            if (!this.initialized) {
                await initEngine();
                this.initialized = true;
            }
            
            // Set evaluator if not already set
            if (!this.evaluatorSet) {
                await setEvaluator(this.evaluator);
                if (this.evaluator === 'custom' && this.customEvalConfig) {
                    await configureCustomEval(this.customEvalConfig);
                }
                this.evaluatorSet = true;
                console.log(`[EngineBot] Using evaluator: ${this.evaluator}`);
            }
            
            try {
                // Build FEN from game state
                const fen = gameToFen(game);
                
                console.log(`[EngineBot] Searching FEN: ${fen} depth=${this.depth}`);
                
                // Search using the engine
                const result = await searchWithEngine(fen, this.depth, this.timeMs);
                
                if (!result.move) {
                    throw new Error(`Engine returned empty move for FEN: ${fen}`);
                }
                
                // Log search info
                if (result.info) {
                    console.log(`Engine: depth=${result.info.depth} score=${result.info.score} nodes=${result.info.nodes} time=${result.info.time}ms`);
                }
                
                // Convert to our move format
                return uciToMove(result.move, game);
                
            } catch (error) {
                console.error('Engine search error:', error);
                // Reset state so it can be reloaded on next call
                this.initialized = false;
                throw error;
            }
        }
    }
    
    return EngineBot;
}

// TuringBot - main bot using Turing's evaluation at depth 8
const TuringBot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'TuringBot',
    description: "Alan Turing's chess evaluation function",
    evaluator: 'turing'
});

// Debug bots for testing
const DebugDepth2 = createEngineBot({
    depth: 2,
    timeMs: 0,
    name: 'Debug (Depth 2)',
    description: "Fast debug bot - Turing eval at depth 2",
    evaluator: 'turing'
});

const DebugDepth12 = createEngineBot({
    depth: 12,
    timeMs: 0,
    name: 'Debug (Depth 12)',
    description: "Strong debug bot - Turing eval at depth 12",
    evaluator: 'turing'
});

// Custom Eval Bot - uses whatever rule eval is currently configured on the engine
const CustomEvalBot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'Custom Eval',
    description: "Play against a custom evaluation function from the leaderboard",
    evaluator: 'rule'
});

// Register TuringBot first (other bots registered after RandomBot in index.html)
if (typeof botRegistry !== 'undefined') {
    botRegistry.register('turingbot', TuringBot);
}

// Function to register debug bots (called after RandomBot is registered)
function registerDebugBots() {
    if (typeof botRegistry !== 'undefined') {
        botRegistry.register('debug-depth2', DebugDepth2);
        botRegistry.register('debug-depth12', DebugDepth12);
        botRegistry.register('custom-eval', CustomEvalBot);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createEngineBot,
        TuringBot,
        DebugDepth2,
        DebugDepth12,
        CustomEvalBot,
        checkEngineServer,
        setEvaluator,
        getAvailableEvaluators,
        getCurrentEvaluator,
        configureCustomEval,
        getCustomEvalConfig
    };
}
