/// <reference types="express" />
import { NextFunction, Request, RequestHandler, Response, Router } from "express";
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
    protected _schema: Schema<FBGraphQLContext>;
    private readonly _connectionPool;
    constructor(options: FBExpressOptions);
    readonly connectionPool: FBConnectionPool;
    protected _getSchema(options: FBExpressOptions): Schema<FBGraphQLContext>;
    protected _createBlobUrl(id: IBlobID): string;
    protected _routeUrlMiddleware(req: Request, res: Response, next: NextFunction): void;
    protected _parseBlobIDMiddleware(req: Request, res: Response, next: NextFunction): void;
    protected _queryBlobMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
    protected _getGraphQLMiddleware(options: FBExpressOptions): RequestHandler;
    protected routes(router: Router, options: FBExpressOptions): void;
}
