import { NextRequest, NextResponse } from 'next/server';
import { updateUserName } from '@/lib/repositories/user';
import { requireUserId } from '@/lib/session';

// Update the authenticated user's display name. Email/username are immutable here.
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const result = await updateUserName(userId, body.name);
    if ('error' in result) {
      const status = result.error === 'user not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ name: result.user.name }, { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'failed to update profile' }, { status: 500 });
  }
}
