import type {
    lengthValidUnits,
    angleValidUnits,
    frequencyValidUnits,
    resolutionValidUnits,
    timeValidUnits,
} from './units.ts';

export interface CSSValueAST<TYPE extends string> {
    type: TYPE;
    start: number;
    end: number;
    value: string;
}

export type BaseAstNode =
    | Literal
    | CssWideKeyword
    | Space
    | Comment
    | Invalid
    | CustomIdent
    | DashedIdent
    | Call
    | String
    | Number
    | Integer
    | Length
    | Angle
    | Time
    | Percentage
    | Frequency
    | Resolution
    | Flex
    | UnknownUnit
    | Color;

/* types */

// custom
export type BuildVarAst = CSSValueAST<`build-var`> & {
    subType: string;
    id: string;
};
export type Literal = CSSValueAST<`literal`> & {
    before: string;
    after: string;
};
export type CssWideKeyword = CSSValueAST<`css-wide-keyword`> & {
    value: AnyCase<`inherit` | `unset` | `initial`>;
};
export type Space = CSSValueAST<`space`> & {
    before: string;
    after: string;
};
export type Comment = CSSValueAST<`comment`> & {
    before: string;
    after: string;
};
export type Call<TYPE extends string = 'call'> = CSSValueAST<TYPE> & {
    args: CSSValueAST<any>[];
    before: string;
    after: string;
};
type Unit<TYPE extends string, UNIT extends string> = CSSValueAST<TYPE> & {
    unit: UNIT;
    integer: boolean;
};
export type Invalid = CSSValueAST<`invalid`>;
export type UnknownUnit = Unit<`unknown-unit`, string>;

// textual
export type CustomIdent = CSSValueAST<`<custom-ident>`>;
export type DashedIdent = CSSValueAST<`<dashed-ident>`>;
export type String = CSSValueAST<`<string>`>;
export type Url = CSSValueAST<`<url>`>;
// numeric
export type Integer = CSSValueAST<`<integer>`>;
export type Number = CSSValueAST<`<number>`>;
export type Percentage = Unit<`<percentage>`, `%`>;
export type Ratio = CSSValueAST<`<ratio>`>;
// distance
export type Length = Unit<`<length>`, AnyCase<(typeof lengthValidUnits)[number]>>;
// other quantities
export type Flex = Unit<`<flex>`, AnyCase<`fr`>>;
export type Angle = Unit<`<angle>`, AnyCase<(typeof angleValidUnits)[number]>>;
export type Time = Unit<`<time>`, AnyCase<(typeof timeValidUnits)[number]>>;
export type Frequency = Unit<`<frequency>`, AnyCase<(typeof frequencyValidUnits)[number]>>;
export type Resolution = Unit<`<resolution>`, AnyCase<(typeof resolutionValidUnits)[number]>>;
// other
export type Color = CSSValueAST<`<color>`>;
export type Image = CSSValueAST<`<image>`>;
export type Position = CSSValueAST<`<position>`>;
// attribute
export type Attribute = CSSValueAST<`<attr()>`>;
// mathematical
/* 
<calc()>
<min()>
<max()>
<clamp()>
<round()>
<mod()>
<rem()>
<sin()>
<cos()>
<tan()>
<asin()>
<acos()>
<atan()>
<atan2()>
<pow()>
<sqrt()>
<hypot()>
<log()>
<exp()>
<abs()>
<sign()>

<calc-sum>, <calc-product>, <calc-value>, <calc-constant>
*/
/////////////////////
type AnyCase<T extends string> = string extends T
    ? string
    : T extends `${infer F1}${infer F2}${infer R}`
      ? `${Uppercase<F1> | Lowercase<F1>}${Uppercase<F2> | Lowercase<F2>}${AnyCase<R>}`
      : T extends `${infer F}${infer R}`
        ? `${Uppercase<F> | Lowercase<F>}${AnyCase<R>}`
        : '';
/////////////////////

export const invalid = (value: Partial<Invalid>): Invalid => ({
    start: 0,
    end: 0,
    value: ``,
    ...value,
    type: `invalid`,
});
export const literal = (value: Partial<Literal>): Literal => ({
    start: 0,
    end: 0,
    before: ``,
    after: ``,
    value: ``,
    ...value,
    type: `literal`,
});
export const cssWideKeyword = (value: Partial<CssWideKeyword>): CssWideKeyword => ({
    start: 0,
    end: 0,
    value: `initial`,
    ...value,
    type: `css-wide-keyword`,
});
export const space = (value: Partial<Space>): Space => ({
    start: 0,
    end: 0,
    before: ``,
    after: ``,
    value: ` `,
    ...value,
    type: `space`,
});
export const comment = (value: Partial<Comment>): Comment => ({
    start: 0,
    end: 0,
    before: ``,
    after: ``,
    value: ``,
    ...value,
    type: `comment`,
});
export const customIdent = (value: Partial<CustomIdent>): CustomIdent => ({
    start: 0,
    end: 0,
    value: ``,
    ...value,
    type: `<custom-ident>`,
});
export const dashedIdent = (value: Partial<DashedIdent>): DashedIdent => ({
    start: 0,
    end: 0,
    value: `-`,
    ...value,
    type: `<dashed-ident>`,
});
export const string = (value: Partial<String>): String => ({
    start: 0,
    end: 0,
    value: `""`,
    ...value,
    type: `<string>`,
});
export const integer = (value: Partial<Integer>): Integer => ({
    start: 0,
    end: 0,
    value: `0`,
    ...value,
    type: `<integer>`,
});
export const number = (value: Partial<Number>): Number => ({
    start: 0,
    end: 0,
    value: `0`,
    ...value,
    type: `<number>`,
});
export const unknownUnit = (value: Partial<UnknownUnit>): UnknownUnit => ({
    start: 0,
    end: 0,
    value: `0`,
    unit: ``,
    integer: false,
    ...value,
    type: `unknown-unit`,
});
export const length = (value: Partial<Length> & Pick<Length, 'unit'>): Length => ({
    start: 0,
    end: 0,
    value: `0`,
    integer: false,
    ...value,
    type: `<length>`,
});
export const angle = (value: Partial<Angle> & Pick<Angle, 'unit'>): Angle => ({
    start: 0,
    end: 0,
    value: `0`,
    integer: false,
    ...value,
    type: `<angle>`,
});
export const percentage = (value: Partial<Percentage>): Percentage => ({
    start: 0,
    end: 0,
    value: `0`,
    unit: `%`,
    integer: false,
    ...value,
    type: `<percentage>`,
});
export const flex = (value: Partial<Flex>): Flex => ({
    start: 0,
    end: 0,
    value: `0`,
    unit: `fr`,
    integer: false,
    ...value,
    type: `<flex>`,
});
export const time = (value: Partial<Time> & Pick<Time, 'unit'>): Time => ({
    start: 0,
    end: 0,
    value: `0`,
    integer: false,
    ...value,
    type: `<time>`,
});
export const frequency = (value: Partial<Frequency> & Pick<Frequency, 'unit'>): Frequency => ({
    start: 0,
    end: 0,
    value: `0`,
    integer: false,
    ...value,
    type: `<frequency>`,
});
export const resolution = (value: Partial<Resolution> & Pick<Resolution, 'unit'>): Resolution => ({
    start: 0,
    end: 0,
    value: `0`,
    integer: false,
    ...value,
    type: `<resolution>`,
});
export const call = (value: Partial<Call>): Call => ({
    start: 0,
    end: 0,
    value: ``,
    args: value.args || [],
    before: ``,
    after: ``,
    ...value,
    type: `call`,
});
export const color = (value: Partial<Color>): Color => ({
    start: 0,
    end: 0,
    value: `#000000`,
    ...value,
    type: `<color>`,
});
