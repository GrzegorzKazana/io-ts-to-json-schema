import * as fc from 'fast-check';
import * as t from 'io-ts';
import jsf from 'json-schema-faker';

import { isNotEmpty } from '../utils';
import { toJsonSchema } from '../index';

export const jsonCodecArbitrary = fc.letrec(tie => {
    const typedTie = tie as (key: string) => fc.Arbitrary<t.Mixed>;
    const anyTie = fc.oneof(
        { depthFactor: 0.5, maxDepth: 3, withCrossShrink: true },
        typedTie('primitive'),
        typedTie('array'),
        typedTie('object'),
        typedTie('algebraic'),
    );

    return {
        primitive: fc.frequency(
            { arbitrary: fc.constant(t.string), weight: 3 },
            { arbitrary: fc.constant(t.number), weight: 3 },
            { arbitrary: fc.constant(t.null), weight: 2 },
            {
                arbitrary: fc
                    .dictionary(fc.hexa(), fc.constant(null))
                    .filter(isNotEmpty)
                    .map(t.keyof),
                weight: 1,
            },
            { arbitrary: fc.hexa().map(t.literal), weight: 1 },
            { arbitrary: fc.integer().map(t.literal), weight: 1 },
            { arbitrary: fc.float().map(t.literal), weight: 1 },
            { arbitrary: fc.boolean().map(t.literal), weight: 1 },
        ),
        array: fc.oneof(
            anyTie.map(t.array),
            anyTie.map(t.readonlyArray),
            fc
                .array(anyTie, { minLength: 2, maxLength: 4 })
                .map(items => t.tuple(items as unknown as [t.Mixed, t.Mixed])),
        ),
        object: fc.oneof(
            fc.dictionary(fc.hexa(), anyTie).map(t.type),
            fc.dictionary(fc.hexa(), anyTie).map(t.partial),
            fc.dictionary(fc.hexa(), anyTie).map(t.strict),
            fc.dictionary(fc.hexa(), anyTie).map(t.type).map(t.exact),
            fc.tuple(fc.constant(t.string), anyTie).map(([key, value]) => t.record(key, value)),
        ),
        algebraic: fc.oneof(
            fc
                .array(anyTie, { minLength: 2, maxLength: 3 })
                .map(items => t.union(items as unknown as [t.Mixed, t.Mixed])),
            fc
                .array(anyTie, { minLength: 2, maxLength: 3 })
                .map(items => t.intersection(items as unknown as [t.Mixed, t.Mixed])),
        ),
    };
});

describe('io-ts to json schema properties', () => {
    test('it should never throw an error', () => {
        fc.assert(
            fc.property(jsonCodecArbitrary.object, codec => {
                return !!toJsonSchema(codec);
            }),
        );
    });

    test('object generated according to schema should be valid by the input codec', () => {
        fc.assert(
            fc.property(jsonCodecArbitrary.primitive, codec => {
                const schema = toJsonSchema(codec);
                const object = jsf.generate(schema);

                return codec.is(object);
            }),
        );
    });
});
