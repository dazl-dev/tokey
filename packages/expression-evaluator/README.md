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

// Validate syntax without evaluating (returns null if valid, error message if invalid)
const error = validateExpressionSyntax("element.tag ==="); // "Unexpected token: ''"
const valid = validateExpressionSyntax("element.tag === 'div'"); // null
```
