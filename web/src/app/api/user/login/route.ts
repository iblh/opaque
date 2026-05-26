import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { cookieMaxAge, jwt_sign } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const db = await getDb();
        const { identifier, email, username, password, expires_in } = await request.json();
        const login = (identifier || email || username || '').trim();

        if (!login || !password) {
            return NextResponse.json(
                { error: 'email or username and password are required' },
                { status: 400 }
            );
        }

        // get the user from the database
        const user = await db.collection('users').findOne({
            $or: [
                { email: login },
                { username: login },
            ],
        });

        // if the user doesn't exist, return an error
        if (!user) {
            return NextResponse.json(
                { error: 'invalid email or password' },
                { status: 401 }
            );
        }

        // compare the password with the hash stored in the database
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return NextResponse.json(
                { error: 'invalid email or password' },
                { status: 401 }
            );
        }

        const maxAge = cookieMaxAge(expires_in || '3d');
        const payload = {
            email: user.email,
            username: user.username,
            name: user.name || user.username || user.email,
        };
        const jwt_token = await jwt_sign(payload, expires_in || '3d');

        if (typeof jwt_token !== 'string') {
            return NextResponse.json({ error: 'failed to create token' }, { status: 500 });
        }

        const response = NextResponse.json({ jwt_token }, { status: 200 });

        response.cookies.set('jwt_token', jwt_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            path: '/',
            maxAge,
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'internal server error' },
            { status: 500 }
        );
    }
} 
