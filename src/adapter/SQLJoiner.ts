import NestHydrationJS from "nesthydrationjs";
import {GraphQLResolveInfo} from "graphql";
import Analyzer from "./Analyzer";
import AliasNamespace from "./AliasNamespace";
import SQLObject from "./SQLObject";

export type Callback<Result> = (sql: string) => Promise<Result> | Result;

export interface IOptions {
    minify?: boolean;
}

export default class SQLJoiner {

    public static async join<T>(info: GraphQLResolveInfo, options: IOptions, callback: Callback<T>): Promise<any> {
        const analyzer = new Analyzer();

        const queries = analyzer.resolveInfo(info);

        const sqlQueries = queries.map(query => {
            return SQLObject.createQuery(query, new AliasNamespace(options.minify));
        });
        const result = await callback(sqlQueries[0].sql);   //TODO
        return NestHydrationJS().nest(result, sqlQueries[0].definitions);
    }
}