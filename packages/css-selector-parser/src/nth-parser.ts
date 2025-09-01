import type { CSSSelectorToken } from './tokenizer.ts';
import type { Nth, NthOf, NthOffset, NthStep } from './ast-types.ts';
import { createCommentAst } from './helpers.ts';
import { isComment, Seeker, last } from '@tokey/core';

export class NthParser {
    static isNthPseudoClass(name: string): boolean {
        return (
            name === `nth-child` ||
            name === `nth-last-child` ||
            name === `nth-of-type` ||
            name === `nth-last-of-type`
        );
    }
    /**
     * check (case insensitive) and returns 2 groups:
     * 1. plus/minus sign (invalid step value)
     * 2. odd/even string
     * [
     *  `+`|`-`|undefined,
     *  `odd`|`even`
     * ]
     */
    static oddEvenStep = /([-+]?)(odd|even)/i;
    /**
     * check for valid step
     * starts with optional minus or plus,
     * ends with 0 or more digits following a `n`/`N` character
     */
    static validStep = /^[-+]?\d*n$/i;
    /**
     * check for valid offset
     * starts with optional minus or plus,
     * ends with 1 or more digits
     */
    static validOffset = /^[-+]?\d+$/;
    /**
     * check for valid start of nth expression
     * and returns 2 groups:
     * 1. An: optional minus or plus, 0 or more digits, `n`/`N` character
     * 2. anything after that
     */
    static nthStartExp = /([-+]?\d*[nN]?)(.*)/;

    public state: 'step' | `dash` | `offset` | `of` | `selector` = `step`;
    private standaloneDash = false;
    private ast: Nth['nodes'];
    private selectorNode: Nth;
    private s: Seeker<CSSSelectorToken>;

    constructor(selectorNode: Nth, s: Seeker<CSSSelectorToken>) {
        this.selectorNode = selectorNode;
        this.s = s;
        this.ast = selectorNode.nodes;
    }
    public handleToken(token: CSSSelectorToken): boolean {
        const type = token.type;
        if (type === `text` || type === `+`) {
            switch (this.state) {
                case `step`: {
                    // pickup 1 or more tokens for `5n` / `+5n` / `+5n-4` / `5`
                    const nextToken =
                        type === `+` && this.s.peek().type === `text` ? this.s.next() : undefined;
                    this.breakFirstChunk({
                        type: `text`,
                        value: token.value + (nextToken?.value || ``),
                        start: token.start,
                        end: nextToken?.end || token.end,
                    });
                    return true;
                }
                case `dash`: {
                    const nextToken =
                        type === `+` && this.s.peek().type === `text` ? this.s.next() : undefined;
                    this.pushDash({
                        type: `text`,
                        value: token.value + (nextToken?.value || ``),
                        start: token.start,
                        end: nextToken?.end || token.end,
                    });
                    return true;
                }
                case `offset`: {
                    const nextToken =
                        type === `+` && this.s.peek().type === `text` ? this.s.next() : undefined;
                    this.pushOffset({
                        type: `text`,
                        value: token.value + (nextToken?.value || ``),
                        start: token.start,
                        end: nextToken?.end || token.end,
                    });
                    return true;
                }
                case `of`: {
                    this.pushOf(token);
                    return false;
                }
            }
        } else if (type === `space`) {
            // improve typing
            const lastNode = last(this.ast);
            if (lastNode) {
                lastNode.after += token.value;
                lastNode.end += token.value.length;
            } else {
                // add initial space to top selector
                this.selectorNode.before += token.value;
            }
            return true;
        } else if (isComment(type)) {
            this.ast.push(createCommentAst(token));
            return true;
        }
        // not part of `An+b of`: bail out
        this.s.back();
        return false;
    }
    /**
     * first token can only be (minus contained in text):
     * step: `5n`/`+5n`/`-5n`
     * step & offset: `5n`/`5n-5
     */
    private breakFirstChunk(token: CSSSelectorToken) {
        const value = token.value;
        // find odd/even
        const oddEventMatch = value.match(NthParser.oddEvenStep);
        if (oddEventMatch) {
            const isInvalid = !!oddEventMatch[1];
            this.pushStep(token, isInvalid);
            return;
        }
        // separate valid step start from rest: `-5n-4` / `-5n` / `-4` / `5n-4`
        const matchValidStart = value.match(NthParser.nthStartExp);
        if (!matchValidStart) {
            // invalid step
            this.pushStep(token);
        } else {
            const step = matchValidStart[1];
            const offset = matchValidStart[2];
            if (!offset && !step.match(/[nN]+$/) && step.match(NthParser.validOffset)) {
                // no `n` - just offset
                this.pushOffset(token);
            } else if (offset === `-`) {
                // connected dash: `5n-`
                this.pushStep({
                    type: `text`,
                    value: step,
                    start: token.start,
                    end: token.start + step.length,
                });
                this.pushDash({
                    type: `text`,
                    value: `-`,
                    start: token.end - 1,
                    end: token.end,
                });
            } else if (offset && !offset.match(/-\d+/)) {
                // invalid step: `-3x`
                this.pushStep(token);
            } else {
                // step with potential minus offset: `5n-4`
                this.pushStep({
                    type: `text`,
                    value: step,
                    start: token.start,
                    end: token.start + step.length,
                });
                if (offset) {
                    this.pushOffset({
                        type: `text`,
                        value: offset,
                        start: token.end - offset.length,
                        end: token.end,
                    });
                }
            }
        }
    }
    private pushStep(token: CSSSelectorToken, isInvalid?: boolean) {
        const value = token.value;
        const stepNode: NthStep = {
            type: `nth_step`,
            value,
            before: ``,
            after: ``,
            start: token.start,
            end: token.end,
        };
        isInvalid = isInvalid !== undefined ? isInvalid : !value.match(NthParser.validStep);
        if (isInvalid) {
            stepNode.invalid = true;
        }
        this.state = `dash`;
        this.ast.push(stepNode);
    }
    private pushDash(token: CSSSelectorToken) {
        const value = token.value;
        if (value === `+` || value === `-`) {
            this.ast.push({
                type: `nth_dash`,
                value: token.value,
                start: token.start,
                end: token.end,
                before: ``,
                after: ``,
            });
            this.standaloneDash = true;
            this.state = `offset`;
        } else {
            this.pushOffset(token);
        }
    }
    private pushOffset(token: CSSSelectorToken) {
        if (token.value === `of`) {
            this.pushOf(token);
        } else {
            const value = token.value;
            const offsetNode: NthOffset = {
                type: `nth_offset`,
                value,
                before: ``,
                after: ``,
                start: token.start,
                end: token.end,
            };
            if (
                !value.match(NthParser.validOffset) ||
                (this.standaloneDash && value.match(/^[-+]/))
            ) {
                offsetNode.invalid = true;
            }
            this.state = `of`;
            this.ast.push(offsetNode);
        }
    }
    private pushOf(token: CSSSelectorToken) {
        const ofNode: NthOf = {
            type: `nth_of`,
            value: token.value,
            before: ``,
            after: ``,
            start: token.start,
            end: token.end,
        };
        if (token.value !== `of`) {
            ofNode.invalid = true;
        }
        this.ast.push(ofNode);
        this.state = `selector`;
    }
}
