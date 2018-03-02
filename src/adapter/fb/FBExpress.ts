import {NextFunction, Request, RequestHandler, Response, Router} from "express";
import graphqlHTTP from "express-graphql";
import FBAdapter, {IBlobID, ISchemaDetailOptions} from "./FBAdapter";
import FBDatabase, {DBOptions, FBConnectionPool, FBTransaction} from "./FBDatabase";
import FBGraphQLContext from "./FBGraphQLContext";
import Schema from "../../Schema";
import BaseRouter from "../../BaseRouter";

export interface FBExpressOptions extends ISchemaDetailOptions, DBOptions {
    graphiql?: boolean;
    maxConnectionPool?: number;
}

export default class FBExpress extends BaseRouter<FBExpressOptions> {

    public static BLOBS_PATH = "/blobs";

    protected _routerUrl: string = "";
    protected _schema: Schema<FBGraphQLContext>;

    private readonly _connectionPool = new FBConnectionPool();

    constructor(options: FBExpressOptions) {
        super(options);

        this.connectionPool.createConnectionPool(options, options.maxConnectionPool);

        this._schema = this._getSchema(options);
        this._schema.createSchema().catch(console.error);
    }

    get connectionPool(): FBConnectionPool {
        return this._connectionPool;
    }

    protected _getSchema(options: FBExpressOptions): Schema<FBGraphQLContext> {
        return new Schema({
            adapter: new FBAdapter(this.connectionPool, {
                ...<ISchemaDetailOptions>options,
                blobLinkCreator: this._createBlobUrl.bind(this),
            })
        });
    }

    protected _createBlobUrl(id: IBlobID) {
        const idParam = new Buffer(`${JSON.stringify(id)}`).toString("base64");
        return `${this._routerUrl}${FBExpress.BLOBS_PATH}?id=${idParam}`;
    }

    protected _routeUrlMiddleware(req: Request, res: Response, next: NextFunction): void {
        this._routerUrl = req.protocol + "://" + req.get("host") + req.baseUrl;
        next();
    }

    protected _parseBlobIDMiddleware(req: Request, res: Response, next: NextFunction): void {
        req.query = JSON.parse(new Buffer(req.query.id, "base64").toString());
        next();
    }

    protected async _queryBlobMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await FBDatabase.executeTransaction(this.connectionPool, async (transaction: FBTransaction) => {
                const result = await transaction.query(`
                    SELECT ${req.query.field} AS "binaryField"
                    FROM ${req.query.table}
                    WHERE ${req.query.primaryField} = ${req.query.primaryKey} 
                `);

                const blobStream = await FBDatabase.blobToStream(result[0].binaryField);    //TODO fix lib
                blobStream.pipe(res);
                await new Promise(resolve => blobStream.on("end", resolve));
            });
        } catch (error) {
            next(error);
        }
    }

    protected _getGraphQLMiddleware(options: FBExpressOptions): RequestHandler {
        return graphqlHTTP(async () => {
            if (!this._schema || !this._schema.schema) throw new Error("Temporarily unavailable");

            const startTime = Date.now();
            const database = await this.connectionPool.attach();

            return {
                schema: this._schema.schema,
                graphiql: options.graphiql,
                context: new FBGraphQLContext(database),
                async extensions() {
                    await database.detach();
                    return {runTime: (Date.now() - startTime) + " мсек"};
                }
            };
        });
    }

    protected routes(router: Router, options: FBExpressOptions) {
        router.use("/", this._routeUrlMiddleware.bind(this));

        router.use(FBExpress.BLOBS_PATH, [
            this._parseBlobIDMiddleware.bind(this),
            this._queryBlobMiddleware.bind(this)
        ]);

        router.use("/", this._getGraphQLMiddleware(options));
    }
}