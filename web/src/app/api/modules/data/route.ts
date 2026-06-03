import { NextRequest, NextResponse } from 'next/server';
import { isKnownModuleType } from '@/lib/modules';
import { ModuleDataError, fetchModuleData } from '@/lib/moduleProviders';
import { getOrCreateDashboardForUser } from '@/lib/repositories/dashboard';
import { requireUserId } from '@/lib/session';
import type { ModuleBranch } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const moduleId = request.nextUrl.searchParams.get('moduleId')?.trim() || '';
    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
    }

    const dashboard = await getOrCreateDashboardForUser(userId);
    const dashboardModule = dashboard?.forest
      .flatMap((tree) => tree.branches)
      .find((branch): branch is ModuleBranch => (
        branch.id === moduleId
        && 'moduleType' in branch
        && isKnownModuleType(branch.moduleType)
      ));

    if (!dashboardModule) {
      return NextResponse.json({ error: 'module not found' }, { status: 404 });
    }

    const data = await fetchModuleData(dashboardModule, {
      month: request.nextUrl.searchParams.get('month')?.trim() || undefined,
    });
    return NextResponse.json(
      {
        data,
        fetchedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof ModuleDataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Module data error:', error);
    return NextResponse.json({ error: 'failed to load module data' }, { status: 500 });
  }
}
