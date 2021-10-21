import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

export type TaggedCodec =
    | t.NullType
    | t.UndefinedType
    | t.VoidType
    | t.UnknownType
    | t.StringType
    | t.NumberType
    | t.BigIntType
    | t.BooleanType
    | t.AnyArrayType
    | t.AnyDictionaryType
    | t.FunctionType
    | t.RefinementType<any>
    | t.LiteralType<any>
    | t.RecursiveType<any>
    | t.ArrayType<any>
    | t.InterfaceType<any>
    | t.PartialType<any>
    | t.DictionaryType<any, any>
    | t.UnionType<any>
    | t.IntersectionType<any>
    | t.TupleType<any>
    | t.ReadonlyType<any>
    | t.ReadonlyArrayType<any>
    | t.TaggedUnionType<any, any>
    | t.NeverType
    | t.AnyType
    | t.ObjectType
    | t.StrictType<any>
    | t.KeyofType<any>
    | t.ExactType<any>;

export function toJsonSchema(codec: TaggedCodec): JSONSchema7 {
    switch (codec._tag) {
        case 'ArrayType':
        case 'ReadonlyArrayType':
            return {
                type: 'array',
                items: toJsonSchema(codec.type),
            };

        case 'NullType':
            return { type: 'null' };

        case 'UndefinedType':
        case 'VoidType':
            return {};

        case 'UnknownType':
            return {};

        case 'StringType':
            return { type: 'string' };

        case 'NumberType':
            return { type: 'number' };

        case 'BigIntType':
            return { type: 'number' };

        case 'BooleanType':
            return { type: 'boolean' };

        case 'AnyArrayType':
            return {
                type: 'array',
                items: {},
            };

        case 'AnyDictionaryType':
            return { type: 'object' };

        case 'FunctionType':
        case 'RefinementType':
            return {};

        case 'LiteralType':
            return { const: codec.value };

        case 'RecursiveType':
            // TODO
            return {};

        case 'InterfaceType':
            return {
                type: 'object',
                properties: mapValues(codec.props, toJsonSchema),
                required: Object.keys(codec.props),
            };

        case 'ExactType':
            return {
                type: 'object',
                properties: mapValues(codec.type.props, toJsonSchema),
                required: Object.keys(codec.type.props),
                additionalProperties: false,
            };

        case 'StrictType':
            return {
                type: 'object',
                properties: mapValues(codec.props, toJsonSchema),
                required: Object.keys(codec.props),
                additionalProperties: false,
            };

        case 'PartialType':
            return {
                type: 'object',
                properties: mapValues(codec.props, toJsonSchema),
            };

        case 'DictionaryType':
            return {
                type: 'object',
                additionalProperties: toJsonSchema(codec.codomain),
            };

        case 'UnionType':
            return { anyOf: codec.types.map(toJsonSchema) };

        case 'IntersectionType':
            return { allOf: codec.types.map(toJsonSchema) };

        case 'TupleType':
            return {
                type: 'array',
                items: codec.types.map(toJsonSchema),
                minItems: codec.types.length,
                maxItems: codec.types.length,
            };

        case 'ReadonlyType':
            return toJsonSchema(codec.type);

        case 'NeverType':
            return {};

        case 'AnyType':
            return {};

        case 'ObjectType':
            return { type: 'object' };

        case 'KeyofType':
            return { enum: Object.keys(codec.keys) };
    }
}

export function mapValues<R extends Record<keyof any, unknown>, T>(
    obj: R,
    fn: (v: R[keyof R], k: keyof R) => T,
): { [K in keyof R]: T } {
    const typedEntries = Object.entries(obj) as Array<[keyof R, R[keyof R]]>;

    return typedEntries.reduce((acc, [k, v]) => {
        acc[k] = fn(v, k);
        return acc;
    }, {} as { [K in keyof R]: T });
}
