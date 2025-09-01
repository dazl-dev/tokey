import type {
    BaseAstNode,
    Literal,
    CssWideKeyword,
    Space,
    Comment,
    String,
    Number,
    Call,
    CustomIdent,
    DashedIdent,
    Integer,
    Angle,
    Color,
    Flex,
    Frequency,
    Invalid,
    Length,
    Percentage,
    Resolution,
    Time,
    UnknownUnit,
} from './ast-types.ts';

export function stringifyCSSValue(ast: BaseAstNode | BaseAstNode[]) {
    if (!Array.isArray(ast)) {
        return stringifyNode(ast);
    }
    let result = ``;
    for (const node of ast) {
        result += stringifyNode(node);
    }
    return result;
}
function stringifyNode(node: BaseAstNode) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return stringifyByType[node.type]?.(node as any) || ``;
}

type Printers = {
    [K in BaseAstNode as K['type']]: (node: K) => string;
};
const stringifyByType: Printers = {
    space: ({ before, value, after }: Space) => before + value + after,
    literal: ({ before, value, after }: Literal) => before + value + after,
    'css-wide-keyword': ({ value }: CssWideKeyword) => value,
    invalid: ({ value }: Invalid) => value,
    comment: ({ value }: Comment) => value,
    call: ({ value, before, after, args }: Call) =>
        `${value}(${before}${stringifyCSSValue(args)}${after})`,
    '<custom-ident>': ({ value }: CustomIdent) => value,
    '<dashed-ident>': ({ value }: DashedIdent) => value,
    '<string>': ({ value }: String) => value,
    '<number>': ({ value }: Number) => value,
    '<integer>': ({ value }: Integer) => value,
    '<length>': ({ value, unit }: Length) => value + unit,
    '<percentage>': ({ value, unit }: Percentage) => value + unit,
    '<angle>': ({ value, unit }: Angle) => value + unit,
    '<time>': ({ value, unit }: Time) => value + unit,
    '<frequency>': ({ value, unit }: Frequency) => value + unit,
    '<resolution>': ({ value, unit }: Resolution) => value + unit,
    '<flex>': ({ value, unit }: Flex) => value + unit,
    'unknown-unit': ({ value, unit }: UnknownUnit) => value + unit,
    '<color>': ({ value }: Color) => value,
};
