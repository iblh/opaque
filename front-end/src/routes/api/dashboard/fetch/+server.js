// @ts-nocheck
import { json } from '@sveltejs/kit';

import { getDb } from '$lib/db';

// import { appConfig } from "$lib/config.js";

export async function GET() {
    const db = await getDb();

    // query the database
    const dashboard = await db.collection('dashboard').find().toArray();
    let temp_content = dashboard[0].content;

    // return Response with status: 200 and body: { bookmarks }
    return json({ temp_content }, { status: 200 });
}