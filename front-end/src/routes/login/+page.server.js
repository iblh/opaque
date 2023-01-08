// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import { jwt_verify } from '$lib/hooks/auth';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    const jwt_token = cookies.get('jwt_token');
    const decoded = await jwt_verify({ jwt_token });

    // already logged in
    if (decoded.username) {
        throw redirect(307, '/');
    }
}
