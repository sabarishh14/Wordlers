import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();
    
    if (!username || !pin) {
      return Response.json({ error: 'Name and PIN required' }, { status: 400 });
    }

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

    // Check if player exists
    const existing = await sql`SELECT pin FROM players WHERE username = ${username} LIMIT 1`;

    if (existing.length > 0) {
      // Player exists: Verify PIN
      if (existing[0].pin === pin) {
        return Response.json({ success: true, message: 'Welcome back!' });
      } else {
        return Response.json({ error: 'Wrong PIN!' }, { status: 401 });
      }
    } else {
      // New Player: Register them
      await sql`INSERT INTO players (username, pin) VALUES (${username}, ${pin})`;
      return Response.json({ success: true, message: 'Account created!' });
    }

  } catch (error) {
    console.error("Auth Error:", error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}