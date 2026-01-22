/**
 * Base Bot Interface
 * All chess bots should extend this class
 */

class ChessBot {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    /**
     * Get the bot's move
     * @param {ChessGame} game - The current game state
     * @returns {Promise<{from: {row, col}, to: {row, col}, promotion?: string}>} - The chosen move
     */
    async getMove(game) {
        throw new Error('getMove must be implemented by subclass');
    }

    /**
     * Get bot info for display
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description
        };
    }
}

/**
 * Bot Registry - manages available bots
 */
class BotRegistry {
    constructor() {
        this.bots = new Map();
    }

    register(id, botClass) {
        this.bots.set(id, botClass);
    }

    create(id) {
        const BotClass = this.bots.get(id);
        if (!BotClass) {
            throw new Error(`Bot with id '${id}' not found`);
        }
        return new BotClass();
    }

    getAvailable() {
        const available = [];
        for (const [id, BotClass] of this.bots) {
            const instance = new BotClass();
            available.push({
                id,
                name: instance.name,
                description: instance.description
            });
        }
        return available;
    }
}

// Global bot registry
const botRegistry = new BotRegistry();



