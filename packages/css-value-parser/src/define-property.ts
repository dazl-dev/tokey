import type { CSSValueAST, BuildVarAst } from './ast-types.ts';
import type { ParseResults } from './value-parser.ts';

export function defineProperty<
    FORMATS extends string,
    CLASSIFICATIONS extends string,
    TOP_COMMA extends boolean = false,
>(_config: {
    name: string;
    syntax: string;
    subSyntax?: Record<string, string>;
    subProperties?: Record<string, ReturnType<typeof defineProperty>>;
    topLevelCommaSeparation?: TOP_COMMA;
    formats?: Record<FORMATS, string>;
    classifications?: Record<
        CLASSIFICATIONS,
        | MatchClassification // ToDo: optional default value / required
        | (TOP_COMMA extends true
              ? {
                    match?: MatchClassification;
                    syntax?: string;
                    inTopLevelIndex?: (index: number, total: number) => boolean;
                    cssProperty?: ReturnType<typeof defineProperty>;
                }
              : {
                    match?: MatchClassification;
                    syntax?: string;
                    cssProperty?: ReturnType<typeof defineProperty>;
                })
    >;
}): {
    validate: (ast: CSSValueAST<any>[], options?: ActionParams) => [...errors: string[]];
    getFormat: (ast: CSSValueAST<any>[], options?: ActionParams) => FORMATS;
    classify: (
        ast: CSSValueAST<any>[],
        options?: ActionParams & { deep?: boolean; ignoreComments?: boolean },
    ) => TOP_COMMA extends true
        ? Record<CLASSIFICATIONS, Classification>[]
        : Record<CLASSIFICATIONS, Classification>;
} {
    return {} as any;
}

defineProperty.errors = {
    unexpectedType: (node: CSSValueAST<any>, expectedType: string) =>
        `expected to get ${expectedType}, but got ${node.type}`,
    unexpectedComma: () => `unexpected comma`,
};

export interface ActionParams {
    cssVars?: Record<string, CSSValueAST<any>[]>;
    resolveBuildVar?: (node: BuildVarAst) => CSSValueAST<any>[];
}

type MatchClassification = (
    node: CSSValueAST<any>,
    info: {
        index: number;
        indexOfType: number;
        amountOfType: number;
    },
) => boolean;

type Classification = {
    value: CSSValueAST<any>[];
    resolved: { origin: ParseResults; nodes: CSSValueAST<any>[] }[][]; // ToDo: should probably be more detailed... need to see cases
    isProperty: boolean;
};
