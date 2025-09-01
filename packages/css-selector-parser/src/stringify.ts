import { NthParser } from './nth-parser.ts';
import type {
    ImmutableId,
    ImmutableAttribute,
    ImmutableClass,
    ImmutableCombinator,
    ImmutableComment,
    ImmutableType,
    ImmutableInvalid,
    ImmutableNth,
    ImmutableNthDash,
    ImmutableNthOf,
    ImmutableNthOffset,
    ImmutableNthStep,
    ImmutablePseudoClass,
    ImmutablePseudoElement,
    ImmutableSelector,
    ImmutableCompoundSelector,
    ImmutableUniversal,
    ImmutableNesting,
    ImmutableSelectorNode,
    ImmutableSelectorList,
    ImmutableNthSelectorList,
    ImmutableFunctionalSelector,
    ImmutableNamespacedNode,
} from './ast-types.ts';

export function stringifySelectorAst(
    value: ImmutableSelectorNode | ImmutableSelectorList | ImmutableNthSelectorList,
): string {
    return 'length' in value ? stringifySelectors(value) : stringifyNode(value);
}

type Printers = {
    [K in ImmutableSelectorNode as K['type']]: (node: K) => string;
};

const printers: Printers = {
    id: (node: ImmutableId) => `#${node.value}${stringifyNested(node)}`,
    class: (node: ImmutableClass) =>
        `.${node.dotComments.map(stringifyNode).join('')}${node.value}${stringifyNested(node)}`,
    type: (node: ImmutableType) =>
        `${stringifyNamespace(node)}${node.value}${stringifyNested(node)}`,
    combinator: (node: ImmutableCombinator) => `${node.before}${node.value}${node.after}`,
    attribute: (node: ImmutableAttribute) => `[${node.value}]${stringifyNested(node)}`,
    pseudo_class: (node: ImmutablePseudoClass) =>
        `:${node.colonComments.map(stringifyNode).join('')}${node.value}${stringifyNested(node)}`,
    pseudo_element: (node: ImmutablePseudoElement) =>
        `:${node.colonComments.first.map(stringifyNode).join('')}:${node.colonComments.second
            .map(stringifyNode)
            .join('')}${node.value}${stringifyNested(node)}`,
    comment: ({ before, value, after }: ImmutableComment) => `${before}${value}${after}`,
    universal: (node: ImmutableUniversal) =>
        `${stringifyNamespace(node)}${node.value}${stringifyNested(node)}`,
    nesting: (node: ImmutableNesting) => `${node.value}${stringifyNested(node)}`,
    selector: (node: ImmutableSelector) =>
        `${node.before}${node.nodes.map(stringifyNode).join('')}${node.after}`,
    compound_selector: (node: ImmutableCompoundSelector) =>
        `${node.before}${node.nodes.map(stringifyNode).join('')}${node.after}`,
    invalid: (node: ImmutableInvalid) => node.value,
    nth: (node: ImmutableNth) =>
        `${node.before}${node.nodes.map(stringifyNode).join('')}${node.after}`,
    nth_step: ({ before, value, after }: ImmutableNthStep) => `${before}${value}${after}`,
    nth_dash: ({ before, value, after }: ImmutableNthDash) => `${before}${value}${after}`,
    nth_offset: ({ before, value, after }: ImmutableNthOffset) => `${before}${value}${after}`,
    nth_of: ({ before, value, after }: ImmutableNthOf) => `${before}${value}${after}`,
};

function stringifyNode(node: ImmutableSelectorNode): string {
    return printers[node.type]?.(node as never) ?? '';
}

function stringifySelectors(selectors: ReadonlyArray<ImmutableSelector | ImmutableNth>) {
    const result: string[] = [];
    for (const node of selectors) {
        result.push(stringifyNode(node));
    }
    return result.join(`,`);
}

function stringifyNested(node: ImmutableFunctionalSelector): string {
    if ('nodes' in node) {
        if (node.nodes?.length) {
            if (node.type === `pseudo_class` && NthParser.isNthPseudoClass(node.value)) {
                const [nthNode, ...selectors] = node.nodes;
                return `(${stringifyNode(nthNode)}${stringifySelectors(selectors)})`;
            } else {
                return `(${stringifySelectors(node.nodes)})`;
            }
        } else {
            return `()`;
        }
    }
    return '';
}

function stringifyNamespace({ namespace }: ImmutableNamespacedNode): string {
    let ns = ``;
    if (namespace) {
        ns += namespace.value;
        for (const comment of namespace.beforeComments) {
            ns += printers.comment(comment);
        }
        ns += `|`;
        for (const comment of namespace.afterComments) {
            ns += printers.comment(comment);
        }
    }
    return ns;
}
