"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const express_graphql_1 = __importDefault(require("express-graphql"));
const FBAdapter_1 = __importDefault(require("./FBAdapter"));
const FBDatabase_1 = __importDefault(require("./FBDatabase"));
const FBGraphQLContext_1 = __importDefault(require("./FBGraphQLContext"));
const Schema_1 = __importDefault(require("../../Schema"));
const BaseRouter_1 = __importDefault(require("../../BaseRouter"));
class FBExpress extends BaseRouter_1.default {
    constructor(options) {
        super(options);
        this._routerUrl = "";
        this._connectionPool = new FBDatabase_1.FBConnectionPool();
        this._connectionPool.createConnectionPool(options, options.maxConnectionPool);
        this._schema = this._getSchema(options);
        this._schema.createSchema().catch(console.error);
    }
    _getSchema(options) {
        return new Schema_1.default({
            adapter: new FBAdapter_1.default(Object.assign({}, options, { blobLinkCreator: this._createBlobUrl.bind(this) }))
        });
    }
    _createBlobUrl(id) {
        const idParam = new Buffer(`${JSON.stringify(id)}`).toString("base64");
        return `${this._routerUrl}${FBExpress.BLOBS_PATH}?id=${idParam}`;
    }
    _routeUrlMiddleware(req, res, next) {
        this._routerUrl = req.protocol + "://" + req.get("host") + req.baseUrl;
        next();
    }
    _parseBlobIDMiddleware(req, res, next) {
        req.query = JSON.parse(new Buffer(req.query.id, "base64").toString());
        next();
    }
    async _queryBlobMiddleware(req, res, next) {
        let database;
        try {
            database = await this._connectionPool.attach();
            const result = await database.query(`
                    SELECT ${req.query.field} AS "binaryField"
                    FROM ${req.query.table}
                    WHERE ${req.query.primaryField} = ${req.query.primaryKey} 
                `);
            const blobStream = await FBDatabase_1.default.blobToStream(result[0].binaryField);
            blobStream.pipe(res);
            await new Promise(resolve => blobStream.on("end", resolve));
        }
        catch (error) {
            next(error);
        }
        finally {
            try {
                await database.detach();
            }
            catch (error) {
                console.log(error);
            }
        }
    }
    _getGraphQLMiddleware(options) {
        return express_graphql_1.default(async () => {
            if (!this._schema || !this._schema.schema)
                throw new Error("Temporarily unavailable");
            const startTime = Date.now();
            const database = await this._connectionPool.attach();
            return {
                schema: this._schema.schema,
                graphiql: options.graphiql,
                context: new FBGraphQLContext_1.default(database),
                async extensions() {
                    await database.detach();
                    return { runTime: (Date.now() - startTime) + " мсек" };
                }
            };
        });
    }
    routes(router, options) {
        router.use("/", this._routeUrlMiddleware.bind(this));
        router.use(FBExpress.BLOBS_PATH, [
            this._parseBlobIDMiddleware.bind(this),
            this._queryBlobMiddleware.bind(this)
        ]);
        router.use("/", this._getGraphQLMiddleware(options));
    }
}
FBExpress.BLOBS_PATH = "/blobs";
exports.default = FBExpress;
//# sourceMappingURL=FBExpress.js.map