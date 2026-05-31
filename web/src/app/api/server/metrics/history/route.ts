import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistoryForUser } from '@/lib/repositories/metrics';
import { requireUserId } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const serverId = request.nextUrl.searchParams.get('serverId') || '';
    const rangeParam = request.nextUrl.searchParams.get('range');
    const range = rangeParam === '7d' ? '7d' : '24h';

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const samples = await getMetricHistoryForUser({
      userId,
      branchId: serverId,
      range,
    });

    if (!samples) {
      return NextResponse.json({ error: 'server not found' }, { status: 404 });
    }

    return NextResponse.json({ samples }, { status: 200 });
  } catch (error) {
    console.error('Server metrics history error:', error);
    return NextResponse.json({ error: 'failed to fetch metrics history' }, { status: 500 });
  }
}
