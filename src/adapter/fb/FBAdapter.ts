import NestHydrationJS from "nesthydrationjs";
import {GraphQLResolveInfo} from "graphql";
import {connectionFromArray} from "graphql-relay";
import {GraphQLUrl} from "graphql-url";
import {Args, ID, ISchemaAdapter, ISchemaObject, SchemaFieldTypes} from "../../Schema";
import FBDatabase, {DBOptions, FBConnectionPool} from "./FBDatabase";
import SQLJoiner from "../SQLJoiner";
import SQLObjectKey from "../SQLObjectKey";
import FBObject from "./FBObject";

export type BlobLinkCreator = (id: IBlobID) => string;

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
    primaryFields: { keyID: ID, value: any }[];
}

export default class FBAdapter implements ISchemaAdapter<IFBGraphQLContext> {

    protected _options: IAdapterOptions;
    private readonly _source: DBOptions | FBConnectionPool;

    constructor(dbOptions: DBOptions, options: IAdapterOptions);
    constructor(pool: FBConnectionPool, options: IAdapterOptions);
    constructor(source: any, options: IAdapterOptions) {
        this._source = source;
        this._options = options;
    }

    get source(): DBOptions | FBConnectionPool {
        return this._source;
    }

    protected static _convertType(type: number): SchemaFieldTypes {
        switch (type) {
            case 261:
                return SchemaFieldTypes.BLOB;
            case 7:
            case 8:
            case 16:
                return SchemaFieldTypes.INT;
            case 10:
            case 11:
            case 27:
                return SchemaFieldTypes.FLOAT;
            case 12:
            case 13:
            case 35:
                return SchemaFieldTypes.DATE;
            case 14:
            case 37:
            case 40:
            default:
                return SchemaFieldTypes.STRING;
        }
    }

    public async getObjects(): Promise<ISchemaObject[]> {
        return await FBDatabase.executeDatabase<ISchemaObject[]>(<DBOptions>this.source, async (database: FBDatabase) => {
            const {include, exclude, includePattern, excludePattern} = this._options;

            const includeEscaped = include ? include.map((item) => `'${item}'`) : [];
            const excludeEscaped = exclude ? exclude.map((item) => `'${item}'`) : [];

            const result: any[] = await database.query(`
              SELECT
                TRIM(r.rdb$relation_name)                                   AS "tableName",
                TRIM(rlf.rdb$field_name)                                    AS "fieldName",
                f.rdb$field_type                                            AS "fieldType",
                IIF(constPrim.rdb$constraint_type = 'PRIMARY KEY', 1, null) AS "primaryFlag",
                f.rdb$null_flag                                             AS "nullFlag",
                TRIM(ref_rel_const.rdb$relation_name)                       AS "relationName",
                TRIM(seg.rdb$field_name)                                    AS "relationFieldName",
                TRIM(ref_rel_const.rdb$relation_name)                       AS "tableRefKey",
                TRIM(seg.rdb$field_name)                                    AS "fieldRefKey"
                
              FROM rdb$relations r
              
                LEFT JOIN rdb$relation_fields rlf ON rlf.rdb$relation_name = r.rdb$relation_name
                  LEFT JOIN rdb$fields f ON f.rdb$field_name = rlf.rdb$field_source
                  LEFT JOIN rdb$relation_constraints constPrim
                    ON constPrim.rdb$relation_name = rlf.rdb$relation_name
                    AND constPrim.rdb$constraint_type = 'PRIMARY KEY'
                    AND EXISTS(
                      SELECT *
                      FROM rdb$index_segments i
                      WHERE i.rdb$field_name = rlf.rdb$field_name
                        AND i.rdb$index_name = constPrim.rdb$index_name
                    )
                  LEFT JOIN rdb$relation_constraints const
                    ON const.rdb$relation_name = rlf.rdb$relation_name
                    AND const.rdb$constraint_type = 'FOREIGN KEY'
                    AND EXISTS(
                      SELECT *
                      FROM rdb$index_segments i
                      WHERE i.rdb$field_name = rlf.rdb$field_name
                        AND i.rdb$index_name = const.rdb$index_name
                    )
                    LEFT JOIN rdb$ref_constraints ref_ref_const
                      ON ref_ref_const.rdb$constraint_name = const.rdb$constraint_name
                      LEFT JOIN rdb$relation_constraints ref_rel_const
                        ON ref_rel_const.rdb$constraint_name = ref_ref_const.rdb$const_name_uq
                        LEFT JOIN rdb$index_segments seg ON seg.rdb$index_name = ref_rel_const.rdb$index_name  
                             
              WHERE r.rdb$view_blr IS NULL
                AND (r.rdb$system_flag IS NULL OR r.rdb$system_flag = 0)
                ${includeEscaped.length ? `AND r.rdb$relation_name IN (${includeEscaped.join(", ")})` : ""}
                ${excludeEscaped.length ? `AND r.rdb$relation_name NOT IN (${excludeEscaped.join(", ")})` : ""}
                ${includePattern ? `AND r.rdb$relation_name SIMILAR TO '${includePattern}'` : ""}
                ${excludePattern ? `AND r.rdb$relation_name NOT SIMILAR TO '${excludePattern}'` : ""}
                
              ORDER BY r.rdb$relation_name
            `);

            const definition: any = [{
                id: {column: "tableName", id: true},
                name: {column: "tableName"},
                description: {column: "tableName"},
                fields: [{
                    id: {column: "fieldName", id: true},
                    name: "fieldName",
                    description: {column: "fieldName"},
                    primary: {column: "primaryFlag", type: "BOOLEAN", default: false},
                    type: {column: "fieldType", type: FBAdapter._convertType},
                    nonNull: {column: "nullFlag", type: "BOOLEAN", default: false},
                    tableRefKey: {column: "tableRefKey"},
                    fieldRefKey: {column: "fieldRefKey"}
                }]
            }];

            const tables: ITable[] = NestHydrationJS().nest(result, definition);

            return tables.map(table => new FBObject<SQLObjectKey>(
                table.id,
                table.name,
                table.description,
                table.fields.map(field => new SQLObjectKey(
                    field.id,
                    field.name,
                    field.description,
                    field.nonNull,
                    field.type,
                    field.primary,
                    field.tableRefKey,
                    field.fieldRefKey
                ))
            ));
        });
    }

    public async resolve(source: any, args: Args, context: IFBGraphQLContext, info: GraphQLResolveInfo) {
        if (source) {
            //resolve fields
            const field = source[info.fieldName];

            //resolve BLOB fields
            if (info.returnType === GraphQLUrl && typeof field === "function") {
                const config = (<any>info.parentType)._typeConfig;
                if (config) {
                    const object: FBObject<SQLObjectKey> = config.object;
                    const primaryKeys = object.findPrimaryKeys();
                    const id: IBlobID = {
                        objectID: object.id,
                        keyID: object.keys.find(key => key.name === info.fieldName).id,
                        primaryFields: primaryKeys.filter(key => source[key.name]).map(key => ({
                            keyID: key.id,
                            value: source[key.name]
                        }))
                    };
                    return this._options.blobLinkCreator(id);
                }
                return null;
            }

            // resolve connections
            if (Array.isArray(field)) {
                return {
                    total: field.length,
                    ...connectionFromArray(field, args)
                };
            }
            return field;
        }

        const result = await SQLJoiner.join(info, {minify: false}, (sql: string) => {
            console.log(sql);
            return context.query(sql);
        });

        return {
            total: result.length,
            ...connectionFromArray(result, args)
        };
    }
}