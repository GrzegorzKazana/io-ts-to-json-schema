# io-ts-to-json-schema

Transform `io-ts` codecs to json schema.

Escape hatch for interfacing [io-ts](https://github.com/gcanti/io-ts) and [json schema](https://json-schema.org/) validations.

## usage/examples

```bash
npm i io-ts-to-json-schema
# fp-ts and io-ts are package peerDependencies
# so make sure you have these also installed
```

```ts
import * as t from 'io-ts';
import { toJsonSchema } from 'io-ts-to-json-schema';

const codec = t.type({
    a: t.string,
    b: t.union([t.string, t.null]),
});

toJsonSchema(codec);
// {
//     "type": "object",
//     "description": "{ a: string, b: (string | null) }",
//     "properties": {
//         "a": {
//             "type": "string",
//             "description": "string"
//         },
//         "b": {
//             "anyOf": [
//                 {
//                     "type": "string",
//                     "description": "string"
//                 },
//                 {
//                     "type": "null",
//                     "description": "null"
//                 }
//             ],
//             "description": "(string | null)"
//         }
//     },
//     "required": [
//         "a",
//         "b"
//     ]
// }
```

## features

-   ### built-in codec support table

| codec             | status | comment                                                                                                                                                                                                                                                                      |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t.null`          | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.string`        | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.number`        | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.bigint`        | ⚠️     | treated like `number`                                                                                                                                                                                                                                                        |
| `t.boolean`       | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.undefined`     | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.void`          | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.any`           | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.unknown`       | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.UnknownArray`  | ⚠️     | unrepresentable in JSON, falls back to `{ type: 'array', items: {} }`                                                                                                                                                                                                        |
| `t.UnknownRecord` | ⚠️     | unrepresentable in JSON, falls back to `{ type: 'object' }`                                                                                                                                                                                                                  |
| `t.Function`      | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.Refinement`    | ⚠️     | unrepresentable in JSON, falls back to `{}`                                                                                                                                                                                                                                  |
| `t.literal`       | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.recursion`     | ✅     | due to single top down codec traversal, additional definitions may be placed in other places than root level `$deps`. see the [tests](https://github.com/GrzegorzKazana/io-ts-to-json-schema/blob/ecdeb80b5fea90c4824c58e668b6685cfc79440b/src/__tests__/index.test.ts#L113) |
| `t.array`         | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.type`          | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.partial`       | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.record`        | ✅     | assumes domain is `string`                                                                                                                                                                                                                                                   |
| `t.union`         | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.intersection`  | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.tuple`         | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.readonly`      | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.readonlyArray` | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.strict`        | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.keyof`         | ✅     | -                                                                                                                                                                                                                                                                            |
| `t.exact`         | ✅     | -                                                                                                                                                                                                                                                                            |

-   ### output customization

Each node in the schema can be customized or completely replaced. This allows you to add support for your custom `t.Type`s.

```ts
const codec = t.type(
    {
        a: t.string,
        b: t.union([t.string, t.null], 'StringOrNull'),
    },
    'FooBar',
);

const descriptions = {
    FooBar: 'some description for foobar',
    StringOrNull: 'some description for string | null',
};

// e.g. attaching custom descriptions
const schema = toJsonSchema(codec, {
    customizer: (schema, codec, context) => ({
        ...schema,
        description: descriptions[codec.name],
    }),
});
// {
//     "type": "object",
//     "required": [
//         "a",
//         "b"
//     ],
//     "properties": {
//         "a": {
//             "type": "string"
//         },
//         "b": {
//             "anyOf": [
//                 {
//                     "type": "string"
//                 },
//                 {
//                     "type": "null"
//                 }
//             ],
//             "description": "some description for string | null"
//         }
//     },
//     "description": "some description for foobar"
// }
```

-   ### codec customization

Each entered codec can be manipulated beforehand.

```ts
const codec = t.type(
    {
        a: t.string,
        b: t.union([t.string, t.null], 'StringOrNull'),
    },
    'FooBar',
);

const schema = toJsonSchema(codec, {
    codecCustomizer: codec => {
        if (codec.name !== 'FooBar' || !(codec instanceof t.InterfaceType)) return codec;

        // omit single field
        const { a: _, ...props } = codec.props;

        return t.type(props, codec.name);
    },
});
// {
//     "type": "object",
//     "required": [
//         "b"
//     ],
//     "properties": {
//         "b": {
//             "anyOf": [
//                 {
//                     "type": "string"
//                 },
//                 {
//                     "type": "null"
//                 }
//             ]
//         }
//     },
// }
```
