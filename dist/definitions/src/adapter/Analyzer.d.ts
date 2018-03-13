import { FieldNode, FragmentDefinitionNode, GraphQLOutputType, GraphQLResolveInfo } from "graphql";
import { Args } from "../Schema";
import SQLObject from "./SQLObject";
import SQLObjectKey from "./SQLObjectKey";
export declare type Fragments = {
    [fragmentName: string]: FragmentDefinitionNode;
};
export declare type SkipRelayConnectionResult = {
    parentType: GraphQLOutputType;
    fieldNode: FieldNode;
};
export interface IQueryField<Object extends SQLObject<SQLObjectKey>, Key extends SQLObjectKey> {
    key: Key;
    selectionValue?: string;
    query?: IQuery<Object, Key>;
}
export interface IQuery<Object extends SQLObject<SQLObjectKey>, Key extends SQLObjectKey> {
    args: Args;
    object: Object;
    fields: IQueryField<Object, Key>[];
}
export interface IContext {
    fragments: Fragments;
    variableValues: Args;
}
export default class Analyzer<Object extends SQLObject<SQLObjectKey>, Key extends SQLObjectKey> {
    private static skipListType(type);
    private static skipNonNullType(type);
    private static skipRelayConnection(parentType, fieldNode, context);
    private static spreadFragments(selections, fragments, typeName);
    resolveInfo(info: GraphQLResolveInfo): IQuery<Object, Key>[];
    private analyze(fieldNode, parentType, context);
}
