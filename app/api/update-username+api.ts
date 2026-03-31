import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const { oldName, newName } = await request.json();
    
    if (!oldName || !newName) {
      return Response.json({ error: 'Missing names' }, { status: 400 });
    }

    const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

    // 1. Check if the new name is already taken by another player
    const existing = await sql`SELECT username FROM daily_scores WHERE username = ${newName} LIMIT 1`;
    if (existing.length > 0) {
      return Response.json({ error: 'That name is already taken!' }, { status: 409 });
    }

    // 2. Transfer all historical scores to the new name
    await sql`UPDATE daily_scores SET username = ${newName} WHERE username = ${oldName}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update Name Error:", error);
    return Response.json({ error: 'Failed to update name' }, { status: 500 });
  }
}