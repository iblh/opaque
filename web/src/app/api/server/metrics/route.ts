import { NextRequest, NextResponse } from 'next/server';
import {
  getLatestMetricsForUser,
  recordMetricsWithAgentToken,
} from '@/lib/repositories/metrics';
import { requireUserId } from '@/lib/session';

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const servers = await getLatestMetricsForUser(userId);
    return NextResponse.json({ servers }, { status: 200 });
  } catch (error) {
    console.error('Server metrics fetch error:', error);
    return NextResponse.json({ error: 'failed to fetch metrics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request) || request.headers.get('x-server-token') || '';
    const body = await request.json();
    const serverId = String(body.serverId || '').trim();

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const result = await recordMetricsWithAgentToken({
      branchId: serverId,
      agentToken: token,
      input: body.stats || body,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, stats: result.stats }, { status: 200 });
  } catch (error) {
    console.error('Server metrics ingest error:', error);
    return NextResponse.json({ error: 'failed to ingest metrics' }, { status: 500 });
  }
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
