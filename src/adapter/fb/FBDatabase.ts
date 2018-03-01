import path from "path";
import firebird from "node-firebird";

export type BlobField = (callback: (err: Error, name: string, event: IBlobEventEmitter) => void) => void;

export type DBOptions = firebird.Options;

export interface IBlobEventEmitter extends NodeJS.EventEmitter {
    pipe(destination: NodeJS.WritableStream): void;
}

export enum IsolationTypes {
    ISOLATION_READ_COMMITED_READ_ONLY,
    ISOLATION_SERIALIZABLE,
    ISOLATION_REPEATABLE_READ,
    ISOLATION_READ_COMMITED,
    ISOLATION_READ_UNCOMMITTED
}

export abstract class FBase<Source extends (firebird.Database | firebird.Transaction)> {

    protected _source: Source;

    protected constructor(source: Source) {
        this._source = source;
    }

    public static async blobToStream(blob: BlobField): Promise<IBlobEventEmitter> {
        return new Promise<any>((resolve, reject) => {
            blob((err, name, event) => {
                if (err) return reject(err);
                resolve(event);
            });
        });
    }

    public static async blobToBuffer(blob: BlobField): Promise<Buffer> {
        const blobStream = await FBase.blobToStream(blob);

        return new Promise<Buffer>((resolve, reject) => {
            let chunks = [], length = 0;
            blobStream.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
                length += chunk.length;
            });
            blobStream.on("end", () => {
                return resolve(Buffer.concat(chunks, length));
            });
        });
    }

    public async query(query: string, params?: any[]): Promise<any[]> {
        if (!this._source) throw new Error("Database need created");
        return new Promise<any[]>((resolve, reject) => {
            this._source.query(query, params, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    public async execute(query: string, params?: any[]): Promise<any[]> {
        if (!this._source) throw new Error("Database need created");
        return new Promise<any[]>((resolve, reject) => {
            this._source.execute(query, params, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
}

export class FBTransaction extends FBase<firebird.Transaction> {

    public isInTransaction(): boolean {
        return Boolean(this._source);
    }

    public async commit(): Promise<void> {
        if (!this._source) throw new Error("Transaction need created");
        return new Promise<void>((resolve, reject) => {
            this._source.commit((err) => {
                if (err) return reject(err);
                this._source = null;
                resolve();
            });
        });
    }

    public async rollback(): Promise<void> {
        if (!this._source) throw new Error("Transaction need created");
        return new Promise<void>((resolve, reject) => {
            this._source.rollback((err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }
}

export default class FBDatabase extends FBase<firebird.Database> {

    constructor();
    constructor(source: firebird.Database);
    constructor(source?: firebird.Database) {
        super(source);
    }

    public static escape(value: any): string {
        return firebird.escape(value);
    }

    public static bindOptions(options: DBOptions): DBOptions {
        return {
            ...options,
            database: path.resolve(process.cwd(), options.database)
        };
    }

    public isAttached(): boolean {
        return Boolean(this._source);
    }

    public async attachOrCreate(options: DBOptions): Promise<void> {
        if (this._source) throw new Error("Database already created");
        return new Promise<void>((resolve, reject) => {
            firebird.attachOrCreate(FBDatabase.bindOptions(options), (err, db) => {
                if (err) return reject(err);
                this._source = db;
                resolve();
            });
        });
    }

    public async attach(options: DBOptions): Promise<void> {
        if (this._source) throw new Error("Database already created");
        return new Promise<void>((resolve, reject) => {
            firebird.attach(FBDatabase.bindOptions(options), (err, db) => {
                if (err) return reject(err);
                this._source = db;
                resolve();
            });
        });
    }

    public async detach(): Promise<void> {
        if (!this._source) throw new Error("Database need created");
        return new Promise<void>((resolve, reject) => {
            this._source.detach((err) => {
                if (err) return reject(err);
                this._source = null;
                resolve();
            });
        });
    }

    public async transaction(isolation?: IsolationTypes): Promise<FBTransaction> {
        if (!this._source) throw new Error("Database need created");
        return new Promise<FBTransaction>((resolve, reject) => {
            this._source.transaction(firebird[IsolationTypes[isolation]], (err, transaction) => {
                err ? reject(err) : resolve(new FBTransaction(transaction));
            });
        });
    }

    public async sequentially(query: string, params: any[], rowCallback: firebird.SequentialCallback): Promise<void> {
        if (!this._source) throw new Error("Database need created");
        return new Promise<void>((resolve, reject) => {
            this._source.sequentially(query, params, rowCallback, (err) => {
                err ? reject(err) : resolve();
            });
        });
    }
}

export class FBConnectionPool {

    public static DEFAULT_MAX_POOL = 10;

    protected _connectionPool: firebird.ConnectionPool;

    public isConnectionPoolCreated(): boolean {
        return Boolean(this._connectionPool);
    }

    public createConnectionPool(options: DBOptions, max: number = FBConnectionPool.DEFAULT_MAX_POOL): void {
        if (this._connectionPool) throw new Error("Connection pool already created");
        this._connectionPool = firebird.pool(max, FBDatabase.bindOptions(options), null);
    }

    public destroyConnectionPool(): void {
        if (!this._connectionPool) throw new Error("Connection pool need created");
        this._connectionPool.destroy();
        this._connectionPool = null;
    }

    public async attach(): Promise<FBDatabase> {
        if (!this._connectionPool) throw new Error("Connection pool need created");
        return new Promise<FBDatabase>((resolve, reject) => {
            this._connectionPool.get((err, db) => {
                if (err) return reject(err);
                resolve(new FBDatabase(db));
            });
        });
    }
}