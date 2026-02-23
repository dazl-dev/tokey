import { expect } from 'chai';
import {
    compileExpression,
    safeEvaluateExpression,
    validateExpressionSyntax,
    ExpressionSyntaxError,
    ExpressionSecurityError,
} from '../expression-evaluator.ts';

describe('expression-evaluator', () => {
    describe('compileExpression', () => {
        it('evaluates simple equality', () => {
            const evaluate = compileExpression("element.tag === 'button'");
            expect(evaluate({ element: { tag: 'button' } })).equal(true);
        });

        it('evaluates strings with escaped characters', () => {
            const evaluate = compileExpression("element.tag === 'but\\'ton'");
            expect(evaluate({ element: { tag: "but'ton" } })).equal(true);
        });

        it('evaluates inequality', () => {
            const evaluate = compileExpression("element.tag !== 'div'");
            expect(evaluate({ element: { tag: 'button' } })).equal(true);
        });

        it('evaluates array.includes()', () => {
            const evaluate = compileExpression("['button', 'a', 'input'].includes(element.tag)");
            expect(evaluate({ element: { tag: 'button' } })).equal(true);
        });

        it('evaluates array.includes() - negative', () => {
            const evaluate = compileExpression("['div', 'span'].includes(element.tag)");
            expect(evaluate({ element: { tag: 'button' } })).equal(false);
        });

        it('evaluates boolean property', () => {
            const evaluate = compileExpression('element.isComponent');
            expect(evaluate({ element: { isComponent: true } })).equal(true);
        });

        it('evaluates negation', () => {
            const evaluate = compileExpression('!element.hasText');
            expect(evaluate({ element: { hasText: true } })).equal(false);
        });

        it('evaluates numeric comparison', () => {
            const evaluate = compileExpression('element.childCount > 0');
            expect(evaluate({ element: { childCount: 3 } })).equal(true);
        });

        it('evaluates logical AND', () => {
            const evaluate = compileExpression("element.tag === 'button' && element.isComponent");
            expect(evaluate({ element: { tag: 'button', isComponent: true } })).equal(true);
        });

        it('evaluates logical OR', () => {
            const evaluate = compileExpression("element.tag === 'div' || element.tag === 'button'");
            expect(evaluate({ element: { tag: 'button' } })).equal(true);
        });

        it('evaluates boolean literal true', () => {
            const evaluate = compileExpression('true');
            expect(evaluate({})).equal(true);
        });

        it('evaluates nested member access', () => {
            const evaluate = compileExpression("declaration.property === 'color'");
            expect(evaluate({ declaration: { property: 'color' } })).equal(true);
        });

        it('returns undefined for member access on null or non-object', () => {
            const evaluateNull = compileExpression('element.component.doesNotExist');
            expect(evaluateNull({ element: { component: 'MyButton' } })).equal(undefined);
        });

        it('evaluates numeric equality', () => {
            const evaluate = compileExpression('element.childCount === 0');
            expect(evaluate({ element: { childCount: 3 } })).equal(false);
        });

        it('evaluates loose equality', () => {
            const evaluate = compileExpression("element.childCount == '3'");
            expect(evaluate({ element: { childCount: 3 } })).equal(true);
        });

        it('evaluates loose inequality', () => {
            const evaluate = compileExpression("element.childCount != '4'");
            expect(evaluate({ element: { childCount: 3 } })).equal(true);
        });

        it('evaluates less than', () => {
            const evaluate = compileExpression('tree.depth < 3');
            expect(evaluate({ tree: { depth: 2 } })).equal(true);
        });

        it('evaluates greater than or equal', () => {
            const evaluate = compileExpression('tree.depth >= 2');
            expect(evaluate({ tree: { depth: 2 } })).equal(true);
        });

        it('evaluates floating point numbers', () => {
            const evaluate = compileExpression('tree.depth === 2.0');
            expect(evaluate({ tree: { depth: 2 } })).equal(true);

            const evaluateFloat = compileExpression('tree.depth > 1.5');
            expect(evaluateFloat({ tree: { depth: 2 } })).equal(true);
        });

        it('evaluates tree depth', () => {
            const evaluate = compileExpression('tree.depth <= 3');
            expect(evaluate({ tree: { depth: 2 } })).equal(true);
        });

        it('evaluates parenthesized expressions', () => {
            const evaluate = compileExpression("(element.tag === 'button') && (tree.depth > 1)");
            expect(evaluate({ element: { tag: 'button' }, tree: { depth: 2 } })).equal(true);
        });

        it('handles null comparison', () => {
            const evaluate = compileExpression('element.component !== null');
            expect(evaluate({ element: { component: 'MyButton' } })).equal(true);
        });
    });

    describe('syntax errors', () => {
        it('throws ExpressionSyntaxError on invalid syntax', () => {
            expect(() => compileExpression('invalid!!!syntax')).to.throw(ExpressionSyntaxError);
        });

        it('throws ExpressionSyntaxError on unexpected tokens', () => {
            expect(() => compileExpression('element.tag === ')).to.throw(ExpressionSyntaxError);
        });

        it('throws ExpressionSyntaxError when expected token is missing', () => {
            expect(() => compileExpression('element.()')).to.throw(
                ExpressionSyntaxError,
                "Expected identifier, got lparen ('(')",
            );
        });

        it('handles unterminated string ending with backslash', () => {
            const evaluate = compileExpression("'unterminated\\");
            expect(evaluate({})).equal('unterminated');
        });

        it('throws ExpressionSyntaxError on unknown operators', () => {
            expect(() => compileExpression('element.childCount ** 2')).to.throw(
                ExpressionSyntaxError,
            );
        });
    });

    describe('security', () => {
        it('blocks access to window', () => {
            expect(() => compileExpression('window.location')).to.not.throw();
            expect(() => compileExpression('window.location')({})).to.throw(
                ExpressionSecurityError,
                "Access to 'window' is not allowed",
            );
        });

        it('blocks access to document', () => {
            expect(() => compileExpression('document.cookie')({})).to.throw(
                ExpressionSecurityError,
                "Access to 'document' is not allowed",
            );
        });

        it('blocks non-allowed methods', () => {
            const evaluate = compileExpression("element.tag.replace('a', 'b')");
            expect(() => evaluate({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "Method 'replace' is not allowed",
            );
        });

        it('blocks includes on non-arrays', () => {
            const evaluate = compileExpression("element.tag.includes('a')");
            expect(() => evaluate({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "'includes' can only be called on arrays",
            );
        });

        it('only allows identifiers present in the context', () => {
            const evaluate = compileExpression('globalThis');
            expect(() => evaluate({})).to.throw(
                ExpressionSecurityError,
                "Access to 'globalThis' is not allowed",
            );
        });

        it('blocks access to Object prototype properties', () => {
            const evaluate = compileExpression('toString');
            expect(() => evaluate({})).to.throw(
                ExpressionSecurityError,
                "Access to 'toString' is not allowed",
            );

            const evaluateConstructor = compileExpression('constructor');
            expect(() => evaluateConstructor({})).to.throw(
                ExpressionSecurityError,
                "Access to 'constructor' is not allowed",
            );
        });

        it('blocks member access to Object prototype properties', () => {
            const evaluate = compileExpression('element.toString');
            expect(() => evaluate({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "Access to 'toString' is not allowed",
            );

            const evaluateConstructor = compileExpression('element.constructor');
            expect(() => evaluateConstructor({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "Access to 'constructor' is not allowed",
            );

            const evaluateProto = compileExpression('element.__proto__');
            expect(() => evaluateProto({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "Access to '__proto__' is not allowed",
            );
        });

        it('blocks member access to non-existent properties', () => {
            const evaluate = compileExpression('element.doesNotExist');
            expect(() => evaluate({ element: { tag: 'button' } })).to.throw(
                ExpressionSecurityError,
                "Access to 'doesNotExist' is not allowed",
            );
        });
    });

    describe('safeEvaluateExpression', () => {
        it('returns false on syntax error', () => {
            expect(safeEvaluateExpression('invalid!!!syntax', {})).equal(false);
        });

        it('returns false on security violation', () => {
            expect(safeEvaluateExpression('window.location', {})).equal(false);
        });

        it('returns true for valid expression', () => {
            expect(
                safeEvaluateExpression("element.tag === 'button'", { element: { tag: 'button' } }),
            ).equal(true);
        });
    });

    describe('validateExpressionSyntax', () => {
        it('returns null for valid expressions', () => {
            expect(validateExpressionSyntax("element.tag === 'button'")).to.equal(null);
            expect(validateExpressionSyntax("['a', 'b'].includes(element.tag)")).to.equal(null);
            expect(validateExpressionSyntax('true')).to.equal(null);
        });

        it('returns error message for invalid expressions', () => {
            expect(validateExpressionSyntax('===')).not.to.equal(null);
            expect(validateExpressionSyntax('element.tag ===  ')).not.to.equal(null);
        });
    });
});
