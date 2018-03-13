import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLFieldConfigMap,
    GraphQLFloat,
    GraphQLID,
    GraphQLInputFieldConfigMap,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLResolveInfo,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLString
} from "graphql";
import GraphQLDate from "graphql-date";
import {GraphQLUrl} from "graphql-url";
import {connectionArgs, connectionDefinitions, GraphQLConnectionDefinitions} from "graphql-relay";
import Progress from "./Progress";

export type ID = number | string;

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

export type Args = { [argName: string]: any }

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
    }
}

export default class Schema<GraphQLContext> {

    constructor(options: ISchemaOptions<GraphQLContext>) {
        this._options = options;
    }

    protected _options: ISchemaOptions<GraphQLContext>;

    get options(): ISchemaOptions<GraphQLContext> {
        return this._options;
    }

    protected _schema: GraphQLSchema;

    get schema(): GraphQLSchema {
        return this._schema;
    }

    private _context: IContext;

    get context(): IContext {
        return this._context;
    }

    set context(value: IContext) {
        this._context = value;
    }

    protected static _convertPrimitiveFieldType(key: ISchemaObjectKey): GraphQLScalarType {
        switch (key.type) {
            case SchemaFieldTypes.ID:
                return GraphQLID;
            case SchemaFieldTypes.BLOB:
                return GraphQLUrl;
            case SchemaFieldTypes.INT:
                return GraphQLInt;
            case SchemaFieldTypes.FLOAT:
                return GraphQLFloat;
            case SchemaFieldTypes.DATE:
                return GraphQLDate;
            case SchemaFieldTypes.BOOLEAN:
                return GraphQLBoolean;
            case SchemaFieldTypes.STRING:
            default:
                return GraphQLString;
        }
    }

    protected static _findObjectRef(context: IContext, key: ISchemaObjectKey): ISchemaObject | null {
        if (key.objectRefID === undefined || key.objectRefID === null) return null;
        return context.objects.find((object) => object.id === key.objectRefID);
    }

    protected static _escapeOriginalName(bases: IBase[], name: string): string {
        let replaceValue = "__";
        while (true) {
            const escapedName = name.replace(/\$/g, replaceValue);
            if (escapedName === name) return escapedName;
            if (!bases.find((item) => item.name === escapedName)) return escapedName;
            replaceValue += "_";
        }
    }

    protected static _escapeObjects(objects: ISchemaObject[]): void {
        return objects.forEach(object => {
            if (!object.name) {
                object.name = Schema._escapeOriginalName(objects, object.originalName);
            }
            object.keys.forEach(key => {
                if (!key.name) {
                    key.name = Schema._escapeOriginalName(object.keys, key.originalName);
                }
            });
        });
    }

    public async init(hiddenProgress?: boolean): Promise<GraphQLSchema> {
        this._schema = null;
        this._context = null;

        const total = 100;
        const progress = new Progress(total + 10, hiddenProgress);
        this._context = {
            objects: [],
            types: [],
            inputTypes: [],
            connections: [],
            progress: {
                tableTick: (object: ISchemaObject) => {
                    progress.tick(`Creating GraphQL type: ${object.name}`,
                        total / this._context.objects.length);
                }
            }
        };
        try {
            console.log("Creating GraphQL schema...");

            progress.tick("Reading database _schema...");
            this._context.objects = await this._options.adapter.getObjects();
            Schema._escapeObjects(this._context.objects);

            progress.tick("Creating GraphQL _schema...", 8);
            this._schema = new GraphQLSchema({
                query: this._createQueryType(this._context)
            });
            progress.tick("Done.");

            console.log("GraphQL schema created.");

            return this._schema;
        } catch (error) {
            progress.terminate(error.message);
            throw error;
        }
    }

    protected _createQueryType(context: IContext): GraphQLObjectType | null {
        const queryType = new GraphQLObjectType({
            name: "Objects",
            fields: () => this._createQueryTypeFields(context)
        });
        if (!Object.keys(queryType.getFields()).length) return null;
        return queryType;
    }

    protected _createQueryTypeFields(context: IContext): GraphQLFieldConfigMap<void, void> {
        return context.objects.reduce((keys, object) => {
            const keyType = this._createType(context, object);
            if (keyType) {
                keys[object.name] = {
                    type: this._createConnectionType(context, keyType),
                    description: object.description,
                    args: {
                        ...connectionArgs,
                        where: {type: this._createFilterInputType(context, object)},
                        order: {type: new GraphQLList(this._createSortingInputType(context, object))}
                    },
                    resolve: this._options.adapter.resolve.bind(this._options.adapter)
                };
            }
            return keys;
        }, {});
    }

    protected _createSortingInputType(context: IContext, object: ISchemaObject) {
        const duplicate: GraphQLInputObjectType = context.inputTypes.find(type => (
            type.name === `SORTING_${object.name}`
        ));
        if (duplicate) return duplicate;

        const sortingFieldsEnumType = new GraphQLEnumType({
            name: `SORTING_FIELDS_${object.name}`,
            values: object.keys.reduce((values, key) => {
                values[key.name] = {
                    value: key.name,
                    description: key.description
                };
                return values;
            }, {})
        });

        const inputType = new GraphQLInputObjectType({
            name: `SORTING_${object.name}`,
            fields: () => ({
                [SortType.ASC]: {type: sortingFieldsEnumType},
                [SortType.DESC]: {type: sortingFieldsEnumType}
            })
        });
        context.inputTypes.push(inputType);
        return inputType;
    }

    protected _createFilterInputType(context: IContext, object: ISchemaObject): GraphQLInputObjectType {
        const duplicate: GraphQLInputObjectType = context.inputTypes.find(type => (
            type.name === `FILTER_${object.name}`
        ));
        if (duplicate) return duplicate;

        const inputType = new GraphQLInputObjectType({
            name: `FILTER_${object.name}`,
            fields: () => this._createFilterInputTypeFields(context, object, inputType)
        });
        context.inputTypes.push(inputType);
        return inputType;
    }

    protected _createFilterInputTypeFields(context: IContext, object: ISchemaObject, inputType: GraphQLInputObjectType): GraphQLInputFieldConfigMap {
        const equalsType = new GraphQLInputObjectType({
            name: `EQUALS_${object.name}`,
            fields: object.keys.reduce((fields, key) => {
                switch (key.type) {
                    case SchemaFieldTypes.BLOB:
                        break;
                    default:
                        fields[key.name] = {
                            type: Schema._convertPrimitiveFieldType(key),
                            description: key.description
                        };
                }
                return fields;
            }, {})
        });

        const containsType = new GraphQLInputObjectType({
            name: `CONTAINS_${object.name}`,
            fields: object.keys.reduce((fields, key) => {
                switch (key.type) {
                    case SchemaFieldTypes.STRING:
                        fields[key.name] = {
                            type: Schema._convertPrimitiveFieldType(key),
                            description: key.description
                        };
                        break;
                }
                return fields;
            }, {})
        });

        const nullableFieldsEnumType = new GraphQLEnumType({
            name: `IS_NULL_FIELDS_${object.name}`,
            values: object.keys.reduce((values, key) => {
                if (!key.nonNull) {
                    values[key.name] = {
                        value: key.name,
                        description: key.description
                    };
                }
                return values;
            }, {})
        });

        const emptyFieldsEnumType = new GraphQLEnumType({
            name: `IS_EMPTY_FIELDS_${object.name}`,
            values: object.keys.reduce((values, key) => {
                switch (key.type) {
                    case SchemaFieldTypes.BLOB:
                    case SchemaFieldTypes.STRING:
                        values[key.name] = {
                            value: key.name,
                            description: key.description
                        };
                }
                return values;
            }, {})
        });

        const beginsOrEndsType = new GraphQLInputObjectType({
            name: `BEGINS_OR_ENDS_${object.name}`,
            fields: object.keys.reduce((fields, key) => {
                switch (key.type) {
                    case SchemaFieldTypes.STRING:
                        fields[key.name] = {
                            type: Schema._convertPrimitiveFieldType(key),
                            description: key.description
                        };
                        break;
                }
                return fields;
            }, {})
        });

        const greaterOrLessType = new GraphQLInputObjectType({
            name: `GREATER_OR_LESS_${object.name}`,
            fields: object.keys.reduce((fields, key) => {
                switch (key.type) {
                    case SchemaFieldTypes.DATE:
                    case SchemaFieldTypes.INT:
                    case SchemaFieldTypes.FLOAT:
                        fields[key.name] = {
                            type: Schema._convertPrimitiveFieldType(key),
                            description: key.description
                        };
                        break;
                }
                return fields;
            }, {})
        });

        return {
            ...Object.keys(equalsType.getFields()).length ? {
                [FilterTypes.EQUALS]: {type: equalsType}
            } : {},
            ...Object.keys(containsType.getFields()).length ? {
                [FilterTypes.CONTAINS]: {type: containsType}
            } : {},
            ...Object.keys(beginsOrEndsType.getFields()).length ? {
                [FilterTypes.BEGINS]: {type: beginsOrEndsType},
                [FilterTypes.ENDS]: {type: beginsOrEndsType}
            } : {},
            ...Object.keys(greaterOrLessType.getFields()).length ? {
                [FilterTypes.GREATER]: {type: greaterOrLessType},
                [FilterTypes.LESS]: {type: greaterOrLessType}
            } : {},
            ...emptyFieldsEnumType.getValues().length ? {
                isEmpty: {type: emptyFieldsEnumType}
            } : {},

            ...nullableFieldsEnumType.getValues().length ? {
                [IntegratedFilterTypes.IS_NULL]: {type: nullableFieldsEnumType}
            } : {},
            [IntegratedFilterTypes.OR]: {type: new GraphQLList(inputType)},
            [IntegratedFilterTypes.AND]: {type: new GraphQLList(inputType)},
            [IntegratedFilterTypes.NOT]: {type: new GraphQLList(inputType)}
        };
    }

    protected _createConnectionType(context: IContext, type: GraphQLObjectType): GraphQLObjectType {
        let connection = context.connections.find((connection) => (
            connection.connectionType.name === type.name + "Connection"
        ));
        if (connection) return connection.connectionType;

        connection = connectionDefinitions({
            name: type.name,
            nodeType: type,
            connectionFields: {
                total: {type: GraphQLInt}
            }
        });
        context.connections.push(connection);

        return connection.connectionType;
    }

    protected _createType(context: IContext, object: ISchemaObject): GraphQLObjectType | null {
        const duplicate: GraphQLObjectType = context.types.find(type => type.name === object.name);
        if (duplicate) return duplicate;

        context.progress.tableTick(object);
        const type: GraphQLObjectType = new GraphQLObjectType({
            name: object.name,
            description: object.description,
            fields: () => this._createTypeFields(context, object),
            object
        });
        context.types.push(type);

        if (!Object.keys(type.getFields()).length) return null;
        return type;
    }

    protected _createTypeFields(context: IContext, object: ISchemaObject): GraphQLFieldConfigMap<void, void> {
        const fields = this._createTypePrimitiveFields(object.keys);
        const linkFields = this._createTypeLinkFields(context, object, object.keys);

        return {
            ...fields,
            ...linkFields
        };
    }

    protected _createTypeLinkFields(context: IContext, object: ISchemaObject, keys: ISchemaObjectKey[]): GraphQLFieldConfigMap<void, void> {
        return keys.reduce((fields, key) => {
            const objectRef = Schema._findObjectRef(context, key);

            if (objectRef) {
                const keyType = this._createType(context, objectRef);
                const connectFieldType = this._createConnectionType(context, keyType);

                if (keyType) {
                    fields[`link_${key.name}`] = {
                        type: key.nonNull ? new GraphQLNonNull(connectFieldType) : connectFieldType,
                        description: key.description,
                        args: {
                            ...connectionArgs,
                            where: {type: this._createFilterInputType(context, objectRef)},
                            order: {type: new GraphQLList(this._createSortingInputType(context, objectRef))}
                        },
                        resolve: this._options.adapter.resolve.bind(this._options.adapter),
                        key,
                        objectRef
                    };
                }
            }
            return fields;
        }, {});
    }

    protected _createTypePrimitiveFields(keys: ISchemaObjectKey[]): GraphQLFieldConfigMap<void, void> {
        return keys.reduce((resultFields, key) => {
            const keyType = Schema._convertPrimitiveFieldType(key);

            resultFields[key.name] = {
                type: key.nonNull ? new GraphQLNonNull(keyType) : keyType,
                description: key.description,
                resolve: this._options.adapter.resolve.bind(this._options.adapter),
                key
            };
            return resultFields;
        }, {});
    }
}

export enum SchemaFieldTypes {
    ID, BOOLEAN, STRING, INT, FLOAT, DATE, BLOB
}

export enum SortType {
    ASC = "asc",
    DESC = "desc"
}

export enum IntegratedFilterTypes {
    NOT = "not",
    OR = "or",
    AND = "and",
    IS_NULL = "isNull"
}

export enum FilterTypes {
    EQUALS = "equals",

    IS_EMPTY = "isEmpty",
    CONTAINS = "contains",
    BEGINS = "begins",
    ENDS = "ends",

    GREATER = "greater",
    LESS = "less"
}