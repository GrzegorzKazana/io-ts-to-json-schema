import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

import { hasKey, isNotEmpty, mapValues } from './utils';

export type TaggedCodec =
    | t.NullC
    | t.UndefinedC
    | t.VoidC
    | t.UnknownC
    | t.StringC
    | t.NumberC
    | t.BigIntC
    | t.BooleanC
    | t.UnknownArrayC
    | t.UnknownRecordC
    | t.FunctionC
    | t.RefinementC<any>
    | t.LiteralC<any>
    | t.RecursiveType<any>
    | t.ArrayC<any>
    | t.TypeC<any>
    | t.PartialC<any>
    | t.RecordC<any, any>
    | t.UnionC<any>
    | t.IntersectionC<any>
    | t.TupleC<any>
    | t.ReadonlyC<any>
    | t.ReadonlyArrayC<any>
    | t.TaggedUnionC<any, any>
    // | t.NeverC
    | t.AnyC
    | t.ObjectC
    | t.StrictC<any>
    | t.KeyofC<any>
    | t.ExactC<any>;

type Tags = { [K in TaggedCodec['_tag']]: K };

const CodecTags: Tags = {
    NullType: 'NullType',
    UndefinedType: 'UndefinedType',
    VoidType: 'VoidType',
    UnknownType: 'UnknownType',
    StringType: 'StringType',
    NumberType: 'NumberType',
    BigIntType: 'BigIntType',
    BooleanType: 'BooleanType',
    AnyArrayType: 'AnyArrayType',
    AnyDictionaryType: 'AnyDictionaryType',
    FunctionType: 'FunctionType',
    RefinementType: 'RefinementType',
    LiteralType: 'LiteralType',
    RecursiveType: 'RecursiveType',
    ArrayType: 'ArrayType',
    InterfaceType: 'InterfaceType',
    PartialType: 'PartialType',
    DictionaryType: 'DictionaryType',
    UnionType: 'UnionType',
    IntersectionType: 'IntersectionType',
    TupleType: 'TupleType',
    ReadonlyType: 'ReadonlyType',
    ReadonlyArrayType: 'ReadonlyArrayType',
    // NeverType: 'NeverType',
    AnyType: 'AnyType',
    ObjectType: 'ObjectType',
    StrictType: 'StrictType',
    KeyofType: 'KeyofType',
    ExactType: 'ExactType',
} as const;

function isTaggedCodec(codec: t.Mixed): codec is TaggedCodec {
    return hasKey(codec, '_tag') && typeof codec._tag === 'string' && codec._tag in CodecTags;
}

export type Json = null | number | string | boolean | Array<Json> | { [k: string]: Json };

export function toJsonSchema(codec: TaggedCodec): JSONSchema7 {
    switch (codec._tag) {
        case 'ArrayType':
        case 'ReadonlyArrayType':
            return {
                type: 'array',
                description: codec.name,
                items: toJsonSchema(codec.type),
            };

        case 'NullType':
            return { type: 'null', description: codec.name };

        case 'StringType':
            return { type: 'string', description: codec.name };

        case 'NumberType':
            return { type: 'number', description: codec.name };

        case 'BigIntType':
            return { type: 'number', description: codec.name };

        case 'BooleanType':
            return { type: 'boolean', description: codec.name };

        case 'AnyDictionaryType':
            return { type: 'object', description: codec.name };

        case 'LiteralType':
            return { const: codec.value, description: codec.name };

        case 'ObjectType':
            return { type: 'object', description: codec.name };

        case 'InterfaceType':
            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, toJsonSchema),
                required: Object.keys(codec.props),
            };

        case 'ExactType':
            return {
                type: 'object',
                description: codec.name,

                properties: mapValues(codec.type.props, toJsonSchema),
                required: Object.keys(codec.type.props),
                additionalProperties: false,
            };

        case 'StrictType':
            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, toJsonSchema),
                required: Object.keys(codec.props),
                additionalProperties: false,
            };

        case 'PartialType':
            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, toJsonSchema),
            };

        case 'DictionaryType':
            return {
                type: 'object',
                description: codec.name,
                additionalProperties: toJsonSchema(codec.codomain),
            };

        case 'UnionType':
            return { anyOf: codec.types.map(toJsonSchema), description: codec.name };

        case 'IntersectionType':
            return { allOf: codec.types.map(toJsonSchema), description: codec.name };

        case 'TupleType':
            return {
                type: 'array',
                description: codec.name,
                items: codec.types.map(toJsonSchema),
                minItems: codec.types.length,
                maxItems: codec.types.length,
            };

        case 'ReadonlyType':
            return toJsonSchema(codec.type);

        case 'KeyofType':
            return isNotEmpty(codec.keys)
                ? { enum: Object.keys(codec.keys), description: codec.name }
                : {};

        case 'RecursiveType':
            // TODO
            return {};

        // case 'NeverType':
        case 'AnyType':
        case 'UndefinedType':
        case 'VoidType':
        case 'UnknownType':
        case 'FunctionType':
        case 'RefinementType':
            return {};

        case 'AnyArrayType':
            return {
                type: 'array',
                description: codec.name,
                items: {},
            };
    }
}
