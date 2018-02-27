import FBDatabase from "./FBDatabase";
import { IFBGraphQLContext } from "./FBAdapter";
export default class FBGraphQLContext implements IFBGraphQLContext {
    private readonly _database;
    private readonly _queue;
    constructor(database: FBDatabase);
    query(query: string, params?: any[]): Promise<any[]>;
    execute(query: string, params?: any[]): Promise<any[]>;
}
