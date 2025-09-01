import { testTokenizer as test } from '@tokey/test-kit';
import { trimTokens } from '../../helpers.ts';
import type { Token } from '@tokey/core';

const trimSpace = (tokens: Token[]) => trimTokens(tokens, (token) => token.type === 'space');

function prettyPrint(items: Token[]) {
    (items as any).toJSON = function () {
        return items.map(({ type }) => type).join(' ');
    };
    return items;
}

describe(`helpers/trim-tokens`, () => {
    it(`empty`, () => {
        test([], trimSpace, []);
    });
    it(`should remove multiple before & after`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'text', value: 'value' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
    it(`should remove single before & after`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'text', value: 'value' },
                { end: 0, start: 0, type: 'space', value: ' ' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
    it(`should remove single after`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'text', value: 'value' },
                { end: 0, start: 0, type: 'space', value: ' ' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
    it(`should remove single before `, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'text', value: 'value' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
    it(`should not trim when there is nothing to trim`, () => {
        test(prettyPrint([{ end: 0, start: 0, type: 'text', value: 'value' }]), trimSpace, [
            { end: 0, start: 0, type: 'text', value: 'value' },
        ]);
    });
    it(`should trim all when all is "trimmable" (multiple)`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
            ]),
            trimSpace,
            [],
        );
    });
    it(`should trim all when all is "trimmable" (single)`, () => {
        test(prettyPrint([{ end: 0, start: 0, type: 'space', value: ' ' }]), trimSpace, []);
    });
    it(`should remove multiple after`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'text', value: 'value' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
    it(`should remove multiple before`, () => {
        test(
            prettyPrint([
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'space', value: ' ' },
                { end: 0, start: 0, type: 'text', value: 'value' },
            ]),
            trimSpace,
            [{ end: 0, start: 0, type: 'text', value: 'value' }],
        );
    });
});
