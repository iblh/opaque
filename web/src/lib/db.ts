import { Db, MongoClient } from 'mongodb';

let _db: Db | null = null;

const connectDb = async (): Promise<Db> => {
    try {
        const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
        await client.connect();
        _db = client.db('opaque');
        return _db;
    } catch (e) {
        throw e;
    }
};

export const getDb = async (): Promise<Db> => {
    if (_db) {
        return _db;
    } else {
        _db = await connectDb();
        return _db;
    }
}; 