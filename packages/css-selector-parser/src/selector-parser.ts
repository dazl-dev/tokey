import { getText, isComment, last, Seeker } from '@tokey/core';
import type {
    Combinator,
    Comment,
    Namespace,
    NamespacedNode,
    Selector,
    SelectorList,
    SelectorNode,
} from './ast-types.ts';
import {
    createCombinatorAst,
    createCommentAst,
    createEmptyNth,
    createEmptySelector,
    ensureSelector,
    isCombinatorToken,
    isNamespacedAst,
    isNamespacedToken,
    trimCombinators,
} from './helpers.ts';
import { NthParser } from './nth-parser.ts';
import { tokenizeSelector, type CSSSelectorToken } from './tokenizer.ts';

export interface ParseConfig {
    offset: number;
}

export function parseCssSelector(source: string, options: Partial<ParseConfig> = {}) {
    return parseTokens(source, tokenizeSelector(source, options));
}

function parseTokens(source: string, tokens: CSSSelectorToken[]): SelectorList {
    return new Seeker(tokens).run<SelectorList>(handleToken, [], source);
}

function handleToken(
    token: CSSSelectorToken,
    selectors: SelectorList,
    source: string,
    s: Seeker<CSSSelectorToken>,
): void {
    let t;
    const currentSelector = ensureSelector(selectors, token);
    const ast = currentSelector.nodes;
    if (token.type === '.') {
        const comments = s.takeMany('multi-comment').map(createCommentAst);
        const name = s.take('text');
        ast.push({
            type: 'class',
            value: name?.value ?? '',
            start: token.start,
            end: name?.end ?? last(comments)?.end ?? token.end,
            dotComments: comments,
        });
    } else if (token.type === ':') {
        const firstComments = s.takeMany('multi-comment').map(createCommentAst);
        const type = s.take(':') || token;
        const isClass = token === type;

        if (isClass) {
            const name = s.take('text');
            const endToken = name || last(firstComments) || type;
            ast.push({
                type: 'pseudo_class',
                value: name?.value ?? '',
                start: token.start,
                end: name?.end ?? endToken.end,
                colonComments: firstComments,
            });
        } else {
            const secondComments = s.takeMany('multi-comment').map(createCommentAst);
            const name = s.take('text');
            const endToken = name || last(secondComments) || type;

            ast.push({
                type: 'pseudo_element',
                value: name?.value ?? '',
                start: token.start,
                end: name?.end ?? endToken.end,
                colonComments: { first: firstComments, second: secondComments },
            });
        }
    } else if (token.type === '[') {
        const block = s.run(
            (token, ast) => {
                ast.push(token);
                return token.type !== ']';
            },
            [token],
            source,
        );
        const closed = last(block)?.type === ']';
        if (closed) {
            ast.push({
                type: 'attribute',
                value: block.length > 2 ? getText(block, 1, block.length - 1, source) : '',
                start: token.start,
                end: last(block)?.end ?? token.end,
            });
        } else {
            ast.push({
                type: 'invalid',
                value: getText(block, undefined, undefined, source),
                start: token.start,
                end: last(block)?.end ?? token.end,
            });
        }
    } else if (isCombinatorToken(token)) {
        let lastCombinatorAst = createCombinatorAst(token);
        let lastAst: Combinator | Comment = lastCombinatorAst;
        // insert token as a combinator
        ast.push(lastCombinatorAst);
        // save the insertion point of the first combinator in case it's a space
        // that might be considered a normal space later and will need to be changed.
        let initialSpaceCombIndex: number =
            lastCombinatorAst.combinator === `space` ? ast.length - 1 : -1;
        /**
         * take next spaces/combinators/comments:
         * - combinator/space token:
         *  - spaces: merge to previous ast node before them
         *  - previous ast equal to space combinator
         *    - turn previous ast to the next combinator type
         *    - merge spaces between them
         *    - cancel initial space tracking - must be merged with other non space combinator or already canceled
         *  - initial ast is space (must be comments following it)
         *    - initial space is first in selector: merge initial ast into the selector before
         *    - otherwise merge initial ast the comment following it
         *  - insert an invalid combinator
         * - comment token: insert to ast
         */
        //
        let next = s.next();
        while (next) {
            if (isCombinatorToken(next)) {
                if (next.type === `space`) {
                    // add space to the last ast node
                    lastAst.after += next.value;
                    lastAst.end = next.end;
                } else if (lastAst === lastCombinatorAst && lastAst.combinator === 'space') {
                    // combine next combinator into previous (space)
                    const nextCombinator = createCombinatorAst(next);
                    lastCombinatorAst.combinator = nextCombinator.combinator;
                    lastCombinatorAst.before +=
                        lastCombinatorAst.after + lastCombinatorAst.value + nextCombinator.before;
                    lastCombinatorAst.after = nextCombinator.after;
                    lastCombinatorAst.value = nextCombinator.value;
                    lastCombinatorAst.end = nextCombinator.end;
                    // reset initial space
                    initialSpaceCombIndex = -1;
                } else if (initialSpaceCombIndex !== -1) {
                    // merge initial space combinator (classified as combinator before a comment)
                    const initialSpace = ast[initialSpaceCombIndex] as Combinator;
                    const spaceValue =
                        initialSpace.before + initialSpace.value + initialSpace.after;
                    if (initialSpaceCombIndex === 0) {
                        // merge to beginning of selector
                        currentSelector.before += spaceValue;
                    } else {
                        // merge to the next comment
                        const nodeAfterInitial = ast[initialSpaceCombIndex + 1];
                        if (nodeAfterInitial?.type === `comment`) {
                            nodeAfterInitial.before += spaceValue;
                            nodeAfterInitial.start = initialSpace.start;
                        } else {
                            // shouldn't happen as initial space is considered as a combinator
                            // only when a comment is following it and before
                        }
                    }
                    ast.splice(initialSpaceCombIndex, 1);
                    initialSpaceCombIndex = -1;
                    // add combinator
                    lastCombinatorAst = createCombinatorAst(next);
                    lastAst = lastCombinatorAst;
                    ast.push(lastCombinatorAst);
                } else {
                    // add invalid combinator
                    lastCombinatorAst = createCombinatorAst(next);
                    lastCombinatorAst.invalid = true;
                    lastAst = lastCombinatorAst;
                    ast.push(lastCombinatorAst);
                }
            } else if (isComment(next.type)) {
                lastAst = createCommentAst(next);
                ast.push(lastAst);
            } else {
                break;
            }
            next = s.next();
        }
        // put back any unrelated token
        if (next && !isCombinatorToken(next)) {
            s.back();
        }
    } else if (token.type === 'text') {
        ast.push({
            type: 'type',
            value: token.value,
            start: token.start,
            end: token.end,
        });
    } else if (token.type === '#') {
        t = s.take('text');
        ast.push({
            type: 'id',
            value: t?.value ?? '',
            start: token.start,
            end: t?.end ?? token.end,
        });
    } else if (token.type === '*') {
        ast.push({
            type: 'universal',
            value: '*',
            start: token.start,
            end: token.end,
        });
    } else if (token.type === '|') {
        // search backwards compatible namespace in ast
        let prevAst: NamespacedNode | undefined;
        let prevInvalidAst: SelectorNode | undefined;
        const beforeComments: Comment[] = [];
        for (let i = ast.length - 1; i >= 0; --i) {
            const current = ast[i];
            if (isNamespacedAst(current)) {
                if (current.namespace) {
                    // already namespaced
                    prevInvalidAst = current;
                } else {
                    // merge with previous
                    prevAst = current;
                }
                break;
            } else if (
                current.type === `comment` &&
                current.before === `` &&
                current.after === ``
            ) {
                beforeComments.unshift(current);
            } else {
                prevInvalidAst = current;
                break;
            }
        }
        // search forward target token
        let target: CSSSelectorToken | undefined;
        let searchIndex = 1;
        const potentialAfterComments: CSSSelectorToken[] = [];
        while (true) {
            const nextToken = s.peek(searchIndex);
            if (isComment(nextToken.type)) {
                potentialAfterComments.push(nextToken);
            } else if (isNamespacedToken(nextToken)) {
                target = nextToken;
                break;
            } else {
                // space or end of tokens
                break;
            }
            searchIndex++;
        }
        // create/update ast
        const validNamespace = !prevInvalidAst;
        const validTarget = !!target;
        const type = target?.type === `*` ? `universal` : `type`;
        let invalid: NonNullable<Namespace['invalid']> = ``;
        // remove before/after pipe comments
        if (validNamespace) {
            ast.splice(ast.length - beforeComments.length, beforeComments.length);
        } else {
            invalid = `namespace`;
        }
        if (validTarget) {
            potentialAfterComments.forEach(() => s.next());
            s.next();
        } else {
            invalid = invalid ? `namespace,target` : `target`;
        }
        // create new ast or modify the prev
        const nsAst: NamespacedNode =
            prevAst ||
            ({
                type,
                value: ``,
                start: token.start,
                end: target?.end || token.end,
            } as NamespacedNode);
        nsAst.type = type;
        nsAst.namespace = {
            value: prevAst?.value || ``,
            beforeComments: validNamespace ? beforeComments : [],
            afterComments: validTarget ? potentialAfterComments.map(createCommentAst) : [],
        };
        nsAst.value = target?.value || ``;
        nsAst.end = target?.end || token.end;
        // set invalid
        if (invalid) {
            nsAst.namespace.invalid = invalid;
        }
        // add ast if not modified
        if (!prevAst) {
            ast.push(nsAst);
        }
    } else if (token.type === '(') {
        const prev = last(ast);
        const res: SelectorList = [];
        // handle nth selector
        if (
            prev &&
            prev.type === `pseudo_class` &&
            NthParser.isNthPseudoClass(prev.value) &&
            s.peek().type !== `)`
        ) {
            // collect "An+B of" expression
            const nthSelector = createEmptyNth();
            nthSelector.start = s.peek().start;
            res.push(nthSelector as unknown as Selector);
            const nthParser = new NthParser(nthSelector, s);
            s.run(
                (token) => {
                    if (nthParser.state === `selector`) {
                        // got to selector, push back and stop
                        s.back();
                        return false;
                    }
                    return nthParser.handleToken(token);
                },
                nthSelector,
                source,
            );
            // setup next selector
            if (s.peek().type !== `)`) {
                nthSelector.end = last(nthSelector.nodes)?.end || nthSelector.start;
                // add "of" selector
                const newSelector = createEmptySelector();
                newSelector.start = nthSelector.end;
                res.push(newSelector);
            }
        }
        // get all tokens until closed
        s.run(
            (token, selectors) => {
                if (token.type === ')') {
                    const currentSelector = last(selectors);
                    if (currentSelector) {
                        currentSelector.end =
                            last(currentSelector.nodes)?.end ?? currentSelector.start;
                    }
                    return false;
                }
                return handleToken(token, selectors, source, s);
            },
            res,
            source,
        );

        const ended = s.peek(0);
        if (
            !prev ||
            'nodes' in prev ||
            prev.type === 'invalid' ||
            prev.type === 'combinator' ||
            prev.type === 'comment' ||
            prev.type === 'nth_step' ||
            prev.type === 'nth_dash' ||
            prev.type === 'nth_offset' ||
            prev.type === 'nth_of' ||
            ended.type !== ')'
        ) {
            ast.push({
                type: 'invalid',
                value: getText([token, ended], undefined, undefined, source),
                start: token.start,
                end: ended?.end ?? s.peekBack().end,
            });
        } else {
            const lastSelector = last(res);
            if (lastSelector) {
                trimCombinators(lastSelector);
            }
            prev.nodes = res;
            prev.end = ended.end;
        }
    } else if (isComment(token.type)) {
        ast.push(createCommentAst(token));
    } else if (token.type === ',') {
        // we ensure at least one selector present
        const selector = last(selectors)!;
        selector.end = token.start;
        trimCombinators(selector);
        const newSelector = createEmptySelector();
        if (s.done()) {
            newSelector.start = token.end;
            newSelector.end = token.end;
        } else {
            newSelector.start = s.peek().start;
        }
        selectors.push(newSelector);
    } else if (token.type === '&') {
        ast.push({
            type: 'nesting',
            value: '&',
            start: token.start,
            end: token.end,
        });
    } else {
        ast.push({
            type: 'invalid',
            value: token.value,
            start: token.start,
            end: token.end,
        });
    }
    if (s.done()) {
        currentSelector.end = last(currentSelector.nodes)?.end ?? currentSelector.start;
        trimCombinators(currentSelector);
    }
}
