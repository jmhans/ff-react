import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

type LeagueInput = {
  season: number;
  yahooLeagueKey: string;
  displayName?: string;
  includeInPool?: boolean;
};

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, season, yahoo_league_key, display_name, include_in_pool, created_at, updated_at
      FROM ff_leagues
      ORDER BY season DESC, created_at DESC
    `;

    return NextResponse.json({ leagues: rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to list leagues. Run schema migration for ff_leagues first.',
        details: String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeagueInput;

    if (!body?.season || !body?.yahooLeagueKey) {
      return NextResponse.json(
        { error: 'season and yahooLeagueKey are required.' },
        { status: 400 },
      );
    }

    const includeInPool = body.includeInPool ?? true;

    const { rows } = await sql`
      INSERT INTO ff_leagues (season, yahoo_league_key, display_name, include_in_pool)
      VALUES (${body.season}, ${body.yahooLeagueKey}, ${body.displayName ?? null}, ${includeInPool})
      RETURNING id, season, yahoo_league_key, display_name, include_in_pool, created_at, updated_at
    `;

    return NextResponse.json({ league: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to create league. Check unique constraints and migration state.',
        details: String(error),
      },
      { status: 500 },
    );
  }
}
