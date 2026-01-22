/**
 * Chess Engine Bot
 * Connects to the engine server via HTTP
 */

// Engine server configuration - uses Config if available
const ENGINE_URL = (typeof Config !== 'undefined' && Config.ENGINE_URL) 
  ? Config.ENGINE_URL 
  : 'http://localhost:8765';

// Check if the engine server is available
let serverAvailable = null;
let lastServerCheck = 0;
const SERVER_CHECK_INTERVAL = 5000; // Recheck every 5 seconds if previously failed

async function checkEngineServer() {
    const now = Date.now();
    
    // If we know it's available, return true
    // If we previously failed, recheck after interval
    if (serverAvailable === true) {
        return true;
    }
    if (serverAvailable === false && (now - lastServerCheck) < SERVER_CHECK_INTERVAL) {
        return false;
    }
    
    lastServerCheck = now;
    
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

// Reset server availability check (call this when you know server was restarted)
function resetServerCheck() {
    serverAvailable = null;
    lastServerCheck = 0;
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
async function searchWithEngine(fen, depth, timeMs, findWorst = false) {
    // Set the position
    await fetch(`${ENGINE_URL}/api/setFen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen })
    });
    
    // Search for best or worst move
    const endpoint = findWorst ? '/api/searchWorst' : '/api/search';
    const searchResponse = await fetch(`${ENGINE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth, time: timeMs })
    });
    
    const searchResult = await searchResponse.json();
    
    // Get search info
    const infoResponse = await fetch(`${ENGINE_URL}/api/getInfo`);
    const info = await infoResponse.json();
    
    return {
        move: findWorst ? searchResult.worstMove : searchResult.bestMove,
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
        evaluator = 'turing',  // 'turing', 'material', 'custom', 'rule', or 'preset'
        customEvalConfig = null,  // Custom eval configuration (only used if evaluator='custom' or 'rule')
        presetId = null,  // Preset ID to load (only used if evaluator='preset')
        findWorst = false  // If true, finds the worst move instead of the best
    } = options;

    class EngineBot extends ChessBot {
        constructor() {
            super(name, description);
            this.depth = depth;
            this.timeMs = timeMs;
            this.evaluator = evaluator;
            this.customEvalConfig = customEvalConfig;
            this.presetId = presetId;
            this.findWorst = findWorst;
            this.initialized = false;
            this.evaluatorSet = false;
            this.presetLoaded = false;
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
                // Handle preset evaluator - load preset and configure as rule eval
                if (this.evaluator === 'preset' && this.presetId) {
                    await setEvaluator('rule');
                    const presetConfig = await this.loadPreset(this.presetId);
                    if (presetConfig) {
                        await configureCustomEval(presetConfig);
                        console.log(`[EngineBot] Loaded preset: ${this.presetId}`);
                    }
                } else {
                    await setEvaluator(this.evaluator);
                    if (this.evaluator === 'custom' && this.customEvalConfig) {
                        await configureCustomEval(this.customEvalConfig);
                    }
                }
                this.evaluatorSet = true;
                console.log(`[EngineBot] Using evaluator: ${this.evaluator}`);
            }
            
            try {
                // Build FEN from game state
                const fen = gameToFen(game);
                
                console.log(`[EngineBot] Searching FEN: ${fen} depth=${this.depth}${this.findWorst ? ' (worst)' : ''}`);
                
                // Search using the engine
                const result = await searchWithEngine(fen, this.depth, this.timeMs, this.findWorst);
                
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
        
        // Load a preset configuration from EvalBuilder
        async loadPreset(presetId) {
            // Check if EvalBuilder is available
            if (typeof EvalBuilder === 'undefined') {
                console.error('[EngineBot] EvalBuilder not available');
                return null;
            }
            
            // Create a temporary EvalBuilder instance to get the preset
            const builder = new EvalBuilder();
            const presets = builder.createPresetsCatalog();
            
            if (!presets[presetId]) {
                console.error(`[EngineBot] Preset not found: ${presetId}`);
                return null;
            }
            
            const preset = presets[presetId];
            return preset.evaluator;
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

// Custom Eval Bot at depth 0 - for testing/debugging evaluation function
const CustomEvalDepth0 = createEngineBot({
    depth: 0,
    timeMs: 0,
    name: 'Custom Eval (Depth 0 - Debug)',
    description: "Debug mode: Uses only the evaluation function, no search. Good for testing eval correctness.",
    evaluator: 'rule'
});

// WorstBot - uses the engine but picks the worst move
const WorstBot = createEngineBot({
    depth: 4,  // Lower depth is fine for worst moves
    timeMs: 0,
    name: 'Worst Bot',
    description: "Always plays the worst possible move. Uses engine search to find truly terrible moves!",
    evaluator: 'turing',
    findWorst: true
});

// ═══════════════════════════════════════════════════════════════════
// CLASSIC EVALUATION PRESET BOTS
// These bots use the historic evaluation functions from the Eval Builder
// ═══════════════════════════════════════════════════════════════════

// Shannon (1950) - The foundational evaluation
const ShannonBot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'Shannon (1950)',
    description: "Claude Shannon's foundational evaluation from 'Programming a Computer for Playing Chess'",
    evaluator: 'preset',
    presetId: 'shannon'
});

// SOMA (1960s) - Early practical evaluation
const SOMABot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'SOMA (1960s)',
    description: "Early practical evaluation emphasizing center control and basic positional concepts",
    evaluator: 'preset',
    presetId: 'soma'
});

// Simplified (1990s) - Modern baseline with PSTs
const SimplifiedBot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'Simplified (1990s)',
    description: "Tomasz Michniewski's hand-crafted baseline with piece-square tables",
    evaluator: 'preset',
    presetId: 'simplified'
});

// Fruit-Style (2005) - Revolutionary open-source approach
const FruitBot = createEngineBot({
    depth: 8,
    timeMs: 0,
    name: 'Fruit-Style (2005)',
    description: "Fabien Letouzey's revolutionary evaluation with king safety and mobility",
    evaluator: 'preset',
    presetId: 'fruit'
});

// Register TuringBot first (other bots registered after RandomBot in index.html)
if (typeof botRegistry !== 'undefined') {
    botRegistry.register('turingbot', TuringBot);
}

// Function to register debug bots (called after RandomBot is registered)
function registerDebugBots() {
    if (typeof botRegistry !== 'undefined') {
        // Classic preset bots
        botRegistry.register('shannon', ShannonBot);
        botRegistry.register('soma', SOMABot);
        botRegistry.register('simplified', SimplifiedBot);
        botRegistry.register('fruit', FruitBot);
        
        // Utility bots
        botRegistry.register('worst', WorstBot);
        botRegistry.register('debug-depth2', DebugDepth2);
        botRegistry.register('debug-depth12', DebugDepth12);
        botRegistry.register('custom-eval', CustomEvalBot);
        botRegistry.register('custom-eval-d0', CustomEvalDepth0);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createEngineBot,
        TuringBot,
        ShannonBot,
        SOMABot,
        SimplifiedBot,
        FruitBot,
        WorstBot,
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
