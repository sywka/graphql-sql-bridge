"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const values_1 = require("graphql/execution/values");
const AliasNamespace_1 = require("./AliasNamespace");
class Analyzer {
    static skipListType(type) {
        if (type instanceof graphql_1.GraphQLList) {
            return type.ofType;
        }
        return type;
    }
    static skipNonNullType(type) {
        if (type instanceof graphql_1.GraphQLNonNull) {
            return type.ofType;
        }
        return type;
    }
    static skipRelayConnection(parentType, fieldNode, context) {
        if (parentType instanceof graphql_1.GraphQLObjectType) {
            const edgesType = parentType.getFields().edges.type;
            if (edgesType instanceof graphql_1.GraphQLList && edgesType.ofType instanceof graphql_1.GraphQLObjectType) {
                const nodeType = edgesType.ofType.getFields().node.type;
                const edges = Analyzer.spreadFragments(fieldNode.selectionSet.selections, context.fragments, parentType.name)
                    .find(selection => selection.name.value === "edges");
                if (edges) {
                    const node = Analyzer.spreadFragments(edges.selectionSet.selections, context.fragments, parentType.name)
                        .find(selection => selection.name.value === "node");
                    if (node)
                        return { parentType: nodeType, fieldNode: node };
                }
            }
        }
        return { parentType, fieldNode };
    }
    static spreadFragments(selections, fragments, typeName) {
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
    //TODO multiply primary field
    createDefinitions(query) {
        return [].concat(query.fields.reduce((definitions, field) => {
            let definition;
            if (field.query) {
                definition = this.createDefinitions(field.query);
            }
            else {
                definition = { column: field.alias };
            }
            definitions[field.selectionValue ? field.selectionValue : field.key.name] = definition;
            return definitions;
        }, {}));
    }
    resolveInfo(info, namespace) {
        const parentType = info.parentType;
        const context = {
            namespace,
            fragments: info.fragments,
            variableValues: info.variableValues
        };
        if (info.fieldNodes.length) {
            return info.fieldNodes.reduce((queries, fieldNode) => {
                const query = this.analyze(fieldNode, parentType, context, null);
                if (query)
                    queries.push(query);
                return queries;
            }, []);
        }
        return [];
    }
    analyze(fieldNode, parentType, context, alias) {
        parentType = Analyzer.skipNonNullType(parentType);
        parentType = Analyzer.skipListType(parentType);
        let args;
        if (parentType instanceof graphql_1.GraphQLObjectType) {
            const field = parentType.getFields()[fieldNode.name.value];
            args = values_1.getArgumentValues(field, fieldNode, context.variableValues);
            let fieldType = Analyzer.skipNonNullType(field.type);
            fieldType = Analyzer.skipListType(fieldType);
            const skippedRelay = Analyzer.skipRelayConnection(fieldType, fieldNode, context);
            parentType = skippedRelay.parentType;
            fieldNode = skippedRelay.fieldNode;
        }
        const config = parentType._typeConfig;
        if (config && config.object) {
            const object = config.object;
            const queryAlias = context.namespace.generate(AliasNamespace_1.Type.TABLE, object.originalName);
            const query = {
                args,
                object: object,
                alias: queryAlias,
                fields: []
            };
            if (alias === null)
                alias = "";
            else if (alias)
                alias = `${alias}${queryAlias}__`;
            else
                alias = `${queryAlias}__`;
            if (parentType instanceof graphql_1.GraphQLObjectType) {
                const queryFields = fieldNode.selectionSet.selections.reduce((fields, selection) => {
                    const field = parentType.getFields()[selection.name.value];
                    const fieldKey = field.key;
                    if (fieldKey) {
                        fields.push({
                            key: fieldKey,
                            selectionValue: selection.name.value,
                            alias: alias + context.namespace.generate(AliasNamespace_1.Type.COLUMN, fieldKey.originalName),
                            query: this.analyze(selection, parentType, context, alias)
                        });
                    }
                    return fields;
                }, []);
                const queryPrimaryFields = query.object.findPrimaryKeys()
                    .filter(key => !queryFields.find(field => !field.query && field.key === key))
                    .map(key => ({
                    key: key,
                    alias: alias + context.namespace.generate(AliasNamespace_1.Type.COLUMN, key.originalName)
                }));
                query.fields = queryPrimaryFields
                    .concat(queryFields)
                    .sort((a, b) => {
                    if (a.key.primary && !b.key.primary)
                        return -1;
                    if (b.key.primary && !a.key.primary)
                        return 1;
                    return 0;
                });
            }
            return query;
        }
    }
}
exports.default = Analyzer;
//# sourceMappingURL=Analyzer.js.map