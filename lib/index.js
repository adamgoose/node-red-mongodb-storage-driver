var when = require('when');
const assert = require('assert');
var MongoClient = require('mongodb').MongoClient;

module.exports = {
  _db: null,
  init (settings) {
    return when.promise((resolve, reject) => {
      MongoClient.connect(settings.mongoUrl, (err, client) => {
        if (err != null) {
          reject(err);
        }
        console.log("Connected successfully to server");

        let _db = client.db('red');
        this._db = _db;

        when.all(
          _db.createCollection('flows'),
          // _db.collection('flows').updateOne({ _v: 1 }, { foo: 'bar' }, { upsert: true }),
          _db.createCollection('credentials'),
          // _db.collection('credentials').updateOne({ _v: 1 }, { foo: 'bar' }, { upsert: true }),
          _db.createCollection('sessions'),
          _db.createCollection('settings'),
          _db.createCollection('libraryEntries'),
          _db.createCollection('versions'),
        ).then(resolve)
      });
    });
  },
  async getVersion (type) {
    let v = await this._db.collection('versions').findOne({ type })

    return v ? v.version : 0
  },
  setVersion (type, version) {
    return this._db.collection('versions').updateOne(
      { type }, { $set: { type, version } }, { upsert: true }
    )
  },
  async getFlows () {
    let flows = await this._db.collection('flows').find(
      { _v: await this.getVersion('flows') }, { _v: 0, _id: 0 }
    ).toArray()

    return when.resolve(flows)
  },
  async saveFlows (flows) {
    let promises = []
    let version = await this.getVersion('flows') + 1

    for (var flow of flows) {
      promises.push(
        this._db.collection('flows').updateOne(
          { _v: version, id: flow.id }, { $set: flow }, { upsert: true }
        )
      )
    }
    promises.push(this.setVersion('flows', version))
    return when.all(promises)
  },
  async getCredentials () {
    let credentials = await this._db.collection('credentials').findOne(
      { _v: await this.getVersion('credentials') }, { _v: 0, _id: 0 }
    )

    return credentials || {};
  },
  async saveCredentials (credentials) {
    let version = await this.getVersion('credentials') + 1
    await this._db.collection('credentials').updateOne(
      { _v: version }, { $set: credentials }, { upsert: true }
    )
    return this.setVersion('credentials', version)
  },
  async getSettings () {
    let settings = await this._db.collection('settings').findOne(
      { _v: await this.getVersion('settings') }, { _v: 0, _id: 0 }
    )

    return when.resolve(settings || {})
  },
  async saveSettings (settings) {
    let version = await this.getVersion('settings') + 1
    await this._db.collection('settings').updateOne(
      { _v: version }, { $set: settings }, { upsert: true }
    )

    return this.setVersion('settings', version)
  },
  getSessions () {
    return this._db.collection('sessions').findOne(
      { _v: 1 }, { _v: 0, _id: 0 }
    )
  },
  saveSessions (sessions) {
    return this._db.collection('sessions').updateOne(
      { _v: 1 }, { $set: sessions }, { upsert: true }
    )
  },
  async getLibraryEntry (type, name) {
    let entry = await this._db.collection('libraryEntries').findOne(
      { type, name }
    )

    return entry || {}
  },
  saveLibraryEntry (type, name, meta, body) {
    return this._db.collection('libraryEntries').updateOne(
      { type, name }, { meta, body }, { upsert: true }
    )
  },
}