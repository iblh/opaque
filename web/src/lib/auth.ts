import jwt, { SignOptions } from 'jsonwebtoken';

export async function jwt_verify({ jwt_token }: { jwt_token: string }) {
    try {
        const decoded = jwt.verify(jwt_token, process.env.JWT_SECRET || 'your-secret-key-here');
        return decoded;
    } catch (e) {
        return { error: 'invalid token' };
    }
}

export async function jwt_sign(payload: object, expires_in: string | number) {
    try {
        const options: SignOptions = { expiresIn: expires_in as SignOptions['expiresIn'] };
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'your-secret-key-here',
            options
        );
        return token;
    } catch (e) {
        return { error: 'signing error' };
    }
} 

export function cookieMaxAge(expiresIn: string | number) {
    if (typeof expiresIn === 'number') return expiresIn;

    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) return 3 * 24 * 60 * 60;

    const value = Number(match[1]);
    const unit = match[2];

    if (unit === 'd') return value * 24 * 60 * 60;
    if (unit === 'h') return value * 60 * 60;
    if (unit === 'm') return value * 60;
    return value;
}
