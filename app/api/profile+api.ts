import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return Response.json({ error: 'Username required' }, { status: 400 });
    }

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);
    
    // Fetch all historical scores for this user, sorted chronologically
    const scores = await sql`
      SELECT played_date, status, guesses_taken 
      FROM daily_scores 
      WHERE username = ${username}
      ORDER BY played_date ASC;
    `;

    // 1. Calculate Base Stats
    const totalPlayed = scores.length;
    const wins = scores.filter(s => s.status === 'WIN');
    const winPercentage = totalPlayed === 0 ? 0 : Math.round((wins.length / totalPlayed) * 100);

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

    return Response.json({
      totalPlayed,
      winPercentage,
      currentStreak,
      maxStreak,
      distribution
    });

  } catch (error) {
    console.error("Profile API Error:", error);
    return Response.json({ error: 'Failed to load profile stats' }, { status: 500 });
  }
}