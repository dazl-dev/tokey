import type {
    SelectorNode,
    SelectorList,
    FunctionalSelector,
    ImmutableSelectorNode,
    ImmutableSelectorList,
} from '../ast-types.ts';

export interface WalkOptions {
    visitList?: SelectorNode['type'][];
    ignoreList?: SelectorNode['type'][];
}
export type WalkVisitor<AST extends SelectorNode | ImmutableSelectorNode> = (
    node: AST,
    index: number,
    nodes: AST[],
    parents: AST[],
) => number | undefined | void;
const nestEnd = Symbol(`nest-end`);

/**
 * traverse each node of the selector AST from start to end.
 * to control traversal return:
 *  walk.skipNested
 *  walk.skipCurrentSelector
 *  walk.stopAll
 *
 * @param topNode the top AST to traverse down from
 * @param visit function to call for each traversed element
 * @param options provide visitList/ignoreList for traversal
 */
export function walk<AST extends SelectorNode | SelectorList>(
    topNode: AST,
    visit: WalkVisitor<SelectorNode>,
    options?: WalkOptions,
): void;
export function walk<AST extends ImmutableSelectorNode | ImmutableSelectorList>(
    topNode: AST,
    visit: WalkVisitor<ImmutableSelectorNode>,
    options?: WalkOptions,
): void;
export function walk<
    AST extends SelectorNode | SelectorList | ImmutableSelectorNode | ImmutableSelectorList,
>(
    topNode: AST,
    visit: WalkVisitor<SelectorNode> | WalkVisitor<ImmutableSelectorNode>,
    options: WalkOptions = {},
): void {
    // set initial top nodes to traverse
    const toVisit: Array<SelectorNode | ImmutableSelectorNode | typeof nestEnd> = Array.isArray(
        topNode,
    )
        ? [...topNode]
        : [topNode];
    // initiate context
    const context = createWalkContext(topNode);
    // iterate nodes
    while (toVisit.length) {
        const current = toVisit.shift()!;
        if (current === nestEnd) {
            // end of nested level
            context.up();
            continue;
        } else if (
            (!options.ignoreList || !options.ignoreList.includes(current.type)) &&
            (!options.visitList || options.visitList.includes(current.type))
        ) {
            // visit node
            let skipAmount =
                (visit(
                    current as SelectorNode,
                    context.indexInSelector,
                    context.nodesInSelector as SelectorNode[],
                    context.parents as SelectorNode[],
                ) as number) ?? -1;
            // point to next selector node
            context.next();

            // check if to skip nested or current/following selectors
            if (skipAmount === Infinity) {
                // stop all: fast bail out
                return;
            } else if (skipAmount >= 0) {
                // skip levels
                while (skipAmount > 0 && toVisit.length) {
                    const next = toVisit.shift()!;
                    if (next === nestEnd) {
                        skipAmount--;
                        context.up();
                    }
                }
                continue;
            }
        } else {
            // point to next selector node
            context.next();
        }
        // add nested nodes
        if (isWithNodes(current)) {
            context.insertNested(current);
            toVisit.unshift(...current.nodes, nestEnd);
        }
    }
}

interface WalkContext<AST> {
    parents: AST[];
    indexInSelector: number;
    nodesInSelector: ReadonlyArray<AST>;
    up(): void;
    next(): void;
    insertNested(node: ContainerWithNodes): void;
}
function createWalkContext(topNode: SelectorNode | SelectorList): WalkContext<SelectorNode>;
function createWalkContext(
    topNode: ImmutableSelectorNode | ImmutableSelectorList,
): WalkContext<ImmutableSelectorNode>;
function createWalkContext(
    topNode: SelectorNode | SelectorList | ImmutableSelectorNode | ImmutableSelectorList,
) {
    const prevIndex: number[] = [];
    const prevParents: ImmutableSelectorNode[][] = [[]];
    const context: WalkContext<SelectorNode | ImmutableSelectorNode> = {
        parents: [],
        indexInSelector: 0,
        nodesInSelector: Array.isArray(topNode)
            ? topNode
            : `nodes` in topNode
              ? topNode.nodes!
              : ([topNode] as SelectorNode[]),
        up() {
            context.parents.pop();
            context.indexInSelector = prevIndex.shift()!;
            const currentParents = context.parents;
            const currentParent = currentParents[currentParents.length - 1];
            context.nodesInSelector = currentParent ? (currentParent as any).nodes : topNode;
        },
        next() {
            context.indexInSelector++;
        },
        insertNested(node) {
            context.parents = [...context.parents, node];
            prevParents.push(context.parents);
            prevIndex.unshift(context.indexInSelector);
            context.indexInSelector = 0;
            context.nodesInSelector = node.nodes;
        },
    };
    return context;
}

walk.skipNested = 0 as const;
walk.skipCurrentSelector = 1 as const;
walk.stopAll = Infinity;

type ContainerWithNodes = FunctionalSelector & { nodes: SelectorNode[] };
function isWithNodes(node: any): node is ContainerWithNodes {
    return node && `nodes` in node;
}
