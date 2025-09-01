import type { Token } from './types.ts';

export interface TokyOptions<T extends Token<unknown>> {
    shouldAddToken(type: T['type'], value: string): boolean;
    isStringDelimiter(char: string, previousChar: string): boolean;
    isDelimiter(char: string, previousChar: string): boolean;
    isWhitespace(char: string): boolean;
    getCommentStartType(ch: string, source: string, nextCharIndex: number): string;
    isCommentEnd(
        inComment: string,
        ch: string,
        source: string,
        nextCharIndex: number,
        previousChar: string,
    ): boolean;
    getUnclosedComment(inComment: string): string;
    createToken(value: string, type: T['type'], start: number, end: number): T;
    shouldClose?(ch: string, previousChar: string): boolean;
    offset?: number;
}

export function tokenize<T extends Token<unknown>>(
    source: string,
    {
        shouldClose,
        isDelimiter,
        isStringDelimiter,
        isWhitespace,
        shouldAddToken,
        createToken,
        getCommentStartType,
        isCommentEnd,
        getUnclosedComment,
        offset = 0,
    }: TokyOptions<T>,
): T[] {
    const tokens: T[] = [];
    let previousChar = '';
    let buffer = '';
    let inComment = '';
    let inString = '';
    let start = offset;
    let nextCharIndex = 0;
    for (const ch of source) {
        nextCharIndex += ch.length;
        if (inString) {
            buffer += ch;
            if (ch === inString && previousChar !== '\\') {
                pushBuffer('string');
                inString = '';
            }
        } else if (inComment) {
            buffer += ch;
            if (isCommentEnd(inComment, ch, source, nextCharIndex, previousChar)) {
                pushBuffer(inComment);
                inComment = '';
            }
        } else if ((inComment = getCommentStartType(ch, source, nextCharIndex))) {
            pushBuffer();
            buffer += ch;
        } else if (isStringDelimiter(ch, previousChar)) {
            pushBuffer();
            buffer += ch;
            inString = ch;
        } else if (isDelimiter(ch, previousChar)) {
            pushBuffer();
            buffer += ch;
            pushBuffer(ch);
        } else if (isWhitespace(ch) && !isWhitespace(previousChar)) {
            pushBuffer();
            buffer += ch;
        } else if (!isWhitespace(ch) && isWhitespace(previousChar)) {
            pushBuffer();
            buffer += ch;
        } else if (shouldClose?.(ch, previousChar)) {
            pushBuffer();
            buffer += ch;
            pushBuffer(ch);
        } else {
            buffer += ch;
        }
        previousChar = ch;
    }
    if (buffer.length) {
        if (inComment) {
            pushBuffer(getUnclosedComment(inComment));
        } else if (inString) {
            pushBuffer('unclosed-string');
        } else {
            pushBuffer();
        }
    }
    function pushBuffer(type?: T['type']) {
        if (buffer.length === 0) {
            return;
        }
        const end = start + buffer.length;
        type = type ?? (buffer.trim().length ? 'text' : 'space');
        if (shouldAddToken(type, buffer)) {
            tokens[tokens.length] = createToken(buffer, type, start, end);
        }
        start = end;
        buffer = '';
    }
    return tokens;
}
