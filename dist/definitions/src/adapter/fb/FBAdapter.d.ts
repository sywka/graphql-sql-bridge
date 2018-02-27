import { GraphQLResolveInfo } from "graphql/type/definition";
import { Args, FilterTypes, IField, ISchemaAdapter, ITable, Value } from "../../Schema";
import FBDatabase, { DBOptions } from "./FBDatabase";
export declare type BlobLinkCreator = (id: IBlobID) => string;
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
export interface IAdapterOptions extends DBOptions, ISchemaDetailOptions {
    blobLinkCreator: BlobLinkCreator;
}
export interface IBlobID {
    table: string;
    field: string;
    primaryField: string;
    primaryKey: string;
}
export default class FBAdapter implements ISchemaAdapter<IFBGraphQLContext> {
    protected _options: IAdapterOptions;
    constructor(options: IAdapterOptions);
    private static _convertType(type);
    quote(str: string): string;
    getTables(): Promise<ITable[]>;
    resolve(source: any, args: Args, context: IFBGraphQLContext, info: GraphQLResolveInfo): Promise<any>;
    createSQLCondition(filterType: FilterTypes, tableAlias: string, field: IField, value?: Value): string;
    protected _queryToDatabase(database: FBDatabase): Promise<ITable[]>;
}
