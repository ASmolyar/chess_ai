/**
 * API endpoint for eval status
 * GET /api/evals/:id/status - Get ELO calculation status
 */

import { getEval, initDb } from '../../../lib/db.js';

export default async function handler(req, res) {
  await initDb();
  
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const evalData = await getEval(id);

      if (!evalData) {
        return res.status(404).json({ error: 'Eval not found' });
      }

      res.status(200).json({
        id: evalData.id,
        name: evalData.name,
        elo: evalData.elo,
        elo_confidence: evalData.elo_confidence,
        games_played: evalData.games_played,
        wins: evalData.wins,
        losses: evalData.losses,
        draws: evalData.draws,
        is_calculating: false,
        calculation_progress: null,
        message: 'ELO calculation is not available in serverless mode. Run locally for full functionality.'
      });
    } catch (error) {
      console.error('Error fetching status:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
