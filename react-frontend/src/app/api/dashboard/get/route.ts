import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwt_verify } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const db = await getDb();

        // get Authorization header
        const authorization = request.headers.get('Authorization');
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'invalid token' }, { status: 401 });
        }

        const jwt_token = authorization.split(' ')[1];
        const decoded = await jwt_verify({ jwt_token });

        if ((decoded as any).error) {
            return NextResponse.json({ error: 'invalid token' }, { status: 401 });
        } else {
            const email = (decoded as any).email;
            // find dashboard by email
            const dashboard = await db.collection('dashboards').findOne({ email });

            return NextResponse.json({ dashboard }, { status: 200 });
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json(
            { error: 'internal server error' }, 
            { status: 500 }
        );
    }
} 