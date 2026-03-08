# @tokey/expression-evaluator

Safe expression evaluator for simple expressions.

Uses a restricted AST-based parser instead of `eval()` or `new Function()`.
Only allows property access on context parameters, comparisons,
logical operators, array literals with `.includes()`, and boolean/string/number literals.

Expressions that fail to parse or evaluate are treated as `false`.

## API

```ts
import { compileExpression, safeEvaluateExpression, validateExpressionSyntax } from "@tokey/expression-evaluator";

const context = {
    element: { tag: 'button' },
    tree: { depth: 2 }
};

// Compile for repeated evaluation
const evaluate = compileExpression("element.tag === 'button' && tree.depth > 1");
const result = evaluate(context); // true

// Evaluate once safely (returns false on parse/evaluation errors)
const isMatch = safeEvaluateExpression("element.tag === 'div'", context); // false

// Validate syntax without evaluating (returns object with isValid boolean and optional error message)
const validationError = validateExpressionSyntax("element.tag ==="); // { isValid: false, error: "Unexpected token: ''" }
const validationSuccess = validateExpressionSyntax("element.tag === 'div'"); // { isValid: true }
```
