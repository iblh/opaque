import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { jwt_sign } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const db = await getDb();
        const { username, password, expires_in } = await request.json();

        // get the user from the database
        const user = await db.collection('users').findOne({ username });

        // if the user doesn't exist, return an error
        if (!user) {
            return NextResponse.json(
                { error: 'invalid username or password' }, 
                { status: 401 }
            );
        }

        // compare the password with the hash stored in the database
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return NextResponse.json(
                { error: 'invalid username or password' }, 
                { status: 401 }
            );
        }

        const payload = { username: user.username };
        const jwt_token = await jwt_sign(payload, expires_in || '3d');

        return NextResponse.json({ jwt_token }, { status: 200 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'internal server error' }, 
            { status: 500 }
        );
    }
} 