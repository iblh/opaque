// @ts-nocheck
import { json } from '@sveltejs/kit';

import { getDb } from '$lib/db';

// import { appConfig } from "$lib/config.js";

export async function GET() {
    const db = await getDb();

    // query the database
    const bookmarks = await db.collection('bookmarks').find().toArray();

    // return Response with status: 200 and body: { bookmarks }
    return json({ bookmarks }, { status: 200 });
}
