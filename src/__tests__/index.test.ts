import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

import { mapValues, isObject } from '../utils';
import { toJsonSchema, TaggedCodec } from '../index';
import { Context } from '../context';

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

    describe('recursive types', () => {
        it('should generate correct schema for array recursion', () => {
            type Foo = Array<Foo>;
            const codec: t.RecursiveType<t.Type<Foo>> = t.recursion('Foo', () => t.array(codec));

            // sanity checks
            expect(codec.is({})).toBe(false);
            expect(codec.is([])).toBe(true);
            expect(codec.is([[], [[]]])).toBe(true);

            expectSchemaMatch(codec, {
                $ref: '#/$defs/Foo',
                $defs: {
                    Foo: {
                        type: 'array',
                        items: { $ref: '#/$defs/Foo' },
                    },
                },
            });
        });

        it('should generate correct schema for object+union recursion', () => {
            type Foo = {
                bar: Foo | null;
            };

            const codec: t.RecursiveType<t.Type<Foo>> = t.recursion('Foo', () =>
                t.type({ bar: t.union([codec, t.null]) }),
            );

            // sanity checks
            expect(codec.is({})).toBe(false);
            expect(codec.is({ bar: null })).toBe(true);
            expect(codec.is({ bar: { bar: { bar: null } } })).toBe(true);

            expectSchemaMatch(codec, {
                $ref: '#/$defs/Foo',
                $defs: {
                    Foo: {
                        type: 'object',
                        required: ['bar'],
                        properties: {
                            bar: {
                                anyOf: [{ $ref: '#/$defs/Foo' }, { type: 'null' }],
                            },
                        },
                    },
                },
            });
        });

        it('should generate correct schema for object+union recursion when nested in another schema', () => {
            type Foo = {
                bar: Foo | null;
            };

            const foo: t.RecursiveType<t.Type<Foo>> = t.recursion('Foo', () =>
                t.type({ bar: t.union([foo, t.null]) }),
            );
            const codec = t.type({ foo });

            // sanity checks
            expect(codec.is({})).toBe(false);
            expect(codec.is({ foo: null })).toBe(false);
            expect(codec.is({ foo: { bar: null } })).toBe(true);
            expect(codec.is({ foo: { bar: { bar: { bar: null } } } })).toBe(true);

            expectSchemaMatch(codec, {
                type: 'object',
                required: ['foo'],
                properties: {
                    foo: {
                        $ref: '#/properties/foo/$defs/Foo',
                        $defs: {
                            Foo: {
                                type: 'object',
                                required: ['bar'],
                                properties: {
                                    bar: {
                                        anyOf: [
                                            { $ref: '#/properties/foo/$defs/Foo' },
                                            { type: 'null' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });

        it('should generate correct schema mutual recursion', () => {
            type Something = string | number | SomethingElse;
            type SomethingElse = Array<Something>;

            const something: t.RecursiveType<t.Type<Something>> = t.recursion('something', () =>
                t.union([t.string, t.number, sthelse]),
            );
            const sthelse: t.RecursiveType<t.Type<SomethingElse>> = t.recursion('sthelse', () =>
                t.array(something),
            );

            const codec = t.type({ a: t.type({ b: something }) });

            // sanity checks
            expect(codec.is({})).toBe(false);
            expect(codec.is({ a: { b: '42' } })).toBe(true);
            expect(codec.is({ a: { b: 42 } })).toBe(true);
            expect(codec.is({ a: { b: ['42', 42] } })).toBe(true);
            expect(codec.is({ a: { b: ['42', 42, ['42', 42, []]] } })).toBe(true);

            expectSchemaMatch(codec, {
                type: 'object',
                required: ['a'],
                properties: {
                    a: {
                        type: 'object',
                        required: ['b'],
                        properties: {
                            b: {
                                $ref: '#/properties/a/properties/b/$defs/something',
                                $defs: {
                                    something: {
                                        anyOf: [
                                            {
                                                type: 'string',
                                            },
                                            {
                                                type: 'number',
                                            },
                                            {
                                                $ref: '#/properties/a/properties/b/$defs/something/anyOf/2/$defs/sthelse',
                                                $defs: {
                                                    sthelse: {
                                                        type: 'array',
                                                        items: {
                                                            $ref: '#/properties/a/properties/b/$defs/something',
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    });

    it('should allow for customizing output', () => {
        const codec = t.type(
            {
                a: t.string,
                b: t.union([t.string, t.null], 'StringOrNull'),
            },
            'FooBar',
        );
        const descriptions: Record<string, string> = {
            FooBar: 'some description for foobar',
            StringOrNull: 'some description for string | null',
        };

        const schema = toJsonSchema(codec, {
            customizer: (schema, codec, context) => ({
                ...schema,
                description:
                    descriptions[codec.name] ||
                    `No description for ${schema.type} at ${Context.materializeSchemaPath(
                        context,
                    )}`,
            }),
        });
        const expected: JSONSchema7 = {
            type: 'object',
            required: ['a', 'b'],
            properties: {
                a: { type: 'string' },
                b: {
                    anyOf: [{ type: 'string' }, { type: 'null' }],
                    description: descriptions.StringOrNull,
                },
            },
            description: descriptions.FooBar,
        };

        expect(schema).toEqual(expectDef(expected));
    });
});

function expectSchemaMatch(codec: TaggedCodec, schema: JSONSchema7) {
    expect(toJsonSchema(codec)).toEqual(expectDef(schema));
}
function expectDef(definition: JSONSchema7) {
    return isObject(definition) ? deepObjectContaining(definition) : definition;
}
function deepObjectContaining(
    obj: Record<keyof any, unknown>,
): ReturnType<typeof expect.objectContaining> {
    return expect.objectContaining(
        mapValues(obj, v => (isObject(v) ? deepObjectContaining(v) : v)),
    );
}
