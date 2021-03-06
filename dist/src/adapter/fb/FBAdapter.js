"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const nesthydrationjs_1 = __importDefault(require("nesthydrationjs"));
const graphql_relay_1 = require("graphql-relay");
const graphql_url_1 = require("graphql-url");
const Schema_1 = require("../../Schema");
const FBDatabase_1 = __importDefault(require("./FBDatabase"));
const SQLJoiner_1 = __importDefault(require("../SQLJoiner"));
const SQLObjectKey_1 = __importDefault(require("../SQLObjectKey"));
const FBObject_1 = __importDefault(require("./FBObject"));
class FBAdapter {
    constructor(source, options) {
        this._source = source;
        this._options = options;
    }
    get source() {
        return this._source;
    }
    static _convertType(type) {
        switch (type) {
            case 261:
                return Schema_1.SchemaFieldTypes.BLOB;
            case 7:
            case 8:
            case 16:
                return Schema_1.SchemaFieldTypes.INT;
            case 10:
            case 11:
            case 27:
                return Schema_1.SchemaFieldTypes.FLOAT;
            case 12:
            case 13:
            case 35:
                return Schema_1.SchemaFieldTypes.DATE;
            case 14:
            case 37:
            case 40:
            default:
                return Schema_1.SchemaFieldTypes.STRING;
        }
    }
    async getObjects() {
        return await FBDatabase_1.default.executeDatabase(this.source, async (database) => {
            const { include, exclude, includePattern, excludePattern } = this._options;
            const includeEscaped = include ? include.map((item) => `'${item}'`) : [];
            const excludeEscaped = exclude ? exclude.map((item) => `'${item}'`) : [];
            const result = await database.query(`
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
            const definition = [{
                    id: { column: "tableName", id: true },
                    name: { column: "tableName" },
                    description: { column: "tableName" },
                    fields: [{
                            id: { column: "fieldName", id: true },
                            name: "fieldName",
                            description: { column: "fieldName" },
                            primary: { column: "primaryFlag", type: "BOOLEAN", default: false },
                            type: { column: "fieldType", type: FBAdapter._convertType },
                            nonNull: { column: "nullFlag", type: "BOOLEAN", default: false },
                            tableRefKey: { column: "tableRefKey" },
                            fieldRefKey: { column: "fieldRefKey" }
                        }]
                }];
            const tables = nesthydrationjs_1.default().nest(result, definition);
            return tables.map(table => new FBObject_1.default(table.id, table.name, table.description, table.fields.map(field => new SQLObjectKey_1.default(field.id, field.name, field.description, field.nonNull, field.type, field.primary, field.tableRefKey, field.fieldRefKey))));
        });
    }
    async resolve(source, args, context, info) {
        if (source) {
            //resolve fields
            const field = source[info.fieldName];
            //resolve BLOB fields
            if (info.returnType === graphql_url_1.GraphQLUrl && typeof field === "function") {
                const config = info.parentType._typeConfig;
                if (config) {
                    const object = config.object;
                    const primaryKeys = object.findPrimaryKeys();
                    const id = {
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
                return Object.assign({ total: field.length }, graphql_relay_1.connectionFromArray(field, args));
            }
            return field;
        }
        const result = await SQLJoiner_1.default.join(info, { minify: false }, (sql) => {
            console.log(sql);
            return context.query(sql);
        });
        return Object.assign({ total: result.length }, graphql_relay_1.connectionFromArray(result, args));
    }
}
exports.default = FBAdapter;
//# sourceMappingURL=FBAdapter.js.map