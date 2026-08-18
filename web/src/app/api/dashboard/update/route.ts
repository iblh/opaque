import { NextRequest, NextResponse } from 'next/server';
import {
  DashboardConflictError,
  saveDashboardForUser,
} from '@/lib/repositories/dashboard';
import { requireUserId } from '@/lib/session';
import {
  dashboardUpdateRequestSchema,
  formatSchemaIssues,
} from '@/lib/schemas/dashboard';

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = dashboardUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'invalid dashboard data',
          code: 'invalid_dashboard',
          issues: formatSchemaIssues(parsed.error),
        },
        { status: 400 },
      );
    }

    const dashboard = await saveDashboardForUser(userId, parsed.data.dashboard);

    if (!dashboard) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error) {
    if (error instanceof DashboardConflictError) {
      return NextResponse.json(
        {
          error: 'This dashboard changed elsewhere. Your draft is still open; reload before saving again.',
          code: 'dashboard_conflict',
        },
        { status: 409 },
      );
    }

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
