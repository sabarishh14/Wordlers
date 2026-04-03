import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  try {
    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);
    const url = new URL(request.url);
    const dateQuery = url.searchParams.get('date');
    const mode = url.searchParams.get('mode');

    // --- OVERALL LEADERBOARD (COMBINED LOGIC) ---
    if (mode === 'overall') {
      const legacyStats = await sql`SELECT * FROM user_legacy_stats`;
      const nativeScores = await sql`
        SELECT username, played_date, status, guesses_taken, time_taken 
        FROM daily_scores 
        ORDER BY played_date ASC
      `;

      const userMap = new Map();

      // 1. Seed the map with Legacy Data
      legacyStats.forEach(leg => {
        const total_legacy_wins = leg.dist_1 + leg.dist_2 + leg.dist_3 + leg.dist_4 + leg.dist_5 + leg.dist_6;
        const total_legacy_guesses = (leg.dist_1 * 1) + (leg.dist_2 * 2) + (leg.dist_3 * 3) + (leg.dist_4 * 4) + (leg.dist_5 * 5) + (leg.dist_6 * 6);
        
        userMap.set(leg.username, {
          username: leg.username,
          anchorDate: leg.last_played_date ? new Date(leg.last_played_date).setHours(0,0,0,0) : new Date().setHours(0,0,0,0),
          total_wins: total_legacy_wins,
          total_guesses: total_legacy_guesses,
          total_time: 0,
          games_with_time: 0
        });
      });

      // 2. Layer the Native Scores on top
      nativeScores.forEach(score => {
        let user = userMap.get(score.username);
        if (!user) {
          user = { username: score.username, anchorDate: null, total_wins: 0, total_guesses: 0, total_time: 0, games_with_time: 0 };
          userMap.set(score.username, user);
        }

        const scoreDate = new Date(score.played_date).setHours(0,0,0,0);
        
        // Skip native scores that overlap with the legacy anchor date
        if (user.anchorDate && scoreDate <= user.anchorDate) return;

        if (score.status === 'WIN') {
          user.total_wins++;
          user.total_guesses += score.guesses_taken;
          if (score.time_taken > 0) {
            user.total_time += score.time_taken;
            user.games_with_time++;
          }
        }
      });

      // 3. Format and Sort the final array
      const overallLeaderboard = Array.from(userMap.values()).map(user => {
        return {
          username: user.username,
          total_wins: user.total_wins,
          avg_guesses: user.total_wins > 0 ? Number((user.total_guesses / user.total_wins).toFixed(2)) : 0,
          avg_time: user.games_with_time > 0 ? Math.round(user.total_time / user.games_with_time) : 0
        };
      });

      // Rank by Wins (Desc), then Avg Guesses (Asc), then Avg Time (Asc)
      overallLeaderboard.sort((a, b) => {
        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
        if (a.avg_guesses !== b.avg_guesses) return a.avg_guesses - b.avg_guesses;
        return a.avg_time - b.avg_time;
      });

      return Response.json(overallLeaderboard);
    }

    // --- DAILY LEADERBOARD (ORIGINAL LOGIC) ---
    let targetDate = dateQuery;
    if (!targetDate) {
      const d = new Date();
      targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const scores = await sql`
      SELECT username, status, guesses_taken, words_guessed, evaluations, time_taken 
      FROM daily_scores 
      WHERE played_date = ${targetDate}::date
      ORDER BY 
        CASE WHEN status = 'WIN' THEN 1 ELSE 2 END,
        guesses_taken ASC,
        time_taken ASC;
    `;

    return Response.json(scores);
  } catch (error) {
    console.error("Leaderboard API Error:", error);
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}