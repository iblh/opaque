import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwt_verify } from '@/lib/auth';
import { normalizeDashboard, serializeDashboard } from '@/lib/dashboard';
import { DashboardIdentity } from '@/lib/types';

export async function PUT(request: NextRequest) {
  try {
    const jwt_token = request.cookies.get('jwt_token')?.value;

    if (!jwt_token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const decoded = await jwt_verify({ jwt_token });
    if ((decoded as any).error) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const identity = identityFromDecoded(decoded);
    const filter = identityFilter(identity);

    if (!filter) {
      return NextResponse.json({ error: 'invalid token payload' }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();
    const dashboard = normalizeDashboard(body.dashboard, identity);
    const now = new Date();

    await db.collection('dashboards').updateOne(
      filter,
      {
        $set: {
          ...identity,
          forest: dashboard.forest,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json(
      {
        dashboard: serializeDashboard({
          ...dashboard,
          ...identity,
          updatedAt: now,
        }),
      },
      { status: 200 },
    );
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

function identityFromDecoded(decoded: unknown): DashboardIdentity {
  return {
    email: typeof (decoded as any).email === 'string' ? (decoded as any).email : undefined,
    username: typeof (decoded as any).username === 'string' ? (decoded as any).username : undefined,
    name: typeof (decoded as any).name === 'string' ? (decoded as any).name : undefined,
  };
}

function identityFilter(identity: DashboardIdentity) {
  const filters = [];

  if (identity.email) filters.push({ email: identity.email });
  if (identity.username) filters.push({ username: identity.username });

  if (filters.length === 0) return null;
  return filters.length === 1 ? filters[0] : { $or: filters };
}
