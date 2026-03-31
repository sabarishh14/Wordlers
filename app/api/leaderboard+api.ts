import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);
    
    // 1. Grab the date from the URL (e.g., ?date=2023-10-25)
    const url = new URL(request.url);
    const dateQuery = url.searchParams.get('date');
    
    // 2. Default to local today if no date is provided
    let targetDate = dateQuery;
    if (!targetDate) {
      const d = new Date();
      targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // 3. Inject the target date into the SQL query
    // Fetch time_taken and use it to break ties!
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