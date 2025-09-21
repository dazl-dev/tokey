import type { Token } from './types.ts';

/**
 * Minimal token traverse helper used to create structure from tokens
 */
export class Seeker<T extends Token<unknown>> {
    index = -1;
    public tokens: T[];

    constructor(tokens: T[]) {
        this.tokens = tokens;
    }
    next() {
        this.index++;
        return this.tokens[this.index] || { type: '' };
    }
    back() {
        this.index--;
    }
    peekBack() {
        return this.tokens[this.index - 1] || { type: '' };
    }
    peek(num = 1) {
        return this.tokens[this.index + num] || { type: '' };
    }
    take(type: T['type']) {
        if (this.peek().type === type) {
            return this.next();
        }
        return undefined;
    }
    eat(type: T['type']) {
        while (this.peek().type === type) {
            this.index++;
        }
        return this;
    }
    takeMany(type: T['type']) {
        const tokens = [];
        while (this.peek().type === type) {
            tokens.push(this.next());
        }
        return tokens;
    }
    flatBlock(start: string, end: string, isEndError?: (token: Token<any>) => boolean) {
        let token = this.next();
        if (token.type !== start) {
            return [];
        }
        const block = [];
        let endIndex;
        while ((token = this.next())) {
            if (!token.type) {
                if (endIndex !== undefined) {
                    this.index = endIndex - 1;
                }
                return;
            }
            if (isEndError && isEndError(token)) {
                endIndex = this.index;
            }
            if (token.type === end) {
                return block;
            } else {
                block.push(token);
            }
        }
        return [];
    }
    done() {
        return this.index >= this.tokens.length - 1;
    }
    run<A>(
        handleToken: (token: T, ast: A, source: string, seeker: this) => void | boolean,
        ast: A,
        source: string,
    ) {
        let token;
        while ((token = this.next()) && token.type) {
            if (handleToken(token, ast, source, this) === false) {
                break;
            }
        }
        return ast;
    }
}
