import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

import { toJsonSchema, TaggedCodec, mapValues } from '../index';

describe('converting io-ts to json schema', () => {
    describe('primitives', () => {
        it('should work for primitives', () => {
            expectSchemaMatch(t.string, { type: 'string' });
            expectSchemaMatch(t.number, { type: 'number' });
            expectSchemaMatch(t.null, { type: 'null' });
            expectSchemaMatch(t.literal('foo'), { const: 'foo' });
            expectSchemaMatch(t.literal(42), { const: 42 });
        });
    });

    describe('objects', () => {
        it('should work for plain objects', () => {
            expectSchemaMatch(t.type({ foo: t.string, bar: t.type({ baz: t.number }) }), {
                type: 'object',
                required: ['foo', 'bar'],
                properties: {
                    foo: { type: 'string' },
                    bar: {
                        type: 'object',
                        required: ['baz'],
                        properties: { baz: { type: 'number' } },
                    },
                },
            });
        });

        it('should work for dictionaries', () => {
            expectSchemaMatch(t.dictionary(t.string, t.string), {
                type: 'object',
                additionalProperties: { type: 'string' },
            });
            expectSchemaMatch(t.dictionary(t.string, t.number), {
                type: 'object',
                additionalProperties: { type: 'number' },
            });
        });

        it('should work for partial types', () => {
            expectSchemaMatch(t.partial({ foo: t.string, bar: t.type({ baz: t.number }) }), {
                type: 'object',
                properties: {
                    foo: { type: 'string' },
                    bar: {
                        type: 'object',
                        required: ['baz'],
                        properties: { baz: { type: 'number' } },
                    },
                },
            });
        });

        it('should work for exact/strict types', () => {
            expectSchemaMatch(t.strict({ foo: t.string, bar: t.type({ baz: t.number }) }), {
                type: 'object',
                required: ['foo', 'bar'],
                additionalProperties: false,
                properties: {
                    foo: { type: 'string' },
                    bar: {
                        type: 'object',
                        required: ['baz'],
                        properties: { baz: { type: 'number' } },
                    },
                },
            });
            expectSchemaMatch(t.exact(t.type({ foo: t.string, bar: t.type({ baz: t.number }) })), {
                type: 'object',
                required: ['foo', 'bar'],
                additionalProperties: false,
                properties: {
                    foo: { type: 'string' },
                    bar: {
                        type: 'object',
                        required: ['baz'],
                        properties: { baz: { type: 'number' } },
                    },
                },
            });
        });
    });

    describe('arrays', () => {
        it('should work for primitive arrays', () => {
            expectSchemaMatch(t.array(t.number), { type: 'array', items: { type: 'number' } });
            expectSchemaMatch(t.array(t.string), { type: 'array', items: { type: 'string' } });
            expectSchemaMatch(t.array(t.null), { type: 'array', items: { type: 'null' } });
        });

        it('should work for object types', () => {
            expectSchemaMatch(t.array(t.type({ foo: t.number })), {
                type: 'array',
                items: { type: 'object', properties: { foo: { type: 'number' } } },
            });
        });

        it('should work for tuples', () => {
            expectSchemaMatch(t.tuple([t.string, t.number, t.string]), {
                type: 'array',
                items: [{ type: 'string' }, { type: 'number' }, { type: 'string' }],
                minItems: 3,
                maxItems: 3,
            });
        });
    });
});

function expectSchemaMatch(codec: TaggedCodec, schema: JSONSchema7) {
    expect(toJsonSchema(codec)).toEqual(expectDef(schema));
}
function expectDef(definition: JSONSchema7) {
    return isObject(definition) ? deepObjectContaining(definition) : definition;
}
function deepObjectContaining(obj: Record<keyof any, unknown>) {
    return expect.objectContaining(
        mapValues(obj, v => (isObject(v) ? expect.objectContaining(v) : v)),
    );
}
function isObject(item: unknown): item is Record<keyof any, unknown> {
    return !!item && typeof item === 'object';
}
