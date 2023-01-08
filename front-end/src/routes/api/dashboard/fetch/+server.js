// @ts-nocheck
import { json } from '@sveltejs/kit';

import { getDb } from '$lib/db';
import { jwt_verify } from '$lib/hooks/auth';

// import { appConfig } from "$lib/config.js";

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    const db = await getDb();

    // get Authorization header
    const { headers } = request;
    const authorization = headers.get('Authorization');
    const jwt_token = authorization.split(' ')[1];

    const decoded = await jwt_verify({ jwt_token });

    if (decoded.error) {
        return json({ error: 'invalid token' }, { status: 401 });
    } else {
        const username = decoded.username;
        // find dashboard by username
        const dashboard = await db.collection('dashboard').findOne({ username });
        const content = dashboard.content;
        return json({ content }, { status: 200 });
    }
}
