import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Extract the new time_taken field from the frontend payload
    const { username, status, guessesTaken, wordsGuessed, evaluations, time_taken } = body;

    // Connect to Neon Database (Make sure your neon import is correct)
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

    // 2. Update the SQL query to insert time_taken (as the 6th parameter)
    await sql`
      INSERT INTO wordle_scores (username, status, guesses_taken, words_guessed, evaluations, time_taken)
      VALUES (${username}, ${status}, ${guessesTaken}, ${JSON.stringify(wordsGuessed)}, ${JSON.stringify(evaluations)}, ${time_taken || null})
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Save Score Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save score' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}