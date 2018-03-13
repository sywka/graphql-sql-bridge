import {ID, ISchemaObjectKey, SchemaFieldTypes} from "../Schema";

export default abstract class SchemaObjectKey implements ISchemaObjectKey {

    constructor(id: ID, originalName: string, description: string, nonNull: boolean, type: SchemaFieldTypes, objectRefID: ID) {
        this._id = id;
        this._originalName = originalName;
        this._description = description;
        this._nonNull = nonNull;
        this._type = type;
        this._objectRefID = objectRefID;
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

    private _nonNull: boolean;

    get nonNull(): boolean {
        return this._nonNull;
    }

    set nonNull(value: boolean) {
        this._nonNull = value;
    }

    private _type: SchemaFieldTypes;

    get type(): SchemaFieldTypes {
        return this._type;
    }

    set type(value: SchemaFieldTypes) {
        this._type = value;
    }

    private _objectRefID: ID;

    get objectRefID(): ID {
        return this._objectRefID;
    }

    set objectRefID(value: ID) {
        this._objectRefID = value;
    }
}