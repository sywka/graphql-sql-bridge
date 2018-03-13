import { GraphQLFieldConfigMap, GraphQLInputFieldConfigMap, GraphQLInputObjectType, GraphQLObjectType, GraphQLResolveInfo, GraphQLScalarType, GraphQLSchema } from "graphql";
import { GraphQLConnectionDefinitions } from "graphql-relay";
export declare type ID = number | string;
export interface IBase {
    id: ID;
    name: string;
    originalName: string;
    description: string;
}
export interface ISchemaObjectKey extends IBase {
    nonNull: boolean;
    type: SchemaFieldTypes;
    objectRefID: ID;
}
export interface ISchemaObject extends IBase {
    keys: ISchemaObjectKey[];
}
export declare type Args = {
    [argName: string]: any;
};
export interface ISchemaAdapter<GraphQLContext> {
    getObjects(): Promise<ISchemaObject[]>;
    resolve(source: any, args: Args, context: GraphQLContext, info: GraphQLResolveInfo): any;
}
export interface ISchemaOptions<GraphQLContext> {
    adapter: ISchemaAdapter<GraphQLContext>;
}
export interface IContext {
    objects: ISchemaObject[];
    types: GraphQLObjectType[];
    inputTypes: GraphQLInputObjectType[];
    connections: GraphQLConnectionDefinitions[];
    progress: {
        tableTick: (object: ISchemaObject) => void;
    };
}
export default class Schema<GraphQLContext> {
    constructor(options: ISchemaOptions<GraphQLContext>);
    protected _options: ISchemaOptions<GraphQLContext>;
    readonly options: ISchemaOptions<GraphQLContext>;
    protected _schema: GraphQLSchema;
    readonly schema: GraphQLSchema;
    private _context;
    context: IContext;
    protected static _convertPrimitiveFieldType(key: ISchemaObjectKey): GraphQLScalarType;
    protected static _findObjectRef(context: IContext, key: ISchemaObjectKey): ISchemaObject | null;
    protected static _escapeOriginalName(bases: IBase[], name: string): string;
    protected static _escapeObjects(objects: ISchemaObject[]): void;
    init(hiddenProgress?: boolean): Promise<GraphQLSchema>;
    protected _createQueryType(context: IContext): GraphQLObjectType | null;
    protected _createQueryTypeFields(context: IContext): GraphQLFieldConfigMap<void, void>;
    protected _createSortingInputType(context: IContext, object: ISchemaObject): GraphQLInputObjectType;
    protected _createFilterInputType(context: IContext, object: ISchemaObject): GraphQLInputObjectType;
    protected _createFilterInputTypeFields(context: IContext, object: ISchemaObject, inputType: GraphQLInputObjectType): GraphQLInputFieldConfigMap;
    protected _createConnectionType(context: IContext, type: GraphQLObjectType): GraphQLObjectType;
    protected _createType(context: IContext, object: ISchemaObject): GraphQLObjectType | null;
    protected _createTypeFields(context: IContext, object: ISchemaObject): GraphQLFieldConfigMap<void, void>;
    protected _createTypeLinkFields(context: IContext, object: ISchemaObject, keys: ISchemaObjectKey[]): GraphQLFieldConfigMap<void, void>;
    protected _createTypePrimitiveFields(keys: ISchemaObjectKey[]): GraphQLFieldConfigMap<void, void>;
}
export declare enum SchemaFieldTypes {
    ID = 0,
    BOOLEAN = 1,
    STRING = 2,
    INT = 3,
    FLOAT = 4,
    DATE = 5,
    BLOB = 6,
}
export declare enum SortType {
    ASC = "asc",
    DESC = "desc",
}
export declare enum IntegratedFilterTypes {
    NOT = "not",
    OR = "or",
    AND = "and",
    IS_NULL = "isNull",
}
export declare enum FilterTypes {
    EQUALS = "equals",
    IS_EMPTY = "isEmpty",
    CONTAINS = "contains",
    BEGINS = "begins",
    ENDS = "ends",
    GREATER = "greater",
    LESS = "less",
}
