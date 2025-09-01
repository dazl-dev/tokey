import { createParseTester } from '@tokey/test-kit';
import { parseImports, type ImportValue } from '@tokey/imports-parser';

const test = createParseTester({
    parse: (source: string) => parseImports(source, '{', '}'),
});

const testStrictSemiColon = createParseTester({
    parse: (source: string) => parseImports(source, '{', '}', false, true),
});

const testTagged = createParseTester({
    parse: (source: string) => parseImports(source, '{', '}', true),
});

const createImportValue = (value: ImportValue) => value;

describe(`demos/import-tokenizer`, () => {
    it(`import "x"`, () => {
        test(`import "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 10,
                }),
            ],
        });
    });

    it(`import "x";`, () => {
        test(`import "x";`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 11,
                }),
            ],
        });
    });
    it(`import "x" import "y" (strictSemiColon)`, () => {
        testStrictSemiColon(`import "x" import "y"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: ['missing semicolon'],
                    start: 0,
                    end: 10,
                }),
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'y',
                    defaultName: undefined,
                    errors: [],
                    start: 11,
                    end: 21,
                }),
            ],
        });
    });
    it(`import "x" (strictSemiColon)`, () => {
        testStrictSemiColon(`import "x" /**/ `, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 10,
                }),
            ],
        });
    });
    it(`import "x" (strictSemiColon)`, () => {
        testStrictSemiColon(`import "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 10,
                }),
            ],
        });
    });
    it(`import "x" ; (strictSemiColon)`, () => {
        testStrictSemiColon(`import "x" ;`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 12,
                }),
            ],
        });
    });
    it(`import "x"/**/ ; (strictSemiColon)`, () => {
        testStrictSemiColon(`import "x"/**/ ;`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 16,
                }),
            ],
        });
    });
    it(`import name from "x"`, () => {
        test(`import name from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: 'name',
                    errors: [],
                    start: 0,
                    end: 20,
                }),
            ],
        });
    });
    it(`import {named} from "x"`, () => {
        test(`import {named} from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [['named', 'named']],
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 23,
                }),
            ],
        });
    });
    it(`import {named as renamed} from "x"`, () => {
        test(`import {named as renamed} from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [['named', 'renamed']],
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 34,
                }),
            ],
        });
    });
    it(`import {x, x as local-x} from "x"`, () => {
        test(`import {x, x as local-x} from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [
                        ['x', 'x'],
                        ['x', 'local-x'],
                    ],
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 33,
                }),
            ],
        });
    });
    it(`import name, {named} from "x"`, () => {
        test(`import name, {named} from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [['named', 'named']],
                    tagged: {},
                    from: 'x',
                    defaultName: 'name',
                    errors: [],
                    start: 0,
                    end: 29,
                }),
            ],
        });
    });
    it(`import * as name from "x"`, () => {
        test(`import * as name from "x"`, {
            expectedAst: [
                createImportValue({
                    star: true,
                    named: undefined,
                    tagged: {},
                    from: 'x',
                    defaultName: 'name',
                    errors: [],
                    start: 0,
                    end: 25,
                }),
            ],
        });
    });
    it(`import {named1, named2} from "x"`, () => {
        test(`import {named1, named2} from "x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [
                        ['named1', 'named1'],
                        ['named2', 'named2'],
                    ],
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 32,
                }),
            ],
        });
    });
    it(`import {named}from"x"`, () => {
        test(`import {named}from"x"`, {
            expectedAst: [
                createImportValue({
                    star: false,
                    named: [['named', 'named']],
                    tagged: {},
                    from: 'x',
                    defaultName: undefined,
                    errors: [],
                    start: 0,
                    end: 21,
                }),
            ],
        });
    });
    describe(`broken inputs`, () => {
        it(`import * from "x"`, () => {
            test(`import * from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: true,
                        named: undefined,
                        tagged: {},
                        from: 'x',
                        defaultName: undefined,
                        errors: ['expected as after *'],
                        start: 0,
                        end: 17,
                    }),
                ],
            });
        });
        it(`import * "x"`, () => {
            test(`import * "x"`, {
                expectedAst: [
                    createImportValue({
                        star: true,
                        named: undefined,
                        tagged: {},
                        from: 'x',
                        defaultName: undefined,
                        errors: ['expected as after *', 'invalid missing from'],
                        start: 0,
                        end: 12,
                    }),
                ],
            });
        });
        it(`import {a}`, () => {
            test(`import {a}`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [['a', 'a']],
                        tagged: {},
                        from: undefined,
                        defaultName: undefined,
                        errors: ['invalid missing from', 'invalid missing source'],
                        start: 0,
                        end: 10,
                    }),
                ],
            });
        });
        it(`import {a as, b} "x"`, () => {
            // this case can be better by reporting missing name after as
            test(`import {a as, b} "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [['b', 'b']],
                        tagged: {},
                        from: 'x',
                        defaultName: undefined,
                        errors: ['invalid missing from'],
                        start: 0,
                        end: 20,
                    }),
                ],
            });
        });
        it(`import {a from "x"`, () => {
            // this can be better by adding the `a` as named
            test(`import {a from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: undefined,
                        tagged: {},
                        from: 'x',
                        defaultName: undefined,
                        errors: ['unclosed block'],
                        start: 0,
                        end: 18,
                    }),
                ],
            });
        });
        it(`import {a ; import "y"`, () => {
            test(`import {a ; import "y"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: undefined,
                        tagged: {},
                        from: undefined,
                        defaultName: undefined,
                        errors: [
                            'unclosed block',
                            'invalid missing from',
                            'invalid missing source',
                        ],
                        start: 0,
                        end: 11,
                    }),
                    createImportValue({
                        star: false,
                        named: undefined,
                        tagged: {},
                        from: 'y',
                        defaultName: undefined,
                        errors: [],
                        start: 12,
                        end: 22,
                    }),
                ],
            });
        });
        it(`import from "x"`, () => {
            test(`import from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: undefined,
                        tagged: {},
                        from: 'x',
                        defaultName: undefined,
                        errors: ['missing name'],
                        start: 0,
                        end: 15,
                    }),
                ],
            });
        });
        it(`import * as x, {a} from "x"`, () => {
            test(`import * as x, {a} from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: true,
                        named: [['a', 'a']],
                        tagged: {},
                        from: 'x',
                        defaultName: 'x',
                        errors: ['Invalid named after *'],
                        start: 0,
                        end: 27,
                    }),
                ],
            });
        });
    });
    describe(`tagged imports Extensions`, () => {
        it(`import {named(a as b, c)} from "x"`, () => {
            testTagged(`import {named(a as b, c)} from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [],
                        tagged: {
                            named: [
                                ['a', 'b'],
                                ['c', 'c'],
                            ],
                        },
                        from: 'x',
                        defaultName: undefined,
                        errors: [],
                        start: 0,
                        end: 34,
                    }),
                ],
            });
        });
        it(`import {,(a as b, c)} from "x"`, () => {
            testTagged(`import {,(a as b, c)} from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [],
                        tagged: {
                            ',': [
                                ['a', 'b'],
                                ['c', 'c'],
                            ],
                        },
                        from: 'x',
                        defaultName: undefined,
                        errors: ['invalid tag name: ,'],
                        start: 0,
                        end: 30,
                    }),
                ],
            });
        });
        it(`import {named(a as b, c} from "x"`, () => {
            testTagged(`import {named(a as b, c} from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [],
                        tagged: {
                            named: [
                                ['a', 'b'],
                                ['c', 'c'],
                            ],
                        },
                        from: 'x',
                        defaultName: undefined,
                        errors: ['unclosed tagged import "named"'],
                        start: 0,
                        end: 33,
                    }),
                ],
            });
        });
        it(`import {tag1(a), tag2(b), c} from "x"`, () => {
            testTagged(`import {tag1(a), tag2(b), c} from "x"`, {
                expectedAst: [
                    createImportValue({
                        star: false,
                        named: [['c', 'c']],
                        tagged: { tag1: [['a', 'a']], tag2: [['b', 'b']] },
                        from: 'x',
                        defaultName: undefined,
                        errors: [],
                        start: 0,
                        end: 37,
                    }),
                ],
            });
        });
    });
});
