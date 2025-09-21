import {
    createToken,
    getJSCommentStartType,
    getMultilineCommentStartType,
    getUnclosedComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
    type Descriptors,
    type Token,
} from '@tokey/core';

type Delimiters = '(' | ')' | ',' | ';' | ':';

export type CSSCodeToken = Token<Descriptors | Delimiters>;

export type CSSCodeTokenGroup = {
    tokens: CSSCodeToken[];
    start: number;
    end: number;
};

export function tokenizeCSSUrls(source: string, parseLineComments = false) {
    return getUrlTokens(
        tokenize<CSSCodeToken>(source, {
            isDelimiter,
            isStringDelimiter,
            isWhitespace,
            shouldAddToken,
            createToken,
            getCommentStartType: parseLineComments
                ? getJSCommentStartType
                : getMultilineCommentStartType,
            isCommentEnd,
            getUnclosedComment,
        }),
    );
}

const isDelimiter = (char: string) =>
    char === '(' || char === ')' || char === ',' || char === ';' || char === ':';

const shouldAddToken = () => true;

function getUrlTokens(tokens: CSSCodeToken[]): CSSCodeTokenGroup[] {
    const urls: CSSCodeTokenGroup[] = [];
    let inUrl;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (inUrl) {
            inUrl.tokens.push(token);
            inUrl.end = token.end;
            if (token.type === ')') {
                urls.push(inUrl);
                inUrl = undefined;
            }
        } else if (token.type === 'text' && token.value === 'url' && tokens[i + 1]?.type === '(') {
            inUrl = { tokens: [token], start: token.start, end: token.end };
        }
    }
    return urls;
}
