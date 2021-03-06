"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const node_firebird_1 = __importDefault(require("node-firebird"));
var IsolationTypes;
(function (IsolationTypes) {
    IsolationTypes[IsolationTypes["ISOLATION_READ_COMMITED_READ_ONLY"] = 0] = "ISOLATION_READ_COMMITED_READ_ONLY";
    IsolationTypes[IsolationTypes["ISOLATION_SERIALIZABLE"] = 1] = "ISOLATION_SERIALIZABLE";
    IsolationTypes[IsolationTypes["ISOLATION_REPEATABLE_READ"] = 2] = "ISOLATION_REPEATABLE_READ";
    IsolationTypes[IsolationTypes["ISOLATION_READ_COMMITED"] = 3] = "ISOLATION_READ_COMMITED";
    IsolationTypes[IsolationTypes["ISOLATION_READ_UNCOMMITTED"] = 4] = "ISOLATION_READ_UNCOMMITTED";
})(IsolationTypes = exports.IsolationTypes || (exports.IsolationTypes = {}));
class FBase {
    constructor(source) {
        this._source = source;
    }
    static async blobToStream(blob) {
        return new Promise((resolve, reject) => {
            blob((err, name, event) => {
                if (err)
                    return reject(err);
                resolve(event);
            });
        });
    }
    static async blobToBuffer(blob) {
        const blobStream = await FBase.blobToStream(blob);
        return new Promise((resolve, reject) => {
            let chunks = [], length = 0;
            blobStream.on("data", (chunk) => {
                chunks.push(chunk);
                length += chunk.length;
            });
            blobStream.on("end", () => {
                return resolve(Buffer.concat(chunks, length));
            });
        });
    }
    async query(query, params) {
        if (!this._source)
            throw new Error("Database need created");
        return new Promise((resolve, reject) => {
            this._source.query(query, params, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
    async execute(query, params) {
        if (!this._source)
            throw new Error("Database need created");
        return new Promise((resolve, reject) => {
            this._source.execute(query, params, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
}
exports.FBase = FBase;
class FBTransaction extends FBase {
    isInTransaction() {
        return Boolean(this._source);
    }
    async commit() {
        if (!this._source)
            throw new Error("Transaction need created");
        return new Promise((resolve, reject) => {
            this._source.commit((err) => {
                if (err)
                    return reject(err);
                this._source = null;
                resolve();
            });
        });
    }
    async rollback() {
        if (!this._source)
            throw new Error("Transaction need created");
        return new Promise((resolve, reject) => {
            this._source.rollback((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}
exports.FBTransaction = FBTransaction;
class FBDatabase extends FBase {
    constructor(source) {
        super(source);
    }
    static async executeDatabase(source, callback) {
        let database;
        try {
            if (source instanceof FBConnectionPool) {
                database = await source.attach();
            }
            else {
                database = new FBDatabase();
                await database.attach(source);
            }
            return await callback(database);
        }
        finally {
            if (database && database.isAttached()) {
                try {
                    await database.detach();
                }
                catch (error) {
                    console.warn(error);
                }
            }
        }
    }
    static async executeTransaction(source, callback, isolation) {
        return await FBDatabase.executeDatabase(source, async (database) => {
            return await database.executeTransaction(callback, isolation);
        });
    }
    static escape(value) {
        return node_firebird_1.default.escape(value);
    }
    static bindOptions(options) {
        return Object.assign({}, options, { database: path_1.default.resolve(process.cwd(), options.database) });
    }
    isAttached() {
        return Boolean(this._source);
    }
    async attachOrCreate(options) {
        if (this._source)
            throw new Error("Database already created");
        return new Promise((resolve, reject) => {
            node_firebird_1.default.attachOrCreate(FBDatabase.bindOptions(options), (err, db) => {
                if (err)
                    return reject(err);
                this._source = db;
                resolve();
            });
        });
    }
    async attach(options) {
        if (this._source)
            throw new Error("Database already created");
        return new Promise((resolve, reject) => {
            node_firebird_1.default.attach(FBDatabase.bindOptions(options), (err, db) => {
                if (err)
                    return reject(err);
                this._source = db;
                resolve();
            });
        });
    }
    async detach() {
        if (!this._source)
            throw new Error("Database need created");
        return new Promise((resolve, reject) => {
            this._source.detach((err) => {
                if (err)
                    return reject(err);
                this._source = null;
                resolve();
            });
        });
    }
    async transaction(isolation) {
        if (!this._source)
            throw new Error("Database need created");
        return new Promise((resolve, reject) => {
            this._source.transaction(node_firebird_1.default[IsolationTypes[isolation]], (err, transaction) => {
                err ? reject(err) : resolve(new FBTransaction(transaction));
            });
        });
    }
    async sequentially(query, params, rowCallback) {
        if (!this._source)
            throw new Error("Database need created");
        return new Promise((resolve, reject) => {
            this._source.sequentially(query, params, rowCallback, (err) => {
                err ? reject(err) : resolve();
            });
        });
    }
    async executeTransaction(callback, isolation) {
        let transaction;
        try {
            transaction = await this.transaction(isolation);
            const result = await callback(transaction);
            await transaction.commit();
            return result;
        }
        catch (error) {
            if (transaction && transaction.isInTransaction()) {
                try {
                    await transaction.rollback();
                }
                catch (error) {
                    console.warn(error);
                }
            }
            throw error;
        }
    }
}
exports.default = FBDatabase;
class FBConnectionPool {
    isConnectionPoolCreated() {
        return Boolean(this._connectionPool);
    }
    createConnectionPool(options, max = FBConnectionPool.DEFAULT_MAX_POOL) {
        if (this._connectionPool)
            throw new Error("Connection pool already created");
        this._connectionPool = node_firebird_1.default.pool(max, FBDatabase.bindOptions(options), null);
    }
    destroyConnectionPool() {
        if (!this._connectionPool)
            throw new Error("Connection pool need created");
        this._connectionPool.destroy();
        this._connectionPool = null;
    }
    async attach() {
        if (!this._connectionPool)
            throw new Error("Connection pool need created");
        return new Promise((resolve, reject) => {
            this._connectionPool.get((err, db) => {
                if (err)
                    return reject(err);
                resolve(new FBDatabase(db));
            });
        });
    }
}
FBConnectionPool.DEFAULT_MAX_POOL = 10;
exports.FBConnectionPool = FBConnectionPool;
//# sourceMappingURL=FBDatabase.js.map