import { NextResponse } from 'next/server';

export async function GET() {
  const connString = process.env.POSTGRES_URL || 'NOT SET';
  const match = connString.match(/ep-[a-z0-9-]+/);
  const poolId = match ? match[0] : 'unknown';
  const branchMatch = connString.match(/branch=([^&]+)/);
  const branch = branchMatch ? branchMatch[1] : 'unknown';

  return NextResponse.json({
    poolId,
    branch,
    connStringPreview: connString.substring(0, 50) + '...'
  });
}
