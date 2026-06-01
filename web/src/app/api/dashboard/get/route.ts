import { NextResponse } from 'next/server';
import { getOrCreateDashboardForUser } from '@/lib/repositories/dashboard';
import { requireUserId } from '@/lib/session';

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const dashboard = await getOrCreateDashboardForUser(userId);
    if (!dashboard) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 },
    );
  }
}
