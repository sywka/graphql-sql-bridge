import { ID, ISchemaObject, ISchemaObjectKey } from "../Schema";
export default abstract class SchemaObject<T extends ISchemaObjectKey> implements ISchemaObject {
    constructor(id: ID, originalName: string, description: string, keys: T[]);
    private _id;
    id: ID;
    private _originalName;
    originalName: string;
    private _name;
    name: string;
    private _description;
    description: string;
    private _keys;
    keys: T[];
}
