import { NextRequest, NextResponse } from 'next/server';
import { rotateServerAgentToken } from '@/lib/repositories/server-token';
import { requireUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const serverId = String(body.serverId || '').trim();
    const label = typeof body.label === 'string' ? body.label.trim() : undefined;

    if (!serverId) {
      return NextResponse.json({ error: 'serverId is required' }, { status: 400 });
    }

    const result = await rotateServerAgentToken({
      userId,
      branchId: serverId,
      label,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'server not found. Save the dashboard before rotating a token.' },
        { status: 404 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Server token rotate error:', error);
    return NextResponse.json({ error: 'failed to rotate token' }, { status: 500 });
  }
}
