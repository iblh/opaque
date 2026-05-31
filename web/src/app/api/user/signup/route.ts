import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { createCredentialsUser } from '@/lib/repositories/user';

export async function POST(request: NextRequest) {
  try {
    const { identifier, email, username, password, name } = await request.json();
    const login = identifier || email || username || '';

    const result = await createCredentialsUser({
      identifier: login,
      password,
      name,
    });

    if ('error' in result) {
      const status = result.error === 'account already exists' ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await signIn('credentials', {
      identifier: login,
      password,
      redirect: false,
    });

    return NextResponse.json(
      { success: true, message: 'account created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'failed to create account' },
      { status: 500 },
    );
  }
}
