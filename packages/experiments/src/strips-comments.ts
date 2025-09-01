import {
    createToken,
    getJSCommentStartType,
    getMultilineCommentStartType,
    getText,
    getUnclosedComment,
    isComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
    type Descriptors,
    type Token,
} from '@tokey/core';

const isDelimiter = () => false;
const shouldAddToken = (type: Descriptors) => !isComment(type);

export function stripComments(source: string, parseLineComments = true) {
    const tokens = tokenize<Token<Descriptors>>(source, {
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
    });

    return getText(tokens);
}
