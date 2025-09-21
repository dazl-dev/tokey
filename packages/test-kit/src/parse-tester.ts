import { isMatch } from './is-match.ts';

export interface TesterConfig<AST, INPUT extends string, CONFIG> {
    parse: (input: INPUT, options?: CONFIG) => AST;
    stringify?: (ast: AST) => string;
    log?: (...msgs: string[]) => void;
}

export interface TestOptions<AST, CONFIG> {
    expectedAst: AST;
    expectedString?: string;
    label?: string;
    config?: CONFIG;
}

export function createParseTester<AST, INPUT extends string, CONFIG>({
    parse,
    stringify,
}: TesterConfig<AST, INPUT, CONFIG>) {
    const safeParse = (source: INPUT, config?: CONFIG): [AST, null] | [null, Error] => {
        try {
            return [parse(source, config), null];
        } catch (error) {
            return [null, error as Error];
        }
    };
    return (
        source: INPUT,
        { expectedAst, expectedString, label, config }: TestOptions<AST, CONFIG>,
    ) => {
        const [actualAst, parseError] = safeParse(source, config);
        if (parseError) {
            throw parseError;
        }
        if (!isMatch(actualAst, expectedAst)) {
            const e = JSON.stringify(expectedAst, null, 2);
            const a = JSON.stringify(actualAst, null, 2);
            throw new Error(createParseTester.errors.mismatchAst(a, e, label));
        }
        if (stringify) {
            const actualString = stringify(actualAst);
            expectedString = expectedString ?? source;
            if (actualString !== expectedString) {
                throw new Error(
                    createParseTester.errors.mismatchStringify(actualString, expectedString, label),
                );
            }
        }
    };
}
createParseTester.errors = {
    mismatchAst(actual: string, expected: string, label = ``) {
        return `${getPrefix(label)}expected parsed value:\n${actual}\nto equal:\n${expected}`;
    },
    mismatchStringify(actual: string, expected: string, label = ``) {
        return `${getPrefix(label)}expected stringify value:\n${actual}\nto equal:\n${expected}`;
    },
};
const getPrefix = (label?: string) => (label ? `[${label}] ` : ``);
