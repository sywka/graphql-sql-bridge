import {ID, ISchemaObject, ISchemaObjectKey} from "../Schema";

export default abstract class SchemaObject<T extends ISchemaObjectKey> implements ISchemaObject {

    constructor(id: ID, originalName: string, description: string, keys: T[]) {
        this._id = id;
        this._originalName = originalName;
        this._description = description;
        this._keys = keys;
    }

    private _id: ID;

    get id(): ID {
        return this._id;
    }

    set id(value: ID) {
        this._id = value;
    }

    private _originalName: string;

    get originalName(): string {
        return this._originalName;
    }

    set originalName(value: string) {
        this._originalName = value;
    }

    private _name: string;

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    private _description: string;

    get description(): string {
        return this._description;
    }

    set description(value: string) {
        this._description = value;
    }

    private _keys: T[];

    get keys(): T[] {
        return this._keys;
    }

    set keys(value: T[]) {
        this._keys = value;
    }
}