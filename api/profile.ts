import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (!username) return Response.json({ error: 'Username required' }, { status: 400 });

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);
    
    // 1. Fetch Legacy Stats First
    const legacyRes = await sql`SELECT * FROM user_legacy_stats WHERE username = ${username}`;
    const legacy = legacyRes.length > 0 ? legacyRes[0] : null;

    // 2. Fetch Native Scores
    const scores = await sql`
      SELECT played_date, status, guesses_taken, time_taken, words_guessed 
      FROM daily_scores 
      WHERE username = ${username}
      ORDER BY played_date ASC;
    `;

    // 3. Initialize baseline with NYT Legacy Data (if it exists)
    let totalPlayed = legacy ? legacy.played : 0;
    let maxStreak = legacy ? legacy.max_streak : 0;
    let currentStreak = legacy ? legacy.current_streak : 0;
    let distribution: Record<string, number> = {
      1: legacy ? legacy.dist_1 : 0, 2: legacy ? legacy.dist_2 : 0,
      3: legacy ? legacy.dist_3 : 0, 4: legacy ? legacy.dist_4 : 0,
      5: legacy ? legacy.dist_5 : 0, 6: legacy ? legacy.dist_6 : 0,
    };

    // --- THE FIX: Separate the Anchor Date from the Win Tracker ---
    // If the DB has no date (because of the older import), assume "Today"
    const legacyAnchorDate = legacy && legacy.last_played_date 
      ? new Date(legacy.last_played_date).setHours(0, 0, 0, 0) 
      : new Date().setHours(0, 0, 0, 0);

    // Assume the NYT streak is active as of the anchor date
    let lastWinDate: number | null = legacyAnchorDate; 
    if (legacy && legacy.current_streak === 0) {
      lastWinDate = null;
    }

    let totalTime = 0; 
    let gamesWithTime = 0;
    const wordFrequencies: Record<string, number> = {}; // <-- NEW: Dictionary to count words

    // 4. Layer the native scores exactly on top
    for (const score of scores) {
      // --- NEW: Count EVERY word they guessed in this game ---
      if (score.words_guessed) {
        let words = score.words_guessed;
        // Handle Postgres returning either a JSON string or an array
        if (typeof words === 'string') {
          try { words = JSON.parse(words); } catch(e) { words = []; }
        }
        if (Array.isArray(words)) {
          for (const word of words) {
            if (word) {
              const cleanWord = word.toUpperCase();
              wordFrequencies[cleanWord] = (wordFrequencies[cleanWord] || 0) + 1;
            }
          }
        }
      }
      // --------------------------------------------------------
      const scoreDate = new Date(score.played_date).setHours(0, 0, 0, 0);
      const isOverlap = legacy && scoreDate <= legacyAnchorDate;

      // 1. ALWAYS rescue the time data, even if it's an overlapping game!
      if (score.status === 'WIN' && score.time_taken && score.time_taken > 0) {
        totalTime += score.time_taken;
        gamesWithTime++;
      }

      // 2. NOW skip the rest if it overlaps, so we don't double count NYT wins/streaks
      if (isOverlap) {
        continue;
      }

      totalPlayed++;

      if (score.status === 'WIN') {
        if (score.guesses_taken) distribution[String(score.guesses_taken)]++;

        if (lastWinDate === null) {
          currentStreak = 1;
        } else {
          // Check if exactly 1 day passed since last win (seamless legacy stitching!)
          const diffDays = Math.round((scoreDate - lastWinDate) / 86400000);
          if (diffDays === 1) currentStreak++;
          else currentStreak = 1; 
        }
        lastWinDate = scoreDate;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0; 
        lastWinDate = scoreDate; // Mark the loss date to break future streaks
      }
    }

    // 5. Final check: Did they lose their streak today?
    if (lastWinDate) {
      const today = new Date().setHours(0, 0, 0, 0);
      const yesterday = today - 86400000;
      // If the last win wasn't today or yesterday, the streak is dead
      if (lastWinDate !== today && lastWinDate !== yesterday) {
        currentStreak = 0;
      }
    }

    const totalWins = Object.values(distribution).reduce((a, b) => a + b, 0);
    const winPercentage = totalPlayed === 0 ? 0 : Math.round((totalWins / totalPlayed) * 100);
    const averageTime = gamesWithTime > 0 ? Math.round(totalTime / gamesWithTime) : 0;

    // --- NEW: Calculate the most used word ---
    let favoriteWord: string | null = null;
    let maxCount = 0;
    for (const [word, count] of Object.entries(wordFrequencies)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteWord = word;
      }
    }

    return Response.json({ 
      totalPlayed, winPercentage, currentStreak, maxStreak, distribution, averageTime, favoriteWord 
    });

  } catch (error) {
    console.error("Profile API Error:", error);
    return Response.json({ error: 'Failed to load profile stats' }, { status: 500 });
  }
}