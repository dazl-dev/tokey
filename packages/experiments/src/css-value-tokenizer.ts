import {
    createToken,
    getJSCommentStartType,
    getMultilineCommentStartType,
    getText,
    getUnclosedComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
    type Descriptors,
    type Token,
} from '@tokey/core';

type Delimiters = '(' | ')' | ',';
export type SeparatorTokens = 'line-comment' | 'multi-comment' | 'space';
export type CSSValueCodeToken = Token<Descriptors | Delimiters>;
export type CSSSeparatorTokens = Token<SeparatorTokens>;
export type CSSCodeAst = StringNode | MethodCall | TextNode | CommaNode;
export interface ASTNode<Types = Descriptors> {
    type: Types;
    text: string;
    start: number;
    end: number;
    before: CSSSeparatorTokens[];
    after: CSSSeparatorTokens[];
}

export interface MethodCall extends ASTNode<'call'> {
    name: string;
    args: CSSCodeAst[];
}
export type StringNode = ASTNode<'string'>;
export type TextNode = ASTNode<'text'>;
export type CommaNode = ASTNode<','>;

export const isSeparatorToken = (token: CSSValueCodeToken): token is CSSSeparatorTokens => {
    const { type } = token;
    return type === 'line-comment' || type === 'multi-comment' || type === 'space';
};

export function createCssValueAST(source: string, parseLineComments = false): CSSCodeAst[] {
    return parseDeclValueTokens(
        source,
        tokenize<CSSValueCodeToken>(source, {
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
    ).ast;
}

const isDelimiter = (char: string) => char === '(' || char === ')' || char === ',';

const shouldAddToken = () => true;

function parseDeclValueTokens(
    source: string,
    tokens: CSSValueCodeToken[],
    startAtIdx = 0,
): { ast: CSSCodeAst[]; stoppedAtIdx: number } {
    const ast: CSSCodeAst[] = [];
    let before: CSSSeparatorTokens[] = [];
    for (let i = startAtIdx; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === ')') {
            const lastAst = ast[ast.length - 1];
            if (lastAst && before.length) {
                lastAst.after = before;
                before = [];
            }
            return {
                ast,
                stoppedAtIdx: i,
            };
        } else if (isSeparatorToken(token)) {
            before.push(token);
        } else if (token.type === 'text' && tokens[i + 1]?.type === '(') {
            const res = parseDeclValueTokens(source, tokens, i + 2);
            const methodText = getText(tokens, i, res.stoppedAtIdx + 1, source);
            i = res.stoppedAtIdx;
            ast.push({
                type: 'call',
                text: methodText,
                start: token.start,
                end: token.start + methodText.length,
                before,
                after: [],
                name: token.value,
                args: res.ast,
            });
            before = [];
        } else {
            ast.push({
                type: token.type as any,
                text: token.value,
                start: token.start,
                end: token.end,
                before,
                after: [],
            });
            before = [];
        }
    }

    return {
        ast,
        stoppedAtIdx: tokens.length,
    };
}
