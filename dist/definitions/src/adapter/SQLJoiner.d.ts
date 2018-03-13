import { GraphQLResolveInfo } from "graphql";
export declare type Callback<Result> = (sql: string) => Promise<Result> | Result;
export interface IOptions {
    minify?: boolean;
}
export default class SQLJoiner {
    static join<T>(info: GraphQLResolveInfo, options: IOptions, callback: Callback<T>): Promise<any>;
}
