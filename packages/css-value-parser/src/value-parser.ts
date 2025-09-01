import { Seeker, isComment } from '@tokey/core';
import {
    angle,
    call,
    color,
    comment,
    cssWideKeyword,
    customIdent,
    dashedIdent,
    flex,
    frequency,
    integer,
    invalid,
    length,
    literal,
    number,
    percentage,
    resolution,
    space,
    string,
    time,
    unknownUnit,
    type BaseAstNode,
} from './ast-types.ts';
import { tokenizeValue, type CSSValueToken } from './tokenizer.ts';
import {
    angleValidUnits,
    frequencyValidUnits,
    lengthValidUnits,
    resolutionValidUnits,
    timeValidUnits,
} from './units.ts';
import { stringifyCSSValue } from './value-stringify.ts';

export type ParseResults = Array<BaseAstNode>;

export function parseCSSValue(
    source: string,
    _options?: { parseBuildVar?: () => { id: string; subType: string } },
): ParseResults {
    const tokens = tokenizeValue(source);
    return new Seeker(tokens).run<ParseResults>(handleToken, [], source);
}

function handleToken(
    token: CSSValueToken,
    ast: ParseResults,
    source: string,
    s: Seeker<CSSValueToken>,
): void {
    const { type, value, start, end } = token;
    if (type === `space`) {
        let firstSpace = value.indexOf(` `);
        if (firstSpace === -1) {
            firstSpace = value.indexOf(`\n`);
        }
        if (firstSpace === -1) {
            firstSpace = value.indexOf(`\t`);
        }
        const before = firstSpace !== -1 ? value.substring(0, firstSpace) : ``;
        const after = firstSpace !== -1 ? value.substring(firstSpace + 1) : value.substring(1);
        ast.push(
            space({
                value: firstSpace !== -1 ? value[firstSpace] : value[0],
                start,
                end,
                before,
                after,
            }),
        );
    } else if (type === `text` || type === `-`) {
        // numbers and lengths
        if (parseNumber(token, ast, source, s)) {
            return;
        }
        const ident = collectIdent(token, ast, source, s);
        if (s.peek().type === `(`) {
            // function
            s.next();
            const args: ParseResults = [];
            s.run(
                (token, args) => {
                    if (token.type === ')') {
                        return false;
                    }
                    return handleToken(token, args, source, s);
                },
                args,
                source,
            );
            const before =
                args.length && args[0].type === `space` ? stringifyCSSValue(args.shift()!) : ``;
            const after =
                args.length && args[args.length - 1].type === `space`
                    ? stringifyCSSValue(args.pop()!)
                    : ``;
            ast.push(
                call({
                    value: ident,
                    start,
                    end: s.peek(0).end,
                    args,
                    before,
                    after,
                }),
            );
        } else if (ident.match(/^inherit|unset|initial$/i)) {
            // css-wide keyword
            ast.push(
                cssWideKeyword({
                    value: ident as any,
                    start: token.start,
                    end: s.peek(0).end,
                }),
            );
        } else if (ident.match(/^--/)) {
            // dashed ident
            ast.push(
                dashedIdent({
                    value: ident,
                    start: token.start,
                    end: s.peek(0).end,
                }),
            );
        } else if (ident.match(/^[-][a-z]|[a-z]/i)) {
            // custom ident
            ast.push(
                customIdent({
                    value: ident,
                    start: token.start,
                    end: s.peek(0).end,
                }),
            );
        } else {
            ast.push(
                literal({
                    value: ident,
                    start,
                    end: s.peek(0).end,
                }),
            );
        }
    } else if (type === `string`) {
        ast.push(
            string({
                value,
                start,
                end,
            }),
        );
    } else if (type === `+`) {
        if (parseNumber(token, ast, source, s)) {
            return;
        }
        ast.push(
            literal({
                value,
                start,
                end,
            }),
        );
    } else if (type === `#`) {
        const nextToken = s.next(); // #000000
        const isValidColor =
            nextToken.type === `text` &&
            nextToken.value.match(/^[0-9a-f]{3,8}$/i) &&
            nextToken.value.length !== 5 &&
            nextToken.value.length !== 7;
        if (isValidColor) {
            ast.push(
                color({
                    value: value + nextToken.value,
                    start,
                    end: nextToken.end,
                }),
            );
        } else {
            s.back();
            ast.push(
                invalid({
                    value: `#`,
                    start,
                    end,
                }),
            );
        }
    } else if (type === '.') {
        if (parseNumber(token, ast, source, s)) {
            // number parsed
        } else {
            ast.push(
                literal({
                    start,
                    end,
                    value,
                }),
            );
        }
    } else if (isComment(type)) {
        ast.push(
            comment({
                value,
                start,
                end,
            }),
        );
    } else if (value.length === 1) {
        /* catches: , / or any other single char value.
    not sure about this, might be better to break down 
    any multi value token into single literal nodes.
    */
        ast.push(
            literal({
                start,
                end,
                value,
            }),
        );
    } else {
        ast.push(
            invalid({
                value,
                start,
                end,
            }),
        );
    }
}

/** parse ident **/
function collectIdent(
    token: CSSValueToken,
    _ast: ParseResults,
    _source: string,
    s: Seeker<CSSValueToken>,
) {
    let collectedValue = ``;
    let pickAmount = 0;
    let current = token;
    while (current.type === `text` || current.type === `-`) {
        collectedValue += current.value;
        pickAmount++;
        current = s.peek(pickAmount);
    }
    s.index += pickAmount - 1;
    return collectedValue;
}

/** parse number **/
function parseNumber(
    token: CSSValueToken,
    ast: ParseResults,
    _source: string,
    s: Seeker<CSSValueToken>,
) {
    const { value, start } = token;
    let startMatch = isStartOfNumber(value);
    if (!startMatch) {
        return false;
    }
    let [numberValue, numberUnit] = startMatch;
    // check number is a valid full number (e.g. 5em -> [5e, m])
    if (numberUnit && !isNumber(numberValue)) {
        const fullNumberMatch = startWithValidNumber(value);
        if (!fullNumberMatch) {
            // token is not a valid number: bail out
            return;
        }
        // token is number with a unit
        [numberValue, numberUnit] = fullNumberMatch;
    }
    let peekCount = 1;
    if (!numberUnit) {
        // collect potential extra number parts
        let nextToken = s.peek(peekCount);
        while (
            nextToken.type === `-` ||
            nextToken.type === `+` ||
            nextToken.type === `.` ||
            nextToken.type === `%` ||
            nextToken.type === `text`
        ) {
            const nextValue = numberValue + nextToken.value;
            // const validNumber = isNumber(nextValue);
            startMatch = isStartOfNumber(nextValue);
            if (!startMatch) {
                if (!isNumber(numberValue)) {
                    // doesn't amount to a number: bail out
                    return;
                }
                // collected a number: stop collection
                peekCount--;
                break;
            }
            //
            peekCount++;
            const [matchedNumber, leftover] = startMatch;
            numberValue = matchedNumber;
            if (leftover) {
                // leftover must be unit: no more number to collect
                numberUnit = leftover;
                break;
            }
            nextToken = s.peek(peekCount);
        }
        // check final collected number
        if (!isNumber(numberValue)) {
            // check for partial initial number (e.g 5e with m as unit)
            const fullNumberMatch = startWithValidNumber(numberValue + numberUnit);
            if (!fullNumberMatch) {
                return;
            }
            [numberValue, numberUnit] = fullNumberMatch;
        }
        // forward index by the tokens used for number value
        s.index += peekCount - 1;
        // take potential unit
        if (!numberUnit && s.peek().type === `text`) {
            numberUnit = s.next().value;
        }
    }
    const isInteger = numberValue.match(integerRegExp);
    // add to ast
    if (numberUnit) {
        const nodeType =
            knownUnits[numberUnit.toLowerCase() as keyof typeof knownUnits] || unknownUnit;
        ast.push(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            nodeType({
                value: numberValue,
                unit: numberUnit,
                integer: !!isInteger,
                start,
                end: s.peek(0).end,
            } as any),
        );
    } else {
        const nodeType = isInteger ? integer : number;
        ast.push(
            nodeType({
                value: numberValue,
                start,
                end: s.peek(0).end,
            }),
        );
    }
    return true;
}
const knownUnits = {
    '%': percentage,
    fr: flex,
    ...lengthValidUnits.reduce(
        (units, unit) => {
            units[unit] = length;
            return units;
        },
        {} as Record<(typeof lengthValidUnits)[number], typeof length>,
    ),
    ...angleValidUnits.reduce(
        (units, unit) => {
            units[unit] = angle;
            return units;
        },
        {} as Record<(typeof angleValidUnits)[number], typeof angle>,
    ),
    ...timeValidUnits.reduce(
        (units, unit) => {
            units[unit] = time;
            return units;
        },
        {} as Record<(typeof timeValidUnits)[number], typeof time>,
    ),
    ...frequencyValidUnits.reduce(
        (units, unit) => {
            units[unit] = frequency;
            return units;
        },
        {} as Record<(typeof frequencyValidUnits)[number], typeof frequency>,
    ),
    ...resolutionValidUnits.reduce(
        (units, unit) => {
            units[unit] = resolution;
            return units;
        },
        {} as Record<(typeof resolutionValidUnits)[number], typeof resolution>,
    ),
} as const;

const NumberRegExp = /^[-+]?(\d+\.?\d*|\d*\.?\d+)(e[-+]?\d+)?/i;
const integerRegExp = /^[-+]?\d+$/i; // one or more decimal digits 0 through 9 (preceded by -/+ ) - https://www.w3.org/TR/css-values-4/#integer-value
const validNumberRegex = [
    /[-+]?(\d+\.?\d*|\d*\.?\d+)(e[-+]?\d*)?/, // float+exponential
    /[-+]?\d+(e[-+]?\d*)?/, // int+exponential
    /[-+]/, // sign
    /[-+]?\./, // optional-sign+dot
]
    .map((r) => r.source)
    .join(`|`); // join with one-of ("or")

/**
 * Return true if the input is a valid number
 * for Example:
 * "5", "+5", "-5", "55", "5.", "5.5", "5e5", "5E5", "5.5e55", "5e-5", "5e+5"
 * @param value string to test
 * @returns true if value is valid as a number
 */
function isNumber(value: string) {
    const match = value.match(NumberRegExp);
    const numVal = match?.[0];
    return !!numVal && numVal === value;
}
function isStartOfNumber(value: string): false | [number: string, leftover: string] {
    const match = value.match(new RegExp(`^(` + validNumberRegex + `)`, `i`));
    const numVal = match?.[0];
    return numVal ? [numVal, value.substring(numVal.length)] : false;
}
function startWithValidNumber(value: string): false | [number: string, leftover: string] {
    const match = value.match(NumberRegExp);
    const numVal = match?.[0];
    return numVal ? [numVal, value.substring(numVal.length)] : false;
}
