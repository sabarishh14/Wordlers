import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return Response.json({ error: 'Username required' }, { status: 400 });
    }

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);
    
    // Fetch all historical scores for this user, sorted chronologically
    const scores = await sql`
      SELECT played_date, status, guesses_taken, time_taken 
      FROM daily_scores 
      WHERE username = ${username}
      ORDER BY played_date ASC;
    `;

    // 1. Calculate Base Stats
    let totalPlayed = scores.length;
    const wins = scores.filter(s => s.status === 'WIN');
    let winPercentage = totalPlayed === 0 ? 0 : Math.round((wins.length / totalPlayed) * 100);

    // 2. Calculate Guess Distribution (How many 1s, 2s, 3s, etc.)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    wins.forEach(w => {
      if (w.guesses_taken && w.guesses_taken >= 1 && w.guesses_taken <= 6) {
        distribution[w.guesses_taken as keyof typeof distribution]++;
      }
    });

    // 3. Calculate Streaks (Consecutive days won)
    let tempStreak = 0;
    let maxStreak = 0;
    let lastWinDate: number | null = null;

    for (const score of scores) {
      if (score.status === 'WIN') {
        const currentDate = new Date(score.played_date).setHours(0, 0, 0, 0);
        
        if (lastWinDate === null) {
          tempStreak = 1;
        } else {
          // Check if exactly 1 day passed since last win
          const diffDays = Math.round((currentDate - lastWinDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            tempStreak = 1; // Streak broke due to missed days
          }
        }
        lastWinDate = currentDate;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0; // Streak broke due to a FAIL
      }
    }

    // Is the streak still alive today or yesterday?
    let currentStreak = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    
    if (lastWinDate === today || lastWinDate === yesterday) {
      currentStreak = tempStreak;
    }

    // 4. Calculate Average Time
    let totalTime = 0;
    let gamesWithTime = 0;
    wins.forEach(w => {
      if (w.time_taken && w.time_taken > 0) {
        totalTime += w.time_taken;
        gamesWithTime++;
      }
    });
    const averageTime = gamesWithTime > 0 ? Math.round(totalTime / gamesWithTime) : 0;

    // 5. FETCH LEGACY STATS AND COMBINE
    const legacyRes = await sql`SELECT * FROM user_legacy_stats WHERE username = ${username}`;
    const legacy = legacyRes.length > 0 ? legacyRes[0] : null;

    if (legacy) {
      totalPlayed += legacy.played;
      maxStreak = Math.max(maxStreak, legacy.max_streak);
      currentStreak = Math.max(currentStreak, legacy.current_streak); // Simplified logic
      
      // Merge distributions
      distribution['1'] += legacy.dist_1;
      distribution['2'] += legacy.dist_2;
      distribution['3'] += legacy.dist_3;
      distribution['4'] += legacy.dist_4;
      distribution['5'] += legacy.dist_5;
      distribution['6'] += legacy.dist_6;

      // Recalculate combined win percentage
      let totalWins = distribution['1'] + distribution['2'] + distribution['3'] + distribution['4'] + distribution['5'] + distribution['6'];
      winPercentage = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
    }

    return Response.json({
      totalPlayed,
      winPercentage,
      currentStreak,
      maxStreak,
      distribution,
      averageTime
    });

  } catch (error) {
    console.error("Profile API Error:", error);
    return Response.json({ error: 'Failed to load profile stats' }, { status: 500 });
  }
}