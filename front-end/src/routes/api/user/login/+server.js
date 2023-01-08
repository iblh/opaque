// @ts-nocheck
import bcrypt from 'bcrypt';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { jwt_sign } from '$lib/hooks/auth';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const db = await getDb();

    // get the request body
    const { username, password, expires_in } = await request.json();

    // get the user from the database
    const user = await db.collection('users').findOne({ username });

    // if the user doesn't exist, return an error
    if (!user) {
        return json({ error: 'invalid username or password' }, { status: 401 });
    }

    // compare the password with the hash stored in the database
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return json({ error: 'invalid username or password' }, { status: 401 });
    }

    const payload = { username: user.username };

    const jwt_token = await jwt_sign(payload, '1d');

    // return Response with status: 200 and body: { bookmarks }
    return json({ jwt_token }, { status: 200 });
}
