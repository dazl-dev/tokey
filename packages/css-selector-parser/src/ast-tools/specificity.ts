import type { ImmutableSelectorNode, ImmutablePseudoClass, SelectorNode } from '../ast-types.ts';
import { walk } from './walk.ts';

export type Specificity = [
    inlineLevel: number,
    idLevel: number,
    classOrAttributeLevel: number,
    typeOrElementLevel: number,
];
export function calcSpecificity(ast: ImmutableSelectorNode): Specificity {
    const result: Specificity = [0, 0, 0, 0];
    // ToDo: remove casting once immutable walk is supported
    walk(ast as SelectorNode, (node) => {
        switch (node.type) {
            case `type`:
            case `pseudo_element`:
                result[3]++;
                break;
            case `class`:
            case `attribute`:
                result[2]++;
                break;
            case `pseudo_class`:
                if (customPseudoClass[node.value]) {
                    customPseudoClass[node.value](node, result);
                    return walk.skipNested;
                }
                result[2]++;
                break;
            case `id`:
                result[1]++;
                break;
        }
        return node.type !== `selector` && node.type !== `compound_selector`
            ? walk.skipNested
            : undefined;
    });
    return result;
}

const customPseudoClass: Record<string, (node: ImmutablePseudoClass, result: Specificity) => void> =
    {
        not: mostSpecificInnerSelector,
        is: mostSpecificInnerSelector,
        has: mostSpecificInnerSelector,
        where: () => {
            /* no specificity*/
        },
        'nth-child': pseudoClassPlusMostSpecificInnerSelector,
        'nth-last-child': pseudoClassPlusMostSpecificInnerSelector,
        'nth-of-type': pseudoClassPlusMostSpecificInnerSelector,
        'nth-last-of-type': pseudoClassPlusMostSpecificInnerSelector,
    };

function pseudoClassPlusMostSpecificInnerSelector(node: ImmutablePseudoClass, result: Specificity) {
    result[2]++;
    mostSpecificInnerSelector(node, result);
}
function mostSpecificInnerSelector(node: ImmutablePseudoClass, result: Specificity) {
    if (node.nodes?.length) {
        let highest: Specificity = [0, 0, 0, 0];
        for (const selector of node.nodes) {
            const currentSpecificity = calcSpecificity(selector);
            if (!highest || compareSpecificity(currentSpecificity, highest) === 1) {
                highest = currentSpecificity;
            }
        }
        addSpecificity(result, highest);
    }
}
/**
 * compare 2 specificities
 * @param a first specificity
 * @param b second specificity
 * @returns 0 if equal, 1 when a is more specific, -1 when b is more specific
 */
export function compareSpecificity(a: Specificity, b: Specificity): -1 | 0 | 1 {
    for (let i = 0; i < 4; ++i) {
        const specificityDiff = a[i] - b[i];
        if (specificityDiff > 0) {
            return 1;
        } else if (specificityDiff < 0) {
            return -1;
        }
    }
    return 0;
}

/**
 * mutate the first value, adding the second one
 * @param to specificity reference to to
 * @param from specificity amount to add
 */
function addSpecificity(to: Specificity, from: Specificity) {
    for (let i = 0; i < 4; ++i) {
        to[i] += from[i];
    }
}
