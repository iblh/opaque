import { AuthError } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const { identifier, email, username, password } = await request.json();
    const login = identifier || email || username || '';

    if (!login || !password) {
      return NextResponse.json(
        { error: 'email or username and password are required' },
        { status: 400 },
      );
    }

    await signIn('credentials', {
      identifier: login,
      password,
      redirect: false,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: 'invalid email or password' },
        { status: 401 },
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 },
    );
  }
}
