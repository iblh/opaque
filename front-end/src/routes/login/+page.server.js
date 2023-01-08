// @ts-nocheck
/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    const user = cookies.get('jwt_token');
    console.log('cookies:', user);
    return { user };
}