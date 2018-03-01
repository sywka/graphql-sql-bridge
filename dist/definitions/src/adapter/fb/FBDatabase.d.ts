/// <reference types="node" />
import firebird from "node-firebird";
export declare type BlobField = (callback: (err: Error, name: string, event: IBlobEventEmitter) => void) => void;
export declare type DBOptions = firebird.Options;
export interface IBlobEventEmitter extends NodeJS.EventEmitter {
    pipe(destination: NodeJS.WritableStream): void;
}
export declare enum IsolationTypes {
    ISOLATION_READ_COMMITED_READ_ONLY = 0,
    ISOLATION_SERIALIZABLE = 1,
    ISOLATION_REPEATABLE_READ = 2,
    ISOLATION_READ_COMMITED = 3,
    ISOLATION_READ_UNCOMMITTED = 4,
}
export declare abstract class FBase<Source extends (firebird.Database | firebird.Transaction)> {
    protected _source: Source;
    protected constructor(source: Source);
    static blobToStream(blob: BlobField): Promise<IBlobEventEmitter>;
    static blobToBuffer(blob: BlobField): Promise<Buffer>;
    query(query: string, params?: any[]): Promise<any[]>;
    execute(query: string, params?: any[]): Promise<any[]>;
}
export declare class FBTransaction extends FBase<firebird.Transaction> {
    isInTransaction(): boolean;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export default class FBDatabase extends FBase<firebird.Database> {
    constructor();
    constructor(source: firebird.Database);
    static escape(value: any): string;
    static bindOptions(options: DBOptions): DBOptions;
    isAttached(): boolean;
    attachOrCreate(options: DBOptions): Promise<void>;
    attach(options: DBOptions): Promise<void>;
    detach(): Promise<void>;
    transaction(isolation?: IsolationTypes): Promise<FBTransaction>;
    sequentially(query: string, params: any[], rowCallback: firebird.SequentialCallback): Promise<void>;
}
export declare class FBConnectionPool {
    static DEFAULT_MAX_POOL: number;
    protected _connectionPool: firebird.ConnectionPool;
    isConnectionPoolCreated(): boolean;
    createConnectionPool(options: DBOptions, max?: number): void;
    destroyConnectionPool(): void;
    attach(): Promise<FBDatabase>;
}
