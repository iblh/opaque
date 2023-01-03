import os
import json
import time
import datetime
import requests
from flask_cors import CORS
from pymongo import MongoClient
from bson.json_util import dumps
from flask import Flask, request, jsonify, render_template, url_for


app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})


# Connect to MongoDB
client = MongoClient('mongodb://10.7.7.77:27017/')
db = client['opaque']


@app.route('/api/tmdb/stats', methods=['GET'])
def stats():
    # get count of all documents in tmdb collection
    tmdb_count = db.tmdb.count_documents({})

    # get count of all documents in not_tmdb_id collection
    tmdb_null_id_count = db.tmdb_null_id.count_documents({})

    # get latest tmdb id from tmdb collection, retrive id
    latest_tmdb = db.tmdb.find_one(sort=[("id", -1)])
    latest_tmdb_valid_id = latest_tmdb['id']

    last_tmdb_null = db.tmdb_null_id.find_one(sort=[("tmdb_id", -1)])
    latest_tmdb_null_id = last_tmdb_null['tmdb_id']

    # find latest updated_at
    # print(type(latest_tmdb['updated_at']), type(last_tmdb_null['updated_at']))
    # last_tmdb_null = db.tmdb_null_id.find_one(sort=[("updated_at", -1)])
    last_tmdb_updated_at = latest_tmdb['updated_at']
    last_tmdb_null_updated_at = last_tmdb_null['updated_at']
    if (last_tmdb_updated_at < last_tmdb_null_updated_at):
        last_tmdb_updated_at = last_tmdb_null_updated_at

    # UTC to local time
    last_tmdb_updated_at = last_tmdb_updated_at.replace(
        tzinfo=datetime.timezone.utc).astimezone(tz=None)

    # datetime to string
    last_tmdb_updated_at = last_tmdb_updated_at.strftime("%Y-%m-%d %H:%M:%S")

    return json.loads(dumps({
        "tmdb": {
            "count": tmdb_count,
            "null_id_count": tmdb_null_id_count,
            "latest_valid_id": latest_tmdb_valid_id,
            "latest_null_id": latest_tmdb_null_id,
            "updated_at": last_tmdb_updated_at
        }
    }))


@app.route('/api/tmdb/insert', methods=['POST'])
def insert_movie():
    # get parameters from body
    data = request.get_json()
    data['created_at'] = datetime.datetime.utcnow()
    data['updated_at'] = datetime.datetime.utcnow()

    # check if movie exists in tmdb collection
    movie = db.tmdb.find_one({"id": data['id']})
    if (movie is not None):
        # return error message
        return json.loads(dumps({
            "success": False,
            "error": "movie already exists in tmdb collection"
        }))
    else:
        db.tmdb.insert_one(data)
        return json.loads(dumps({
            "tmdb_id": data['id'],
            "success": True
        }))


@app.route('/api/tmdb/null_id', methods=['POST'])
def insert_null_id():
    # get parameters from body
    data = request.get_json()
    data['created_at'] = datetime.datetime.utcnow()
    data['updated_at'] = datetime.datetime.utcnow()

    # check if null id exists in tmdb_null_id collection
    null_id = db.tmdb_null_id.find_one({"tmdb_id": data['tmdb_id']})
    if (null_id is not None):
        # update updated_at
        db.tmdb_null_id.update_one(
            {"tmdb_id": data['tmdb_id']}, {"$set": {"updated_at": datetime.datetime.utcnow()}})

        # return error message
        return json.loads(dumps({
            "success": False,
            "error": "null id already exists in tmdb_null_id collection"
        }))
    else:
        db.tmdb_null_id.insert_one(data)
        return json.loads(dumps({
            "null_id": data['tmdb_id'],
            "success": True
        }))


@app.route('/api/tmdb/check_null/<int:check_amount>', methods=['GET'])
def check_null(check_amount):
    #  get null ids from tmdb_null_id collection, sort by tmdb_id asc, limit check_amount
    null_ids = db.tmdb_null_id.find(
        {}, {"_id": 0, "tmdb_id": 1}).sort("tmdb_id", 1).limit(check_amount)

    # null_ids = json.loads(dumps(null_ids))

    return json.loads(dumps(null_ids))


@app.route('/api/tmdb/insert2', methods=['POST'])
def insert_movie_2():
    # get parameters from body
    fro = int(request.json['from'])
    to = int(request.json['to'])

    base = 'https://api.themoviedb.org/3/movie/'
    api_key = '?api_key=4008009ac1093b228b3fb3f2905dad2c'
    language = '&language=en-US'

    for movieID in range(fro, to):
        url = base + str(movieID) + api_key + language

        # if requests times out, try again
        j = 0
        while j < 10:
            try:
                response = requests.get(url)

                if response.status_code == 200:
                    db.movies.insert_one(response.json())
                    # print(response.json())
                else:
                    # print('Error:', response.status_code)
                    db.not_in_movies.insert_one({
                        'tmdb_id': int(movieID),
                        'created_at': datetime.datetime.utcnow(),
                        'updated_at': datetime.datetime.utcnow()
                    })
                return

            except requests.ConnectionError:
                print('Connection Error')
                j += 1
                sleep_time = (j+1) * 9
                time.sleep(sleep_time)
                continue

        time.sleep(0.3)
    return({'from': fro, 'to': to})


app.run(host='0.0.0.0', port=6688)
