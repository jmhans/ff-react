import { NextRequest, NextResponse } from 'next/server';
import { YahooSyncService } from '@/app/lib/yahoo/sync-service';

type SyncBody = {
  season: number;
  week: number;
  leagueKeys: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncBody;

    if (!body?.season || !body?.week || !Array.isArray(body?.leagueKeys) || body.leagueKeys.length === 0) {
      return NextResponse.json(
        { error: 'season, week, and non-empty leagueKeys are required.' },
        { status: 400 },
      );
    }

    const service = new YahooSyncService();
    const result = await service.syncWeek(body);

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sync Yahoo data.', details: String(error) },
      { status: 500 },
    );
  }
}
