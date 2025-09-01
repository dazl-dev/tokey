import {
    createToken,
    getJSCommentStartType,
    getMultilineCommentStartType,
    getUnclosedComment,
    groupTokens,
    isComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
    trimTokens,
    type Descriptors,
    type Token,
    type TokenGroup,
} from '@tokey/core';

const shouldAddToken = () => true;

export function getListItems<T extends string>(
    source: string,
    isDelimiter: (char: string) => char is T,
    parseLineComments = true,
) {
    return createListItems(
        tokenize<Token<Descriptors>>(source, {
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
        isDelimiter,
    );
}

function createListItems(
    tokens: Token[],
    isDelimiter: (char: string) => boolean,
    processGroup: (tokens: Token[]) => Token[] = (tokens) =>
        trimTokens(
            tokens.filter(({ type }) => !isComment(type)),
            ({ type }) => type === 'space',
        ),
) {
    const groups: TokenGroup<'list-item'>[] = [];
    let group: Token[] = [];
    for (const token of tokens) {
        if (isDelimiter(token.type)) {
            handleGroup();
            group = [];
        } else {
            group.push(token);
        }
    }
    handleGroup();

    return groups;

    function handleGroup() {
        group = processGroup(group);
        if (group.length) {
            groups.push(groupTokens(group, 'list-item'));
        }
    }
}
