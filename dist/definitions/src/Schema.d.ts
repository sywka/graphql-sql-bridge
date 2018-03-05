import { GraphQLInputObjectType, GraphQLObjectType, GraphQLScalarType, GraphQLSchema } from "graphql";
import { GraphQLFieldConfigMap, GraphQLInputFieldConfigMap, GraphQLResolveInfo } from "graphql/type/definition";
import { GraphQLConnectionDefinitions } from "graphql-relay";
export declare type ID = number | string;
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
export declare type Value = string | number | boolean | Date | DateConstructor;
export declare type Args = {
    [argName: string]: any;
};
export interface ISchemaAdapter<GraphQLContext> {
    quote(str: string): string;
    getTables(): Promise<ITable[]>;
    resolve(source: any, args: Args, context: GraphQLContext, info: GraphQLResolveInfo): any;
    createSQLCondition(filterType: FilterTypes, tableAlias: string, field: IField, value?: Value): string;
}
export interface ISchemaOptions<GraphQLContext> {
    adapter: ISchemaAdapter<GraphQLContext>;
}
export interface IContext {
    tables: ITable[];
    types: GraphQLObjectType[];
    inputTypes: GraphQLInputObjectType[];
    connections: GraphQLConnectionDefinitions[];
    progress: {
        tableTick: (table: ITable) => void;
    };
}
export default class Schema<GraphQLContext> {
    constructor(options: ISchemaOptions<GraphQLContext>);
    protected _options: ISchemaOptions<GraphQLContext>;
    readonly options: ISchemaOptions<GraphQLContext>;
    protected _schema: GraphQLSchema;
    readonly schema: GraphQLSchema;
    protected static _convertPrimitiveFieldType(field: IField): GraphQLScalarType;
    protected static _escapeName(bases: IBase[], name: string): string;
    protected static _findPrimaryFieldName(table: ITable): string;
    protected static _findOriginalField(table: ITable, escapedFieldName: any): IField;
    protected static _findTableRef(context: IContext, field: IField): ITable | null;
    protected static _findFieldRef(tableRef: ITable, field: IField): IField | null;
    protected static _createObjectOrderBy(order: any[]): {
        [fieldName: string]: string;
    } | null;
    protected static _joinConditions(array: any[], separator: string): string;
    createSchema(hiddenProgress?: boolean): Promise<GraphQLSchema>;
    protected _createSQLWhere(table: ITable, tableAlias: string, where: any, context: GraphQLContext): string;
    protected _createQueryType(context: IContext): GraphQLObjectType | null;
    protected _createQueryTypeFields(context: IContext): GraphQLFieldConfigMap<void, void>;
    protected _createSortingInputType(context: IContext, table: ITable): GraphQLInputObjectType;
    protected _createFilterInputType(context: IContext, table: ITable): GraphQLInputObjectType;
    protected _createFilterInputTypeFields(context: IContext, table: ITable, inputType: GraphQLInputObjectType): GraphQLInputFieldConfigMap;
    protected _createConnectionType(context: IContext, type: GraphQLObjectType): GraphQLObjectType;
    protected _createType(context: IContext, table: ITable): GraphQLObjectType | null;
    protected _createTypeFields(context: IContext, table: ITable): GraphQLFieldConfigMap<void, void>;
    protected _createTypeLinkFields(context: IContext, table: ITable, fields: IField[]): GraphQLFieldConfigMap<void, void>;
    protected _createTypePrimitiveFields(fields: IField[]): GraphQLFieldConfigMap<void, void>;
}
export declare enum SchemaFieldTypes {
    BOOLEAN = 0,
    STRING = 1,
    INT = 2,
    FLOAT = 3,
    DATE = 4,
    BLOB = 5,
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
