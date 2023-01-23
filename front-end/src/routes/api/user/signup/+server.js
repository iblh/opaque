// @ts-nocheck
import bcrypt from 'bcrypt';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const db = await getDb();

    // get the request body
    const { username, password } = await request.json();

    // check if the user already exists
    const user = await db.collection('users').findOne({ username });
    if (user) {
        return json({ error: 'username already exists' }, { status: 409 });
    }

    // hash the password
    const hash = await bcrypt.hash(password, 10);

    // TODO: add the user to the database, finish the signup process
    
    // return Response with status: 200 and body: { bookmarks }
    return json({ success: "success" }, { status: 200 });
}
