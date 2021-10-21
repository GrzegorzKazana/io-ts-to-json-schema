import { mapValues, isNotEmpty, hasKey, isObject } from '../utils';

describe('utils', () => {
    describe('isNotEmpty', () => {
        it('should distinguish empty objects', () => {
            expect(isNotEmpty({})).toBe(false);
            expect(isNotEmpty({ foo: 42 })).toBe(true);
        });
    });

    describe('hasKey', () => {
        it('should detect key presence', () => {
            expect(hasKey({}, '')).toBe(false);
            expect(hasKey({}, 'foo')).toBe(false);
            expect(hasKey({ foo: 42 }, 'bar')).toBe(false);
            expect(hasKey({ foo: 42 }, 'foo')).toBe(true);
        });
    });

    describe('isObject', () => {
        it('should detect objects', () => {
            expect(isObject(null)).toBe(false);
            expect(isObject([])).toBe(true);
            expect(isObject({})).toBe(true);
            expect(isObject({ foo: 42 })).toBe(true);
        });
    });

    describe('mapValues', () => {
        it('should produce deeply equal object when passed identity function', () => {
            const result = mapValues({ foo: 42, bar: '43' }, x => x);
            const expected = { foo: 42, bar: '43' };

            expect(result).toEqual(expected);
        });

        it('should transform object values', () => {
            const result = mapValues({ foo: 42, bar: 43 }, String);
            const expected = { foo: '42', bar: '43' };

            expect(result).toEqual(expected);
        });
    });
});
