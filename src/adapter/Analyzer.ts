import {
    FieldNode,
    FragmentDefinitionNode,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLOutputType,
    GraphQLResolveInfo,
    SelectionNode
} from "graphql";
import {getArgumentValues} from "graphql/execution/values";
import {Args} from "../Schema";
import SQLObject from "./SQLObject";
import SQLObjectKey from "./SQLObjectKey";

export type Fragments = { [fragmentName: string]: FragmentDefinitionNode };

export type SkipRelayConnectionResult = { parentType: GraphQLOutputType, fieldNode: FieldNode };

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

    private static skipListType(type: GraphQLOutputType) {
        if (type instanceof GraphQLList) {
            return type.ofType;
        }
        return type;
    }

    private static skipNonNullType(type: GraphQLOutputType) {
        if (type instanceof GraphQLNonNull) {
            return type.ofType;
        }
        return type;
    }

    private static skipRelayConnection(parentType: GraphQLOutputType, fieldNode: FieldNode, context: IContext): SkipRelayConnectionResult {
        if (parentType instanceof GraphQLObjectType) {
            const edgesType = parentType.getFields().edges.type;
            if (edgesType instanceof GraphQLList && edgesType.ofType instanceof GraphQLObjectType) {
                const nodeType = edgesType.ofType.getFields().node.type;

                const edges = Analyzer.spreadFragments(fieldNode.selectionSet.selections, context.fragments, parentType.name)
                    .find(selection => selection.name.value === "edges");

                if (edges) {
                    const node = Analyzer.spreadFragments(edges.selectionSet.selections, context.fragments, parentType.name)
                        .find(selection => selection.name.value === "node");

                    if (node) return {parentType: nodeType, fieldNode: node};
                }
            }
        }
        return {parentType, fieldNode};
    }

    private static spreadFragments(selections: SelectionNode[], fragments: Fragments, typeName: string): FieldNode[] {
        return [].concat(...selections.map(selection => {
            switch (selection.kind) {
                case "FragmentSpread":
                    const fragmentName = selection.name.value;
                    const fragment = fragments[fragmentName];
                    return Analyzer.spreadFragments(fragment.selectionSet.selections, fragments, typeName);
                case "InlineFragment":
                    if (selection.typeCondition.name.value === typeName) {
                        return Analyzer.spreadFragments(selection.selectionSet.selections, fragments, typeName);
                    }
                    return [];

                default:
                    return selection;
            }
        }));
    }

    public resolveInfo(info: GraphQLResolveInfo): IQuery<Object, Key>[] {
        const parentType = info.parentType;
        const context: IContext = {
            fragments: info.fragments,
            variableValues: info.variableValues
        };

        if (info.fieldNodes.length) {
            return info.fieldNodes.reduce((queries, fieldNode) => {
                const query = this.analyze(fieldNode, parentType, context);
                if (query) queries.push(query);
                return queries;
            }, []);
        }
        return [];
    }

    private analyze(fieldNode: FieldNode, parentType: GraphQLOutputType, context: IContext): IQuery<Object, Key> {
        parentType = Analyzer.skipNonNullType(parentType);
        parentType = Analyzer.skipListType(parentType);
        let args;

        if (parentType instanceof GraphQLObjectType) {
            const field = parentType.getFields()[fieldNode.name.value];
            args = getArgumentValues(field, fieldNode, context.variableValues);

            let fieldType = Analyzer.skipNonNullType(field.type);
            fieldType = Analyzer.skipListType(fieldType);

            const skippedRelay = Analyzer.skipRelayConnection(fieldType, fieldNode, context);

            parentType = skippedRelay.parentType;
            fieldNode = skippedRelay.fieldNode;
        }

        const config = (<any> parentType)._typeConfig;

        if (config && config.object) {
            const object: Object = config.object;
            const query: IQuery<Object, Key> = {
                args,
                object: object,
                fields: []
            };

            if (parentType instanceof GraphQLObjectType) {
                const queryFields = fieldNode.selectionSet.selections.reduce((fields, selection: FieldNode) => {
                    const field = (<GraphQLObjectType>parentType).getFields()[selection.name.value];
                    const fieldKey: Key = (<any> field).key;
                    if (fieldKey) {
                        fields.push({
                            key: fieldKey,
                            selectionValue: selection.name.value,
                            query: this.analyze(selection, parentType, context)
                        });
                    }
                    return fields;
                }, <IQueryField<Object, Key>[]>[]);

                const queryPrimaryFields = (<Key[]>query.object.findPrimaryKeys())
                    .filter(key => !queryFields.find(field => !field.query && field.key === key))
                    .map(key => ({key}));

                query.fields = queryPrimaryFields
                    .concat(queryFields)
                    .sort((a, b) => {
                        if (a.key.primary && !b.key.primary) return -1;
                        if (b.key.primary && !a.key.primary) return 1;
                        return 0;
                    });
            }
            return query;
        }
    }
}