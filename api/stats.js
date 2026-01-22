/**
 * API endpoint for leaderboard statistics
 * GET /api/stats - Get overall statistics
 */

import { getStats, initDb } from '../lib/db.js';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    try {
      const stats = await getStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
