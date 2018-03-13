import { GraphQLResolveInfo } from "graphql";
import { Args, ID, ISchemaAdapter, ISchemaObject, SchemaFieldTypes } from "../../Schema";
import { DBOptions, FBConnectionPool } from "./FBDatabase";
export declare type BlobLinkCreator = (id: IBlobID) => string;
export interface IBase {
    readonly id: ID;
    readonly name: string;
    description: string;
}
export interface IField extends IBase {
    readonly primary: boolean;
    readonly type: SchemaFieldTypes;
    readonly nonNull: boolean;
    readonly tableRefKey: ID;
    readonly fieldRefKey: ID;
}
export interface ITable extends IBase {
    readonly fields: IField[];
}
export interface IFBGraphQLContext {
    query(query: string, params?: any[]): Promise<any[]>;
    execute(query: string, params?: any[]): Promise<any[]>;
}
export interface ISchemaDetailOptions {
    include?: string[];
    exclude?: string[];
    includePattern?: string;
    excludePattern?: string;
}
export interface IAdapterOptions extends ISchemaDetailOptions {
    blobLinkCreator: BlobLinkCreator;
}
export interface IBlobID {
    objectID: ID;
    keyID: ID;
    primaryFields: {
        keyID: ID;
        value: any;
    }[];
}
export default class FBAdapter implements ISchemaAdapter<IFBGraphQLContext> {
    protected _options: IAdapterOptions;
    private readonly _source;
    constructor(dbOptions: DBOptions, options: IAdapterOptions);
    constructor(pool: FBConnectionPool, options: IAdapterOptions);
    readonly source: DBOptions | FBConnectionPool;
    protected static _convertType(type: number): SchemaFieldTypes;
    getObjects(): Promise<ISchemaObject[]>;
    resolve(source: any, args: Args, context: IFBGraphQLContext, info: GraphQLResolveInfo): Promise<any>;
}
