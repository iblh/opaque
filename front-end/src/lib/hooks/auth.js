// @ts-nocheck
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { JWT_SECRET } from '$env/static/private';

async function jwt_verify({ jwt_token }) {
    try {
        const decoded = jwt.verify(jwt_token, JWT_SECRET);
        return decoded;
    } catch (e) {
        return { error: 'invalid token' };
    }
}

async function jwt_sign(payload, expires_in) {
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: expires_in,
        });
        return token;
    } catch (e) {
        return { error: 'signing error' };
    }
}

export { jwt_verify, jwt_sign };
