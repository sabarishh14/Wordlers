import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { username, status, guessesTaken, wordsGuessed, evaluations, time_taken, played_date } = body;

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

    await sql`
      INSERT INTO daily_scores (username, status, guesses_taken, words_guessed, evaluations, time_taken, played_date)
      VALUES (
        ${username}, 
        ${status}, 
        ${guessesTaken}, 
        ${wordsGuessed || null}, 
        ${evaluations ? JSON.stringify(evaluations) : null}::jsonb,
        ${time_taken || 0},
        COALESCE(${played_date}::date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
      )
      ON CONFLICT (username, played_date) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        guesses_taken = EXCLUDED.guesses_taken,
        words_guessed = EXCLUDED.words_guessed,
        evaluations = EXCLUDED.evaluations,
        time_taken = EXCLUDED.time_taken;
    `;

    // Modern edge-friendly response
    return new Response(JSON.stringify({ success: true, message: "Score saved!" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}