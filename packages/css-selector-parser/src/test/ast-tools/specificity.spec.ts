import {
    calcSpecificity,
    compareSpecificity,
    groupCompoundSelectors,
    parseCssSelector,
    type ImmutableSelectorNode,
} from '@tokey/css-selector-parser';
import { expect } from 'chai';

describe(`ast-tools/specificity`, () => {
    describe(`calcSpecificity`, () => {
        const basicSelectors = [
            {
                selectorType: `universal`,
                selector: `*`,
                expected: [0, 0, 0, 0],
            },
            {
                selectorType: `type`,
                selector: `span`,
                expected: [0, 0, 0, 1],
            },
            {
                selectorType: `pseudo-element`,
                selector: `::before`,
                expected: [0, 0, 0, 1],
            },
            {
                selectorType: `class`,
                selector: `.a`,
                expected: [0, 0, 1, 0],
            },
            {
                selectorType: `attribute`,
                selector: `[attr]`,
                expected: [0, 0, 1, 0],
            },
            {
                selectorType: `pseudo-class`,
                selector: `:hover`,
                expected: [0, 0, 1, 0],
            },
            {
                selectorType: `id`,
                selector: `#a`,
                expected: [0, 1, 0, 0],
            },
            {
                selectorType: `nested`,
                selector: `&`,
                expected: [0, 0, 0, 0],
            },
        ];
        describe(`basic selectors`, () => {
            basicSelectors.forEach(({ selectorType, selector, expected }) => {
                it(`should return correct specificity for ${selectorType} selector`, () => {
                    const specificity = calcSpecificity(parseCssSelector(selector)[0]);
                    expect(specificity).to.eql(expected);
                });
            });
        });
        describe(`special cases`, () => {
            it(`should only add the most specific inner selector for :not()`, () => {
                const specificity = calcSpecificity(parseCssSelector(`:not(.a, #b)`)[0]);
                expect(specificity).to.eql([0, 1, 0, 0]);
            });
            it(`should only add the most specific inner selector for :is()`, () => {
                const specificity = calcSpecificity(parseCssSelector(`:is(.a, #b)`)[0]);
                expect(specificity).to.eql([0, 1, 0, 0]);
            });
            it(`should only add the most specific inner selector for :has()`, () => {
                const specificity = calcSpecificity(parseCssSelector(`:has(.a, #b)`)[0]);
                expect(specificity).to.eql([0, 1, 0, 0]);
            });
            it(`should add zero specificity for :where()`, () => {
                const specificity = calcSpecificity(parseCssSelector(`:where(.a, #b)`)[0]);
                expect(specificity).to.eql([0, 0, 0, 0]);
            });
            it(`should add :nth-child pseudo-class plus the most specific inner selectors`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(`:nth-child(5n - 4 of .a, #b)`)[0],
                );
                expect(specificity).to.eql([0, 1, 1, 0]);
            });
            it(`should add :nth-last-child pseudo-class plus the most specific inner selectors`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(`:nth-last-child(5n -4 of .a, #b)`)[0],
                );
                expect(specificity).to.eql([0, 1, 1, 0]);
            });
            it(`should add :nth-of-type pseudo-class plus the most specific inner selectors`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(`:nth-of-type(5n -4 of .a, #b)`)[0],
                );
                expect(specificity).to.eql([0, 1, 1, 0]);
            });
            it(`should add :nth-last-of-type pseudo-class plus the most specific inner selectors`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(`:nth-last-of-type(5n -4 of .a, #b)`)[0],
                );
                expect(specificity).to.eql([0, 1, 1, 0]);
            });
        });
        describe(`complex selectors`, () => {
            it(`should not add specificity for combinators`, () => {
                const specificity = calcSpecificity(parseCssSelector(`.a + .b ~ .c > .d .e`)[0]);
                expect(specificity).to.eql([0, 0, 5, 0]);
            });
            it(`should handle nested pseudo classes`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(`:is(:where(#zero), :has(:not(span, #a), .a))`)[0],
                );
                expect(specificity).to.eql([0, 1, 0, 0]);
            });
            it(`should not add specificity for comments`, () => {
                const specificity = calcSpecificity(parseCssSelector(`/*c1*/./*c2*/a/*c3*/`)[0]);
                expect(specificity).to.eql([0, 0, 1, 0]);
            });
            it(`should not add specificity for invalid`, () => {
                const specificity = calcSpecificity(parseCssSelector(`:a(`)[0]);
                expect(specificity).to.eql([0, 0, 1, 0]);
            });
            it(`should not take non native functional selectors arguments into account`, () => {
                const specificity = calcSpecificity(
                    parseCssSelector(
                        `div(#a).x(#b)::y(#c)[attr](#d)&(#e)*(#f)#id(#g):unknown(#h)`,
                    )[0],
                );
                expect(specificity).to.eql([0, 1, 3, 2]);
            });
            it(`should handle compound selector AST`, () => {
                const specificity = calcSpecificity(
                    groupCompoundSelectors(parseCssSelector(`.a .b`)[0]),
                );
                expect(specificity).to.eql([0, 0, 2, 0]);
            });
            it(`should handle empty functional selector`, () => {
                const specificity = calcSpecificity(
                    groupCompoundSelectors(parseCssSelector(`div:not()`)[0]),
                );
                expect(specificity).to.eql([0, 0, 0, 1]);
            });
        });
        describe(`accepted values`, () => {
            basicSelectors.forEach(({ selectorType, selector, expected }) => {
                it(`should accept ${selectorType} selector AST`, () => {
                    const basicNode = parseCssSelector(selector)[0].nodes[0];
                    const specificity = calcSpecificity(basicNode);
                    expect(specificity).to.eql(expected);
                });
            });
            it(`should accept readonly value (type checks)`, () => {
                const immutable = parseCssSelector(`.a .b`)[0] as ImmutableSelectorNode;
                calcSpecificity(immutable);

                const mutable = parseCssSelector(`.a .b`)[0];
                calcSpecificity(mutable);
            });
        });
    });
    describe(`compareSpecificity`, () => {
        it(`should return 0 when equal`, () => {
            expect(compareSpecificity([0, 0, 0, 0], [0, 0, 0, 0]), `all zeros`).to.equal(0);
            expect(compareSpecificity([5, 4, 3, 2], [5, 4, 3, 2]), `complex`).to.equal(0);
        });
        it(`should return 1 when first specificity is higher`, () => {
            expect(compareSpecificity([1, 0, 0, 0], [0, 9, 0, 0]), `higher place`).to.equal(1);
            expect(compareSpecificity([0, 5, 0, 0], [0, 4, 0, 0]), `higher value`).to.equal(1);
        });
        it(`should return -1 when second specificity is higher`, () => {
            expect(compareSpecificity([0, 9, 0, 0], [1, 0, 0, 0]), `higher place`).to.equal(-1);
            expect(compareSpecificity([0, 4, 0, 0], [0, 5, 0, 0]), `higher value`).to.equal(-1);
        });
    });
});
