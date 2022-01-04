import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

import { Context } from './context';
import { isNotEmpty, mapValues } from './utils';

declare module 'json-schema' {
    interface JSONSchema7 {
        $defs?: Record<string, JSONSchema7>;
    }
}

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
    AnyType: 'AnyType',
    ObjectType: 'ObjectType',
    StrictType: 'StrictType',
    KeyofType: 'KeyofType',
    ExactType: 'ExactType',
} as const;

export type Json = null | number | string | boolean | Array<Json> | { [k: string]: Json };
export { Context };

export function toJsonSchema(codec: t.Mixed, options: Partial<Context> = {}): JSONSchema7 {
    const toJsonSchema = createToJsonSchema(Context.withDefaults(options));

    return toJsonSchema(codec);
}

function isTaggedCodec(codec: t.Mixed): codec is TaggedCodec {
    return t.type({ _tag: t.keyof(CodecTags) }).is(codec);
}

function createToJsonSchema(opts: Context) {
    return (codec: t.Mixed): JSONSchema7 => {
        const options = Context.extendCodecPath(opts, codec.name);
        const customizedCodec = opts.codecCustomizer(codec, opts);
        const schema = isTaggedCodec(customizedCodec)
            ? taggedToSchema(customizedCodec, options)
            : {};

        return opts.customizer(schema, customizedCodec, opts);
    };
}

function taggedToSchema(codec: TaggedCodec, options: Context): JSONSchema7 {
    switch (codec._tag) {
        case CodecTags.ArrayType:
        case CodecTags.ReadonlyArrayType: {
            const opts = Context.extendPaths(options, { codec: codec.name, schema: ['items'] });
            const toJsonSchema = createToJsonSchema(opts);

            return {
                type: 'array',
                description: codec.name,
                items: toJsonSchema(codec.type),
            };
        }

        case CodecTags.AnyArrayType: {
            const opts = Context.extendPaths(options, { codec: codec.name, schema: ['items'] });
            const toJsonSchema = createToJsonSchema(opts);

            return {
                type: 'array',
                description: codec.name,
                items: toJsonSchema(t.any),
            };
        }
        case CodecTags.NullType:
            return { type: 'null', description: codec.name };

        case CodecTags.StringType:
            return { type: 'string', description: codec.name };

        case CodecTags.NumberType:
            return { type: 'number', description: codec.name };

        case CodecTags.BigIntType:
            return { type: 'number', description: codec.name };

        case CodecTags.BooleanType:
            return { type: 'boolean', description: codec.name };

        case CodecTags.AnyDictionaryType:
            return { type: 'object', description: codec.name };

        case CodecTags.LiteralType:
            return { const: codec.value, description: codec.name };

        case CodecTags.ObjectType:
            return { type: 'object', description: codec.name };

        case CodecTags.InterfaceType: {
            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['properties'],
            });

            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, (codec, key) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [key])),
                ),
                required: Object.keys(codec.props),
            };
        }

        case CodecTags.ExactType: {
            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['properties'],
            });

            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.type.props, (codec, key) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [key])),
                ),
                required: Object.keys(codec.type.props),
                additionalProperties: false,
            };
        }

        case CodecTags.StrictType: {
            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['properties'],
            });

            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, (codec, key) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [key])),
                ),
                required: Object.keys(codec.props),
                additionalProperties: false,
            };
        }

        case CodecTags.PartialType: {
            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['properties'],
            });

            return {
                type: 'object',
                description: codec.name,
                properties: mapValues(codec.props, (codec, key) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [key])),
                ),
            };
        }

        case CodecTags.DictionaryType: {
            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['additionalProperties'],
            });
            const toJsonSchema = createToJsonSchema(opts);

            return {
                type: 'object',
                description: codec.name,
                additionalProperties: toJsonSchema(codec.codomain),
            };
        }

        case CodecTags.UnionType: {
            const opts = Context.extendPaths(options, { codec: codec.name, schema: ['anyOf'] });
            const innerTypes: TaggedCodec[] = codec.types;

            return {
                anyOf: innerTypes.map((codec, idx) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [`${idx}`])),
                ),
                description: codec.name,
            };
        }
        case CodecTags.IntersectionType: {
            const opts = Context.extendPaths(options, { codec: codec.name, schema: ['allOf'] });
            const innerTypes: TaggedCodec[] = codec.types;

            return {
                allOf: innerTypes.map((codec, idx) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [`${idx}`])),
                ),
                description: codec.name,
            };
        }
        case CodecTags.TupleType: {
            const opts = Context.extendPaths(options, { codec: codec.name, schema: ['items'] });
            const innerTypes: TaggedCodec[] = codec.types;

            return {
                type: 'array',
                description: codec.name,
                items: innerTypes.map((codec, idx) =>
                    toJsonSchema(codec, Context.extendSchemaPath(opts, [`${idx}`])),
                ),
                minItems: codec.types.length,
                maxItems: codec.types.length,
            };
        }
        case CodecTags.ReadonlyType:
            return toJsonSchema(codec.type);

        case CodecTags.KeyofType:
            return isNotEmpty(codec.keys)
                ? { enum: Object.keys(codec.keys), description: codec.name }
                : {};

        case CodecTags.RecursiveType: {
            if (options.availableDefs[codec.name])
                return { $ref: options.availableDefs[codec.name] };

            const opts = Context.extendPaths(options, {
                codec: codec.name,
                schema: ['$defs', codec.name],
            });
            const path = Context.materializeSchemaPath(opts);
            const recursiveOpts = Context.extendDefs(opts, codec.name, path);
            const toJsonSchema = createToJsonSchema(recursiveOpts);

            const innerCodec: TaggedCodec = codec.runDefinition();

            return {
                $ref: path,
                $defs: {
                    [codec.name]: toJsonSchema(innerCodec),
                },
            };
        }

        case CodecTags.AnyType:
        case CodecTags.UndefinedType:
        case CodecTags.VoidType:
        case CodecTags.UnknownType:
        case CodecTags.FunctionType:
        case CodecTags.RefinementType:
        default:
            return {};
    }
}
