/**
 * Frontend configuration
 * Automatically detects environment and sets appropriate API URLs
 * 
 * To enable full features in production, set these in your deployment:
 * - VITE_ENGINE_URL: URL to the Java engine server (e.g., https://your-engine.railway.app)
 * - VITE_EVAL_SERVER_URL: URL to the eval server with Stockfish (e.g., https://your-server.railway.app)
 * - VITE_WS_URL: WebSocket URL for live game viewer
 */

const Config = {
  // Detect if running on Vercel or locally
  isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
  
  // API URLs - can be overridden via window.ENV_CONFIG
  get EVAL_SERVER_URL() {
    // Check for runtime config override
    if (window.ENV_CONFIG?.EVAL_SERVER_URL) {
      return window.ENV_CONFIG.EVAL_SERVER_URL;
    }
    if (this.isProduction) {
      // In production, API is on the same domain (Vercel serverless)
      return '';
    }
    // Local development
    return 'http://localhost:3001';
  },
  
  get ENGINE_URL() {
    // Check for runtime config override (for Railway/Render deployment)
    if (window.ENV_CONFIG?.ENGINE_URL) {
      return window.ENV_CONFIG.ENGINE_URL;
    }
    if (this.isProduction) {
      // Engine server not available by default in production
      return null;
    }
    return 'http://localhost:8765';
  },
  
  get WS_URL() {
    // Check for runtime config override
    if (window.ENV_CONFIG?.WS_URL) {
      return window.ENV_CONFIG.WS_URL;
    }
    if (this.isProduction) {
      return null;
    }
    return 'ws://localhost:3002';
  },
  
  // Feature flags based on environment and available services
  get features() {
    return {
      eloCalculation: !!this.EVAL_SERVER_URL && !this.isProduction, // Only with full server
      engineBots: !!this.ENGINE_URL,
      liveGameViewer: !!this.WS_URL,
    };
  }
};

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
window.Config = Config;
