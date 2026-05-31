import { NextRequest, NextResponse } from 'next/server';
import { saveDashboardForUser } from '@/lib/repositories/dashboard';
import { requireUserId } from '@/lib/session';

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dashboard = await saveDashboardForUser(userId, body.dashboard);

    if (!dashboard) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error) {
    console.error('Dashboard update error:', error);
    return NextResponse.json(
      { error: 'failed to update dashboard' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return PUT(request);
}
