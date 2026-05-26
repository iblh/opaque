import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { cookieMaxAge, jwt_sign } from '@/lib/auth';
import { createEmptyDashboard } from '@/lib/dashboard';

export async function POST(request: NextRequest) {
    try {
        const db = await getDb();
        const { identifier, email, username, password, name, expires_in } = await request.json();
        const login = (identifier || email || username || '').trim();
        const identity = login.includes('@')
            ? { email: login }
            : { username: login };

        // basic validation
        if (!login || !password) {
            return NextResponse.json(
                { error: 'email or username and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'password must be at least 6 characters' }, 
                { status: 400 }
            );
        }

        // check if the user already exists
        const existingUser = await db.collection('users').findOne({
            $or: [
                { email: login },
                { username: login },
            ],
        });
        if (existingUser) {
            return NextResponse.json(
                { error: 'account already exists' },
                { status: 409 }
            );
        }

        // hash the password
        const hash = await bcrypt.hash(password, 10);

        // create new user object
        const newUser = {
            ...identity,
            password: hash,
            name: name || login,
            createdAt: new Date(),
        };

        // add the user to the database
        await db.collection('users').insertOne(newUser);

        // create empty dashboard for the new user
        const dashboard = createEmptyDashboard({
            ...identity,
            name: newUser.name,
        });
        const { id, _id, ...dashboardDocument } = dashboard;
        const newDashboard = {
            ...dashboardDocument,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('dashboards').insertOne(newDashboard);

        // create JWT token for automatic login
        const payload = {
            ...identity,
            name: newUser.name,
        };
        const jwt_token = await jwt_sign(payload, expires_in || '3d');

        if (typeof jwt_token !== 'string') {
            return NextResponse.json({ error: 'failed to create token' }, { status: 500 });
        }

        const response = NextResponse.json(
            { success: true, message: 'account created successfully', jwt_token },
            { status: 201 }
        );

        response.cookies.set('jwt_token', jwt_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            path: '/',
            maxAge: cookieMaxAge(expires_in || '3d'),
        });

        // return success response with JWT token
        return response;
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'failed to create account' }, 
            { status: 500 }
        );
    }
} 
