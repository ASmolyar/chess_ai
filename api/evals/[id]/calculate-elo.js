/**
 * API endpoint for triggering ELO calculation
 * POST /api/evals/:id/calculate-elo - Trigger ELO calculation
 * 
 * Note: In serverless mode, ELO calculation is not available
 * because Stockfish requires persistent processes
 */

import { getEval, initDb } from '../../../lib/db.js';

export default async function handler(req, res) {
  await initDb();
  
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const evalData = await getEval(id);
      
      if (!evalData) {
        return res.status(404).json({ error: 'Eval not found' });
      }

      // In serverless mode, we can't run Stockfish
      res.status(200).json({
        success: false,
        message: 'ELO calculation is not available in serverless mode. For full functionality including ELO calculation against Stockfish, run the server locally.',
        hint: 'Clone the repo and run: npm run dev'
      });
    } catch (error) {
      console.error('Error triggering ELO calculation:', error);
      res.status(500).json({ error: 'Failed to start ELO calculation' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
