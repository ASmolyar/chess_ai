/**
 * Random Bot - Makes completely random legal moves
 */

class RandomBot extends ChessBot {
    constructor() {
        super('Random Bot', 'Makes completely random legal moves. Good for testing!');
    }

    async getMove(game) {
        // Small delay to make it feel more natural
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        
        const legalMoves = game.getAllLegalMoves();
        
        if (legalMoves.length === 0) {
            return null;
        }
        
        // Pick a random move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const move = legalMoves[randomIndex];
        
        // If it's a promotion, pick a random piece (usually queen though)
        let promotion = null;
        if (move.to.promotion) {
            const pieces = ['q', 'r', 'b', 'n'];
            // 90% chance of queen, 10% chance of other pieces
            if (Math.random() < 0.9) {
                promotion = 'q';
            } else {
                promotion = pieces[Math.floor(Math.random() * pieces.length)];
            }
        }
        
        return {
            from: move.from,
            to: { row: move.to.row, col: move.to.col },
            promotion
        };
    }
}

// Register the bot
botRegistry.register('random', RandomBot);



