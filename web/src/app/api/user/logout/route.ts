import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const response = NextResponse.json({ success: true }, { status: 200 });
        response.cookies.set('jwt_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            path: '/',
            expires: new Date(0),
        });

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'internal server error' },
            { status: 500 }
        );
    }
} 