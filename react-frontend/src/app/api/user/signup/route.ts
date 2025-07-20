import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { jwt_sign } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const db = await getDb();
        const { email, password, name, expires_in } = await request.json();

        // basic validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'email and password are required' }, 
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
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: 'email already exists' }, 
                { status: 409 }
            );
        }

        // hash the password
        const hash = await bcrypt.hash(password, 10);

        // create new user object
        const newUser = {
            email,
            password: hash,
            name: name || email,
            createdAt: new Date(),
        };

        // add the user to the database
        await db.collection('users').insertOne(newUser);

        // create empty dashboard for the new user
        const newDashboard = {
            email,
            branches: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('dashboards').insertOne(newDashboard);

        // create JWT token for automatic login
        const payload = { email };
        const jwt_token = await jwt_sign(payload, expires_in || '3d');

        // return success response with JWT token
        return NextResponse.json(
            { jwt_token, message: 'account created successfully' }, 
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'failed to create account' }, 
            { status: 500 }
        );
    }
} 