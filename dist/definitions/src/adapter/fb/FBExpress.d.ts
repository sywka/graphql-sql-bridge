/// <reference types="express" />
import { Router } from "express";
import { IBlobID, ISchemaDetailOptions } from "./FBAdapter";
import { DBOptions, FBConnectionPool } from "./FBDatabase";
import FBGraphQLContext from "./FBGraphQLContext";
import Schema from "../../Schema";
import BaseRouter from "../../BaseRouter";
export interface FBExpressOptions extends ISchemaDetailOptions, DBOptions {
    graphiql?: boolean;
    maxConnectionPool?: number;
}
export default class FBExpress extends BaseRouter<FBExpressOptions> {
    static BLOBS_PATH: string;
    protected _routerUrl: string;
    protected _connectionPool: FBConnectionPool;
    protected _schema: Schema<FBGraphQLContext>;
    constructor(options: FBExpressOptions);
    protected _createSchema(options: FBExpressOptions): Schema<FBGraphQLContext>;
    protected _createBlobUrl(id: IBlobID): string;
    protected routes(router: Router, options: FBExpressOptions): void;
}
