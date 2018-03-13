"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_date_1 = __importDefault(require("graphql-date"));
const graphql_url_1 = require("graphql-url");
const graphql_relay_1 = require("graphql-relay");
const Progress_1 = __importDefault(require("./Progress"));
class Schema {
    constructor(options) {
        this._options = options;
    }
    get options() {
        return this._options;
    }
    get schema() {
        return this._schema;
    }
    get context() {
        return this._context;
    }
    set context(value) {
        this._context = value;
    }
    static _convertPrimitiveFieldType(key) {
        switch (key.type) {
            case SchemaFieldTypes.ID:
                return graphql_1.GraphQLID;
            case SchemaFieldTypes.BLOB:
                return graphql_url_1.GraphQLUrl;
            case SchemaFieldTypes.INT:
                return graphql_1.GraphQLInt;
            case SchemaFieldTypes.FLOAT:
                return graphql_1.GraphQLFloat;
            case SchemaFieldTypes.DATE:
                return graphql_date_1.default;
            case SchemaFieldTypes.BOOLEAN:
                return graphql_1.GraphQLBoolean;
            case SchemaFieldTypes.STRING:
            default:
                return graphql_1.GraphQLString;
        }
    }
    static _findObjectRef(context, key) {
        if (key.objectRefID === undefined || key.objectRefID === null)
            return null;
        return context.objects.find((object) => object.id === key.objectRefID);
    }
    static _escapeOriginalName(bases, name) {
        let replaceValue = "__";
        while (true) {
            const escapedName = name.replace(/\$/g, replaceValue);
            if (escapedName === name)
                return escapedName;
            if (!bases.find((item) => item.name === escapedName))
                return escapedName;
            replaceValue += "_";
        }
    }
    static _escapeObjects(objects) {
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
    async init(hiddenProgress) {
        this._schema = null;
        this._context = null;
        const total = 100;
        const progress = new Progress_1.default(total + 10, hiddenProgress);
        this._context = {
            objects: [],
            types: [],
            inputTypes: [],
            connections: [],
            progress: {
                tableTick: (object) => {
                    progress.tick(`Creating GraphQL type: ${object.name}`, total / this._context.objects.length);
                }
            }
        };
        try {
            console.log("Creating GraphQL schema...");
            progress.tick("Reading database _schema...");
            this._context.objects = await this._options.adapter.getObjects();
            Schema._escapeObjects(this._context.objects);
            progress.tick("Creating GraphQL _schema...", 8);
            this._schema = new graphql_1.GraphQLSchema({
                query: this._createQueryType(this._context)
            });
            progress.tick("Done.");
            console.log("GraphQL schema created.");
            return this._schema;
        }
        catch (error) {
            progress.terminate(error.message);
            throw error;
        }
    }
    _createQueryType(context) {
        const queryType = new graphql_1.GraphQLObjectType({
            name: "Objects",
            fields: () => this._createQueryTypeFields(context)
        });
        if (!Object.keys(queryType.getFields()).length)
            return null;
        return queryType;
    }
    _createQueryTypeFields(context) {
        return context.objects.reduce((keys, object) => {
            const keyType = this._createType(context, object);
            if (keyType) {
                keys[object.name] = {
                    type: this._createConnectionType(context, keyType),
                    description: object.description,
                    args: Object.assign({}, graphql_relay_1.connectionArgs, { where: { type: this._createFilterInputType(context, object) }, order: { type: new graphql_1.GraphQLList(this._createSortingInputType(context, object)) } }),
                    resolve: this._options.adapter.resolve.bind(this._options.adapter)
                };
            }
            return keys;
        }, {});
    }
    _createSortingInputType(context, object) {
        const duplicate = context.inputTypes.find(type => (type.name === `SORTING_${object.name}`));
        if (duplicate)
            return duplicate;
        const sortingFieldsEnumType = new graphql_1.GraphQLEnumType({
            name: `SORTING_FIELDS_${object.name}`,
            values: object.keys.reduce((values, key) => {
                values[key.name] = {
                    value: key.name,
                    description: key.description
                };
                return values;
            }, {})
        });
        const inputType = new graphql_1.GraphQLInputObjectType({
            name: `SORTING_${object.name}`,
            fields: () => ({
                [SortType.ASC]: { type: sortingFieldsEnumType },
                [SortType.DESC]: { type: sortingFieldsEnumType }
            })
        });
        context.inputTypes.push(inputType);
        return inputType;
    }
    _createFilterInputType(context, object) {
        const duplicate = context.inputTypes.find(type => (type.name === `FILTER_${object.name}`));
        if (duplicate)
            return duplicate;
        const inputType = new graphql_1.GraphQLInputObjectType({
            name: `FILTER_${object.name}`,
            fields: () => this._createFilterInputTypeFields(context, object, inputType)
        });
        context.inputTypes.push(inputType);
        return inputType;
    }
    _createFilterInputTypeFields(context, object, inputType) {
        const equalsType = new graphql_1.GraphQLInputObjectType({
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
        const containsType = new graphql_1.GraphQLInputObjectType({
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
        const nullableFieldsEnumType = new graphql_1.GraphQLEnumType({
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
        const emptyFieldsEnumType = new graphql_1.GraphQLEnumType({
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
        const beginsOrEndsType = new graphql_1.GraphQLInputObjectType({
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
        const greaterOrLessType = new graphql_1.GraphQLInputObjectType({
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
        return Object.assign({}, Object.keys(equalsType.getFields()).length ? {
            [FilterTypes.EQUALS]: { type: equalsType }
        } : {}, Object.keys(containsType.getFields()).length ? {
            [FilterTypes.CONTAINS]: { type: containsType }
        } : {}, Object.keys(beginsOrEndsType.getFields()).length ? {
            [FilterTypes.BEGINS]: { type: beginsOrEndsType },
            [FilterTypes.ENDS]: { type: beginsOrEndsType }
        } : {}, Object.keys(greaterOrLessType.getFields()).length ? {
            [FilterTypes.GREATER]: { type: greaterOrLessType },
            [FilterTypes.LESS]: { type: greaterOrLessType }
        } : {}, emptyFieldsEnumType.getValues().length ? {
            isEmpty: { type: emptyFieldsEnumType }
        } : {}, nullableFieldsEnumType.getValues().length ? {
            [IntegratedFilterTypes.IS_NULL]: { type: nullableFieldsEnumType }
        } : {}, { [IntegratedFilterTypes.OR]: { type: new graphql_1.GraphQLList(inputType) }, [IntegratedFilterTypes.AND]: { type: new graphql_1.GraphQLList(inputType) }, [IntegratedFilterTypes.NOT]: { type: new graphql_1.GraphQLList(inputType) } });
    }
    _createConnectionType(context, type) {
        let connection = context.connections.find((connection) => (connection.connectionType.name === type.name + "Connection"));
        if (connection)
            return connection.connectionType;
        connection = graphql_relay_1.connectionDefinitions({
            name: type.name,
            nodeType: type,
            connectionFields: {
                total: { type: graphql_1.GraphQLInt }
            }
        });
        context.connections.push(connection);
        return connection.connectionType;
    }
    _createType(context, object) {
        const duplicate = context.types.find(type => type.name === object.name);
        if (duplicate)
            return duplicate;
        context.progress.tableTick(object);
        const type = new graphql_1.GraphQLObjectType({
            name: object.name,
            description: object.description,
            fields: () => this._createTypeFields(context, object),
            object
        });
        context.types.push(type);
        if (!Object.keys(type.getFields()).length)
            return null;
        return type;
    }
    _createTypeFields(context, object) {
        const fields = this._createTypePrimitiveFields(object.keys);
        const linkFields = this._createTypeLinkFields(context, object, object.keys);
        return Object.assign({}, fields, linkFields);
    }
    _createTypeLinkFields(context, object, keys) {
        return keys.reduce((fields, key) => {
            const objectRef = Schema._findObjectRef(context, key);
            if (objectRef) {
                const keyType = this._createType(context, objectRef);
                const connectFieldType = this._createConnectionType(context, keyType);
                if (keyType) {
                    fields[`link_${key.name}`] = {
                        type: key.nonNull ? new graphql_1.GraphQLNonNull(connectFieldType) : connectFieldType,
                        description: key.description,
                        args: Object.assign({}, graphql_relay_1.connectionArgs, { where: { type: this._createFilterInputType(context, objectRef) }, order: { type: new graphql_1.GraphQLList(this._createSortingInputType(context, objectRef)) } }),
                        resolve: this._options.adapter.resolve.bind(this._options.adapter),
                        key,
                        objectRef
                    };
                }
            }
            return fields;
        }, {});
    }
    _createTypePrimitiveFields(keys) {
        return keys.reduce((resultFields, key) => {
            const keyType = Schema._convertPrimitiveFieldType(key);
            resultFields[key.name] = {
                type: key.nonNull ? new graphql_1.GraphQLNonNull(keyType) : keyType,
                description: key.description,
                resolve: this._options.adapter.resolve.bind(this._options.adapter),
                key
            };
            return resultFields;
        }, {});
    }
}
exports.default = Schema;
var SchemaFieldTypes;
(function (SchemaFieldTypes) {
    SchemaFieldTypes[SchemaFieldTypes["ID"] = 0] = "ID";
    SchemaFieldTypes[SchemaFieldTypes["BOOLEAN"] = 1] = "BOOLEAN";
    SchemaFieldTypes[SchemaFieldTypes["STRING"] = 2] = "STRING";
    SchemaFieldTypes[SchemaFieldTypes["INT"] = 3] = "INT";
    SchemaFieldTypes[SchemaFieldTypes["FLOAT"] = 4] = "FLOAT";
    SchemaFieldTypes[SchemaFieldTypes["DATE"] = 5] = "DATE";
    SchemaFieldTypes[SchemaFieldTypes["BLOB"] = 6] = "BLOB";
})(SchemaFieldTypes = exports.SchemaFieldTypes || (exports.SchemaFieldTypes = {}));
var SortType;
(function (SortType) {
    SortType["ASC"] = "asc";
    SortType["DESC"] = "desc";
})(SortType = exports.SortType || (exports.SortType = {}));
var IntegratedFilterTypes;
(function (IntegratedFilterTypes) {
    IntegratedFilterTypes["NOT"] = "not";
    IntegratedFilterTypes["OR"] = "or";
    IntegratedFilterTypes["AND"] = "and";
    IntegratedFilterTypes["IS_NULL"] = "isNull";
})(IntegratedFilterTypes = exports.IntegratedFilterTypes || (exports.IntegratedFilterTypes = {}));
var FilterTypes;
(function (FilterTypes) {
    FilterTypes["EQUALS"] = "equals";
    FilterTypes["IS_EMPTY"] = "isEmpty";
    FilterTypes["CONTAINS"] = "contains";
    FilterTypes["BEGINS"] = "begins";
    FilterTypes["ENDS"] = "ends";
    FilterTypes["GREATER"] = "greater";
    FilterTypes["LESS"] = "less";
})(FilterTypes = exports.FilterTypes || (exports.FilterTypes = {}));
//# sourceMappingURL=Schema.js.map