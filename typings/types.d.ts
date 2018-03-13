import {
    FieldDefinitionNode,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLFieldMap,
    GraphQLFieldResolver,
    GraphQLInterfaceType,
    GraphQLIsTypeOfFn,
    GraphQLOutputType,
    ObjectTypeDefinitionNode,
    Thunk,
    TypeExtensionNode
} from "graphql";

declare module "graphql" {

    import {ISchemaObject, ISchemaObjectKey} from "../src";

    export class GraphQLObjectType {
        name: string;
        description: string;
        astNode?: ObjectTypeDefinitionNode;
        extensionASTNodes: Array<TypeExtensionNode>;
        isTypeOf: GraphQLIsTypeOfFn<any, any>;

        constructor(config: GraphQLObjectTypeConfig<any, any>);

        getFields(): GraphQLFieldMap<any, any>;

        getInterfaces(): GraphQLInterfaceType[];

        toString(): string;
    }

    export interface GraphQLObjectTypeConfig<TSource, TContext> {
        name: string;
        interfaces?: Thunk<GraphQLInterfaceType[]>;
        fields: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
        isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext>;
        description?: string;
        astNode?: ObjectTypeDefinitionNode;
        extensionASTNodes?: Array<TypeExtensionNode>;

        objects?: ISchemaObject[];
        object?: ISchemaObject;

        sqlTable?: string;
        uniqueKey?: string | string[];
    }

    export interface GraphQLFieldConfig<TSource, TContext, TArgs = { [argName: string]: any }> {
        type: GraphQLOutputType;
        args?: GraphQLFieldConfigArgumentMap;
        resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
        subscribe?: GraphQLFieldResolver<TSource, TContext, TArgs>;
        deprecationReason?: string;
        description?: string;
        astNode?: FieldDefinitionNode;

        key?: ISchemaObjectKey;
        objectRef?: ISchemaObject;

        sqlColumn?: string;
    }

}