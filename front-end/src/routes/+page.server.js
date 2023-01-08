// @ts-nocheck
// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
import { redirect } from '@sveltejs/kit';

export const prerender = true;

export async function load({ fetch, params, cookies }) {
    const jwt_token = cookies.get('jwt_token');
    if (!jwt_token) {
        console.log('error: no jwt token');
        throw redirect(307, '/login');
    }

    // const res = await fetch(`/api/dashboard/fetch`);
    // const dashboard = await res.json();

    // return {
    //     dashboard,
    // };
}
