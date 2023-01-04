// @ts-nocheck
import { Db, MongoClient } from 'mongodb';
import { MONGO_URL } from '$env/static/private';

/**
 * @type {Db}
 */
let _db;

const connectDb = async () => {
    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        _db = client.db('opaque');
        return _db;
    } catch (e) {
        return e;
    }
};

const getDb = async () => {
    //this returns database instance
    if (_db) {
        return _db;
    } else {
        _db = await connectDb();
        return _db;
    }
};

export { connectDb, getDb };
