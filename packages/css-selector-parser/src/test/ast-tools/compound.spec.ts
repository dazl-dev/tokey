import {
    groupCompoundSelectors,
    parseCssSelector,
    splitCompoundSelectors,
    type CommentWithNoSpacing,
    type ImmutableSelector,
    type ImmutableSelectorList,
    type Nth,
    type PseudoClass,
    type Selector,
    type SelectorList,
} from '@tokey/css-selector-parser';
import { expect } from 'chai';
import { createNode } from '../test-kit/parsing.ts';

describe(`ast-tools/compound`, () => {
    it(`should split a given selector list according to dom targets (by combinators)`, () => {
        const ast = parseCssSelector(`.a .b`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 5,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 2,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `space`,
                        value: ` `,
                        start: 2,
                        end: 3,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 3,
                        end: 5,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 3,
                                end: 5,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should split multiple selectors`, () => {
        const ast = parseCssSelector(`.a,.b .c`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 2,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 2,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                        ],
                    }),
                ],
            }),
            createNode({
                type: `selector`,
                start: 3,
                end: 8,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 3,
                        end: 5,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 3,
                                end: 5,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `space`,
                        value: ` `,
                        start: 5,
                        end: 6,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 6,
                        end: 8,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `c`,
                                start: 6,
                                end: 8,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should keep track of selector spaces`, () => {
        const ast = parseCssSelector(` .a , .b `);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 4,
                before: ` `,
                after: ` `,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 1,
                        end: 3,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 1,
                                end: 3,
                            }),
                        ],
                    }),
                ],
            }),
            createNode({
                type: `selector`,
                start: 5,
                end: 9,
                before: ` `,
                after: ` `,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 6,
                        end: 8,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 6,
                                end: 8,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should split on nesting selectors`, () => {
        const ast = parseCssSelector(`&>&`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 3,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 1,
                        nodes: [
                            createNode({
                                type: `nesting`,
                                value: `&`,
                                start: 0,
                                end: 1,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `>`,
                        value: `>`,
                        start: 1,
                        end: 2,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 2,
                        end: 3,
                        nodes: [
                            createNode({
                                type: `nesting`,
                                value: `&`,
                                start: 2,
                                end: 3,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should split pseudo-elements by default`, () => {
        const ast = parseCssSelector(`.a::b::c`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 8,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 2,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                        ],
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 2,
                        end: 5,
                        nodes: [
                            createNode({
                                type: `pseudo_element`,
                                value: `b`,
                                start: 2,
                                end: 5,
                            }),
                        ],
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 5,
                        end: 8,
                        nodes: [
                            createNode({
                                type: `pseudo_element`,
                                value: `c`,
                                start: 5,
                                end: 8,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should configure no split for pseudo-elements (combined into target)`, () => {
        const ast = parseCssSelector(`.a::b::c`);

        const groupedSelectors = groupCompoundSelectors(ast, {
            splitPseudoElements: false,
        });

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 8,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 8,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `pseudo_element`,
                                value: `b`,
                                start: 2,
                                end: 5,
                            }),
                            createNode({
                                type: `pseudo_element`,
                                value: `c`,
                                start: 5,
                                end: 8,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should configure deep compound unification`, () => {
        const ast = parseCssSelector(`.a:is(.b.c)`);

        const groupedSelectors = groupCompoundSelectors(ast, {
            deep: true,
        });

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 11,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 11,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `pseudo_class`,
                                value: `is`,
                                start: 2,
                                end: 11,
                                nodes: [
                                    createNode({
                                        type: `selector`,
                                        start: 6,
                                        end: 10,
                                        nodes: [
                                            createNode({
                                                type: `compound_selector`,
                                                start: 6,
                                                end: 10,
                                                nodes: [
                                                    createNode({
                                                        type: `class`,
                                                        value: `b`,
                                                        start: 6,
                                                        end: 8,
                                                    }),
                                                    createNode({
                                                        type: `class`,
                                                        value: `c`,
                                                        start: 8,
                                                        end: 10,
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        // ToDo: implement deep split
        // expect(splitCompoundSelectors(groupedSelectors, { deep: true }), `split`).to.eql(ast);
    });
    it(`should not split any other selectors`, () => {
        const ast = parseCssSelector(`.a:hover[attr]+el.b#id`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 22,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 14,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `pseudo_class`,
                                value: `hover`,
                                start: 2,
                                end: 8,
                            }),
                            createNode({
                                type: `attribute`,
                                value: `attr`,
                                start: 8,
                                end: 14,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `+`,
                        value: `+`,
                        start: 14,
                        end: 15,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 15,
                        end: 22,
                        nodes: [
                            createNode({
                                type: `type`,
                                value: `el`,
                                start: 15,
                                end: 17,
                            }),
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 17,
                                end: 19,
                            }),
                            createNode({
                                type: `id`,
                                value: `id`,
                                start: 19,
                                end: 22,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should return zero selectors for empty selector`, () => {
        const ast = parseCssSelector(``);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should combine non breaking comments into the compound nodes`, () => {
        const ast = parseCssSelector(`/*c1*/.a/*c2*/ /*c3*/.b/*c4*/`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 29,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 14,
                        nodes: [
                            createNode({
                                type: `comment`,
                                value: `/*c1*/`,
                                start: 0,
                                end: 6,
                            }) as CommentWithNoSpacing,
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 6,
                                end: 8,
                            }),
                            createNode({
                                type: `comment`,
                                value: `/*c2*/`,
                                start: 8,
                                end: 14,
                            }) as CommentWithNoSpacing,
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `space`,
                        value: ` `,
                        start: 14,
                        end: 15,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 15,
                        end: 29,
                        nodes: [
                            createNode({
                                type: `comment`,
                                value: `/*c3*/`,
                                start: 15,
                                end: 21,
                            }) as CommentWithNoSpacing,
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 21,
                                end: 23,
                            }),
                            createNode({
                                type: `comment`,
                                value: `/*c4*/`,
                                start: 23,
                                end: 29,
                            }) as CommentWithNoSpacing,
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should not split nested selectors`, () => {
        const ast = parseCssSelector(`:has(.a .b)`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 11,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 11,
                        nodes: [
                            createNode({
                                type: `pseudo_class`,
                                value: `has`,
                                start: 0,
                                end: 11,
                                nodes: [
                                    createNode({
                                        type: `selector`,
                                        start: 5,
                                        end: 10,
                                        nodes: [
                                            createNode({
                                                type: `class`,
                                                value: `a`,
                                                start: 5,
                                                end: 7,
                                            }),
                                            createNode({
                                                type: `combinator`,
                                                combinator: `space`,
                                                value: ` `,
                                                start: 7,
                                                end: 8,
                                            }),
                                            createNode({
                                                type: `class`,
                                                value: `b`,
                                                start: 8,
                                                end: 10,
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should accept a single selector`, () => {
        const ast = parseCssSelector(`.a .b, .c~.d`);

        const groupedSelector = groupCompoundSelectors(ast[1]);

        expect(groupedSelector, `group`).to.eql(
            createNode({
                type: `selector`,
                start: 6,
                end: 12,
                before: ` `,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 7,
                        end: 9,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `c`,
                                start: 7,
                                end: 9,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `~`,
                        value: `~`,
                        start: 9,
                        end: 10,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 10,
                        end: 12,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `d`,
                                start: 10,
                                end: 12,
                            }),
                        ],
                    }),
                ],
            }),
        );
        expect(splitCompoundSelectors(groupedSelector), `split`).to.eql(ast[1]);
    });
    it(`should accept readonly value and return readonly accordingly (type checks)`, () => {
        function expectType<T>(_actual: T) {
            /**/
        }
        const immutable = parseCssSelector(`.a .b`) as ImmutableSelectorList;
        expectType<ImmutableSelector>(groupCompoundSelectors(immutable[0]));
        expectType<ImmutableSelectorList>(groupCompoundSelectors(immutable));
        expectType<ImmutableSelector>(splitCompoundSelectors(immutable[0]));
        expectType<ImmutableSelectorList>(splitCompoundSelectors(immutable));

        const mutable = parseCssSelector(`.a .b`);
        expectType<Selector>(groupCompoundSelectors(mutable[0]));
        expectType<SelectorList>(groupCompoundSelectors(mutable));
        expectType<Selector>(splitCompoundSelectors(mutable[0]));
        expectType<SelectorList>(splitCompoundSelectors(mutable));
    });
    it(`should set invalid flag on compound with universal or type not at the start`, () => {
        const ast = parseCssSelector(`.a*`);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 3,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 3,
                        invalid: true,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `universal`,
                                value: `*`,
                                start: 2,
                                end: 3,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
    it(`should flat selectors and compound selectors into compound`, () => {
        const selector = parseCssSelector(`.x.y`)[0];
        const compound = groupCompoundSelectors(parseCssSelector(`.q.t`)[0]).nodes[0];
        const ast = parseCssSelector(`.a`);
        ast[0].nodes.push(selector, compound);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 2,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 4,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `class`,
                                value: `x`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `class`,
                                value: `y`,
                                start: 2,
                                end: 4,
                            }),
                            createNode({
                                type: `class`,
                                value: `q`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `class`,
                                value: `t`,
                                start: 2,
                                end: 4,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split cannot reconstruct`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 2,
                nodes: [
                    createNode({
                        type: `class`,
                        value: `a`,
                        start: 0,
                        end: 2,
                    }),
                    createNode({
                        type: `class`,
                        value: `x`,
                        start: 0,
                        end: 2,
                    }),
                    createNode({
                        type: `class`,
                        value: `y`,
                        start: 2,
                        end: 4,
                    }),
                    createNode({
                        type: `class`,
                        value: `q`,
                        start: 0,
                        end: 2,
                    }),
                    createNode({
                        type: `class`,
                        value: `t`,
                        start: 2,
                        end: 4,
                    }),
                ],
            }),
        ]);
    });
    it(`should flat selectors multiple into compounds`, () => {
        const selector = parseCssSelector(`.x .y`)[0];
        const ast = parseCssSelector(`.a`);
        ast[0].nodes.push(selector);

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 2,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 2,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                            createNode({
                                type: `class`,
                                value: `x`,
                                start: 0,
                                end: 2,
                            }),
                        ],
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `space`,
                        value: ` `,
                        start: 2,
                        end: 3,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 3,
                        end: 5,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `y`,
                                start: 3,
                                end: 5,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split cannot reconstruct`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 2,
                nodes: [
                    createNode({
                        type: `class`,
                        value: `a`,
                        start: 0,
                        end: 2,
                    }),
                    createNode({
                        type: `class`,
                        value: `x`,
                        start: 0,
                        end: 2,
                    }),
                    createNode({
                        type: `combinator`,
                        combinator: `space`,
                        value: ` `,
                        start: 2,
                        end: 3,
                    }),
                    createNode({
                        type: `class`,
                        value: `y`,
                        start: 3,
                        end: 5,
                    }),
                ],
            }),
        ]);
    });
    it(`should keep out-of-context nodes out of compound selector`, () => {
        const nthSelector = parseCssSelector(`:nth-child(5n- 4 of)`)[0];
        const nth = (nthSelector.nodes[0] as PseudoClass).nodes![0] as Nth;
        const ast = parseCssSelector(`.a.b`);
        // create broken selector: ".a5n - 4 of.b"
        ast[0].nodes.splice(1, 0, nth, ...nth.nodes);
        nth.nodes.length = 0;

        const groupedSelectors = groupCompoundSelectors(ast);

        expect(groupedSelectors, `group`).to.eql([
            createNode({
                type: `selector`,
                start: 0,
                end: 4,
                nodes: [
                    createNode({
                        type: `compound_selector`,
                        start: 0,
                        end: 2,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `a`,
                                start: 0,
                                end: 2,
                            }),
                        ],
                    }),
                    createNode({
                        type: `nth`,
                        start: 11,
                        end: 19,
                        nodes: [],
                    }),
                    createNode({
                        type: `nth_step`,
                        value: `5n`,
                        start: 11,
                        end: 13,
                    }),
                    createNode({
                        type: `nth_dash`,
                        value: `-`,
                        start: 13,
                        end: 15,
                        after: ` `,
                    }),
                    createNode({
                        type: `nth_offset`,
                        value: `4`,
                        start: 15,
                        end: 17,
                        after: ` `,
                    }),
                    createNode({
                        type: `nth_of`,
                        value: `of`,
                        start: 17,
                        end: 19,
                    }),
                    createNode({
                        type: `compound_selector`,
                        start: 2,
                        end: 4,
                        nodes: [
                            createNode({
                                type: `class`,
                                value: `b`,
                                start: 2,
                                end: 4,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        expect(splitCompoundSelectors(groupedSelectors), `split`).to.eql(ast);
    });
});
