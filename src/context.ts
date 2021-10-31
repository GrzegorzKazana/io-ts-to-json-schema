import type { JSONSchema7 } from 'json-schema';
import * as t from 'io-ts';

export type Context = {
    codecPath: Array<string>;
    schemaPath: Array<string>;
    availableDefs: Record<string, string>;
    customizer: (schema: JSONSchema7, codec: t.Mixed, context: Context) => JSONSchema7;
};

export const Context = {
    withDefaults: (opts: Partial<Context>): Context => ({
        codecPath: [],
        schemaPath: [],
        availableDefs: {},
        customizer: t.identity,
        ...opts,
    }),

    extendCodecPath: (opts: Context, pathChunk: string): Context => ({
        ...opts,
        codecPath: [...opts.codecPath, pathChunk],
    }),

    extendSchemaPath: (opts: Context, pathChunk: string[]): Context => ({
        ...opts,
        schemaPath: [...opts.schemaPath, ...pathChunk],
    }),

    extendPaths: (
        opts: Context,
        { codec, schema }: { codec: string; schema: string[] },
    ): Context => ({
        ...opts,
        codecPath: [...opts.codecPath, codec],
        schemaPath: [...opts.schemaPath, ...schema],
    }),

    extendDefs: (opts: Context, name: string, path: string): Context => ({
        ...opts,
        availableDefs: {
            ...opts.availableDefs,
            [name]: path,
        },
    }),

    materializeSchemaPath: (opts: Context): string => `#/${opts.schemaPath.join('/')}`,
};
