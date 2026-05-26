import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwt_verify } from '@/lib/auth';
import { createEmptyDashboard, normalizeDashboard, serializeDashboard } from '@/lib/dashboard';
import { DashboardIdentity } from '@/lib/types';

export async function GET(request: NextRequest) {
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
        const dashboards = db.collection('dashboards');
        const rawDashboard = await dashboards.findOne(filter);

        if (!rawDashboard) {
            const dashboard = createEmptyDashboard(identity);
            const { id, _id, ...dashboardDocument } = dashboard;

            await dashboards.insertOne({
                ...dashboardDocument,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return NextResponse.json({ dashboard }, { status: 200 });
        }

        const dashboard = normalizeDashboard(rawDashboard as any, identity);

        if (!Array.isArray((rawDashboard as any).forest)) {
            await dashboards.updateOne(filter, {
                $set: {
                    forest: dashboard.forest,
                    updatedAt: new Date(),
                },
            });
        }

        return NextResponse.json({ dashboard: serializeDashboard(dashboard) }, { status: 200 });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json(
            { error: 'internal server error' },
            { status: 500 }
        );
    }
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
