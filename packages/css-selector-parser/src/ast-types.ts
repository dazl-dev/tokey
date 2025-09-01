import type { Immutable } from './types.ts';
import type { Token } from '@tokey/core';

export interface Selector extends Omit<Token<'selector'>, 'value'> {
    nodes: SelectorNodes;
    before: string;
    after: string;
}

export type NthSelectorList = [Nth, ...SelectorList];

// ToDo: try type NthSelectorList only for the specific set of types
export interface PseudoClass extends Token<'pseudo_class'> {
    nodes?: SelectorList | NthSelectorList;
    colonComments: Comment[];
}

export interface PseudoElement extends Token<'pseudo_element'> {
    nodes?: SelectorList;
    colonComments: { first: Comment[]; second: Comment[] };
}

export interface Class extends Token<'class'> {
    nodes?: SelectorList;
    dotComments: SelectorNodes;
}

export interface Id extends Token<'id'> {
    nodes?: SelectorList;
}

export interface Attribute extends Token<'attribute'> {
    // left: string;
    // right: string;
    // op: "" | "=" | "~=" | "|=" | "^=" | "$=" | "*=";
    // quotes: "'" | '"' | "";
    nodes?: SelectorList;
}

export interface Namespace {
    value: string;
    beforeComments: Comment[];
    afterComments: Comment[];
    invalid?: 'namespace' | 'target' | 'namespace,target' | '';
}

export interface Type extends Token<'type'> {
    namespace?: Namespace;
    nodes?: SelectorList;
}

export interface Universal extends Token<'universal'> {
    namespace?: Namespace;
    nodes?: SelectorList;
}

export interface Combinator extends Token<'combinator'> {
    combinator: 'space' | '+' | '~' | '>';
    before: string;
    after: string;
    invalid: boolean;
}

export interface Nesting extends Token<'nesting'> {
    value: '&';
    nodes?: SelectorList;
}

export type Invalid = Token<'invalid'>;
export interface Comment extends Token<'comment'> {
    before: string;
    after: string;
}
export type CommentWithNoSpacing = Comment & { before: ''; after: '' };

export interface NthBase<PART extends string> extends Token<PART> {
    before: string;
    after: string;
    invalid?: boolean;
}
export type NthStep = NthBase<'nth_step'>;
export type NthOffset = NthBase<'nth_offset'>;
export type NthDash = NthBase<'nth_dash'>;
export type NthOf = NthBase<'nth_of'>;
export type NthNode = NthStep | NthOffset | NthDash | NthOf | Comment;
export interface Nth extends Omit<Token<'nth'>, 'value'> {
    nodes: Array<NthNode>;
    before: string;
    after: string;
    // invalid?: boolean;
}

export type NamespacedNode = Type | Universal;

export type SimpleSelector = Type | Universal | Attribute | Class | Id | PseudoClass;

export interface CompoundSelector extends Omit<Token<'compound_selector'>, 'value'> {
    nodes: Array<
        | SimpleSelector
        // non standard
        | Nesting
        | CommentWithNoSpacing
        | Invalid
        | PseudoElement
        | CompoundSelector
        | Selector
    >;
    before: string;
    after: string;
    invalid: boolean;
}

export type FunctionalSelector =
    | NamespacedNode
    | Attribute
    | Id
    | Class
    | PseudoClass
    | PseudoElement
    | Nesting;

export type SelectorNode =
    | FunctionalSelector
    | Selector
    | CompoundSelector
    | Combinator
    | Comment
    | Invalid
    | Nth
    | NthStep
    | NthDash
    | NthOffset
    | NthOf;
export type SelectorNodes = SelectorNode[];
export type SelectorList = Selector[];

// immutable ast
export type ImmutableSelector = Immutable<Selector>;
export type ImmutableCompoundSelector = Immutable<CompoundSelector>;

export type ImmutableSelectorList = Immutable<SelectorList>;
export type ImmutableNthSelectorList = Immutable<NthSelectorList>;

export type ImmutableSelectorNode = Immutable<SelectorNode>;
export type ImmutableFunctionalSelector = Immutable<FunctionalSelector>;
export type ImmutableNamespacedNode = Immutable<NamespacedNode>;

export type ImmutableUniversal = Immutable<Universal>;
export type ImmutableClass = Immutable<Class>;
export type ImmutableId = Immutable<Id>;
export type ImmutableType = Immutable<Type>;
export type ImmutableCombinator = Immutable<Combinator>;
export type ImmutableAttribute = Immutable<Attribute>;
export type ImmutablePseudoClass = Immutable<PseudoClass>;
export type ImmutablePseudoElement = Immutable<PseudoElement>;
export type ImmutableComment = Immutable<Comment>;
export type ImmutableCommentWithNoSpacing = Immutable<CommentWithNoSpacing>;
export type ImmutableNesting = Immutable<Nesting>;
export type ImmutableInvalid = Immutable<Invalid>;
export type ImmutableNth = Immutable<Nth>;
export type ImmutableNthStep = Immutable<NthStep>;
export type ImmutableNthDash = Immutable<NthDash>;
export type ImmutableNthOffset = Immutable<NthOffset>;
export type ImmutableNthOf = Immutable<NthOf>;
