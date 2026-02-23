# @tokey/expression-evaluator

Safe expression evaluator for `showWhen` expressions.

Uses a restricted AST-based parser instead of `eval()` or `new Function()`.
Only allows property access on documented context parameters, comparisons,
logical operators, array literals with `.includes()`, and boolean/string/number literals.

Expressions that fail to parse or evaluate are treated as `false`.

## API

```ts
import { compileExpression, safeEvaluateExpression, evaluateShowWhen } from "@tokey/expression-evaluator";

const context = {
    element: { tag: 'button' },
    tree: { depth: 2 }
};

// Compile for repeated evaluation
const evaluate = compileExpression("element.tag === 'button' && tree.depth > 1");
const result = evaluate(context); // true

// Evaluate once safely
const isMatch = safeEvaluateExpression("element.tag === 'div'", context); // false

// Evaluate an array of showWhen expressions (returns true if any match)
const isVisible = evaluateShowWhen(["element.tag === 'button'", "tree.depth === 1"], context); // true
```
