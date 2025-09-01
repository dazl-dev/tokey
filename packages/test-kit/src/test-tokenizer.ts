import { isMatch } from './is-match.ts';
export function testTokenizer<T, U>(input: T, aFn: (input: T) => U, expected: U) {
    const actual = aFn(input);
    const normInput = JSON.stringify(input);
    if (!isMatch(actual, expected)) {
        const e = JSON.stringify(expected, null, 2);
        const a = JSON.stringify(actual, null, 2);
        throw new Error(`Fail Input: ${normInput}\n${a}\nTo\n${e}`);
    }
    return actual;
}
