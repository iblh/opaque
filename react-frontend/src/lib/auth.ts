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
        // Cast expires_in to a proper type that SignOptions accepts
        const options: SignOptions = { expiresIn: expires_in as number };
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