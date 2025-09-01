import { type Token, last } from '@tokey/core';
import type {
    Combinator,
    Comment,
    NamespacedNode,
    Nth,
    Selector,
    SelectorList,
    SelectorNode,
} from './ast-types.ts';
import type { CSSSelectorToken } from './tokenizer.ts';

// create ast nodes

export function createEmptySelector(): Selector {
    return {
        type: 'selector',
        start: -1,
        end: -1,
        before: '',
        after: '',
        nodes: [],
    };
}

export function createEmptyNth(): Nth {
    return {
        type: 'nth',
        start: -1,
        end: -1,
        before: '',
        after: '',
        nodes: [],
    };
}

export function createCombinatorAst({
    value,
    type,
    start,
    end,
}: CSSSelectorToken & Token<'space' | '+' | '>' | '~'>): Combinator {
    return {
        type: `combinator`,
        combinator: type,
        value: type === `space` ? value[0] : value,
        start,
        end,
        before: ``,
        after: type === `space` ? value.slice(1) : ``,
        invalid: false,
    };
}

export function createCommentAst({ value, start, end }: CSSSelectorToken): Comment {
    return {
        type: `comment`,
        value,
        start,
        end,
        before: ``,
        after: ``,
    };
}

// type guards

export function isCombinatorToken(
    token: CSSSelectorToken,
): token is Token<'space' | '+' | '>' | '~'> {
    return token.type === 'space' || token.type === '+' || token.type === '>' || token.type === '~';
}

export function isNamespacedToken(token: CSSSelectorToken): token is Token<'text' | '*'> {
    return token.type === `*` || token.type === `text`;
}
export function isNamespacedAst(token: SelectorNode): token is NamespacedNode {
    return token.type === `universal` || token.type === `type`;
}

// utils

export function ensureSelector(selectors: SelectorList, startToken: CSSSelectorToken) {
    let lastSelector = last(selectors);
    if (!lastSelector) {
        lastSelector = createEmptySelector();
        lastSelector.start = startToken.start;
        selectors.push(lastSelector);
    }
    return lastSelector;
}

export function trimCombinators(selector: Selector) {
    // costly way to turn combinators to before and after.
    // this can be inlined in the handle token process
    const nodes = selector.nodes;
    const firstNode = nodes[0];
    const lastNode = last(nodes);
    // remove first space combinator and add to selector before
    // (going between comment is not required for the start because they are taken care
    // of during parsing)
    if (firstNode?.type === 'combinator' && firstNode.combinator === 'space') {
        selector.nodes.shift();
        selector.before += firstNode.before + firstNode.value + firstNode.after;
    }
    // remove any edge space combinators (last and between comments)
    if (lastNode && lastNode !== firstNode) {
        let index = nodes.length - 1;
        let current = lastNode;
        let lastComment: Comment | undefined;
        while (
            current &&
            (current.type === `comment` ||
                (current.type === `combinator` && current.combinator === `space`))
        ) {
            if (current.type === `combinator`) {
                if (!lastComment) {
                    // attach space to end of selector
                    selector.nodes.pop();
                    selector.after += current.before + current.value + current.after;
                } else {
                    // attach space to start of comment
                    selector.nodes.splice(index, 1);
                    lastComment.before += current.before + current.value + current.after;
                    lastComment.start = current.start;
                }
            } else {
                lastComment = current;
            }
            current = nodes[--index];
        }
    }
}
