import { ID, ISchemaObjectKey, SchemaFieldTypes } from "../Schema";
export default abstract class SchemaObjectKey implements ISchemaObjectKey {
    constructor(id: ID, originalName: string, description: string, nonNull: boolean, type: SchemaFieldTypes, objectRefID: ID);
    private _id;
    id: ID;
    private _originalName;
    originalName: string;
    private _name;
    name: string;
    private _description;
    description: string;
    private _nonNull;
    nonNull: boolean;
    private _type;
    type: SchemaFieldTypes;
    private _objectRefID;
    objectRefID: ID;
}
