/**
 * Safe expression evaluator for simple expressions.
 *
 * Uses a restricted AST-based parser instead of `eval()` or `new Function()`.
 * Only allows property access on documented context parameters, comparisons,
 * logical operators, array literals with `.includes()`, and boolean/string/number literals.
 *
 * Expressions that fail to parse or evaluate are treated as `false`.
 */

// ─── Token types ────────────────────────────────────────────────────────

type TokenType =
    | 'identifier'
    | 'number'
    | 'string'
    | 'boolean'
    | 'null'
    | 'operator'
    | 'dot'
    | 'lparen'
    | 'rparen'
    | 'lbracket'
    | 'rbracket'
    | 'comma'
    | 'eof';

interface Token {
    type: TokenType;
    value: string;
}

// ─── Lexer ──────────────────────────────────────────────────────────────

function tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = expression.length;

    while (i < len) {
        const ch = expression[i];

        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // String literals
        if (ch === "'" || ch === '"') {
            const quote = ch;
            let str = '';
            i++; // skip opening quote
            while (i < len && expression[i] !== quote) {
                if (expression[i] === '\\') {
                    i++;
                    str += expression[i] ?? '';
                } else {
                    str += expression[i];
                }
                i++;
            }
            i++; // skip closing quote
            tokens.push({ type: 'string', value: str });
            continue;
        }

        // Numbers
        if (/\d/.test(ch)) {
            let num = '';
            while (i < len && /[\d.]/.test(expression[i])) {
                num += expression[i];
                i++;
            }
            tokens.push({ type: 'number', value: num });
            continue;
        }

        // Identifiers and keywords
        if (/[a-zA-Z_$]/.test(ch)) {
            let ident = '';
            while (i < len && /[a-zA-Z0-9_$]/.test(expression[i])) {
                ident += expression[i];
                i++;
            }
            if (ident === 'true' || ident === 'false') {
                tokens.push({ type: 'boolean', value: ident });
            } else if (ident === 'null') {
                tokens.push({ type: 'null', value: ident });
            } else {
                tokens.push({ type: 'identifier', value: ident });
            }
            continue;
        }

        // Operators
        if (ch === '=' && expression[i + 1] === '=' && expression[i + 2] === '=') {
            tokens.push({ type: 'operator', value: '===' });
            i += 3;
            continue;
        }
        if (ch === '!' && expression[i + 1] === '=' && expression[i + 2] === '=') {
            tokens.push({ type: 'operator', value: '!==' });
            i += 3;
            continue;
        }
        if (ch === '=' && expression[i + 1] === '=') {
            tokens.push({ type: 'operator', value: '==' });
            i += 2;
            continue;
        }
        if (ch === '!' && expression[i + 1] === '=') {
            tokens.push({ type: 'operator', value: '!=' });
            i += 2;
            continue;
        }
        if (ch === '>' && expression[i + 1] === '=') {
            tokens.push({ type: 'operator', value: '>=' });
            i += 2;
            continue;
        }
        if (ch === '<' && expression[i + 1] === '=') {
            tokens.push({ type: 'operator', value: '<=' });
            i += 2;
            continue;
        }
        if (ch === '&' && expression[i + 1] === '&') {
            tokens.push({ type: 'operator', value: '&&' });
            i += 2;
            continue;
        }
        if (ch === '|' && expression[i + 1] === '|') {
            tokens.push({ type: 'operator', value: '||' });
            i += 2;
            continue;
        }
        if (ch === '!') {
            tokens.push({ type: 'operator', value: '!' });
            i++;
            continue;
        }
        if (ch === '>' || ch === '<') {
            tokens.push({ type: 'operator', value: ch });
            i++;
            continue;
        }

        // Punctuation
        if (ch === '.') {
            tokens.push({ type: 'dot', value: '.' });
            i++;
            continue;
        }
        if (ch === '(') {
            tokens.push({ type: 'lparen', value: '(' });
            i++;
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: 'rparen', value: ')' });
            i++;
            continue;
        }
        if (ch === '[') {
            tokens.push({ type: 'lbracket', value: '[' });
            i++;
            continue;
        }
        if (ch === ']') {
            tokens.push({ type: 'rbracket', value: ']' });
            i++;
            continue;
        }
        if (ch === ',') {
            tokens.push({ type: 'comma', value: ',' });
            i++;
            continue;
        }

        throw new ExpressionSyntaxError(`Unexpected character: '${ch}' at position ${i}`);
    }

    tokens.push({ type: 'eof', value: '' });
    return tokens;
}

// ─── AST nodes ──────────────────────────────────────────────────────────

type AstNode =
    | { type: 'literal'; value: string | number | boolean | null }
    | { type: 'identifier'; name: string }
    | { type: 'memberAccess'; object: AstNode; property: string }
    | { type: 'arrayLiteral'; elements: AstNode[] }
    | { type: 'methodCall'; object: AstNode; method: string; args: AstNode[] }
    | { type: 'binaryOp'; operator: string; left: AstNode; right: AstNode }
    | { type: 'unaryOp'; operator: string; operand: AstNode }
    | { type: 'parenthesized'; expression: AstNode };

// ─── Parser ─────────────────────────────────────────────────────────────

class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token {
        return this.tokens[this.pos];
    }

    private consume(expectedType?: TokenType): Token {
        const token = this.tokens[this.pos];
        if (expectedType && token.type !== expectedType) {
            throw new ExpressionSyntaxError(
                `Expected ${expectedType}, got ${token.type} ('${token.value}')`,
            );
        }
        this.pos++;
        return token;
    }

    parse(): AstNode {
        const node = this.parseOr();
        if (this.peek().type !== 'eof') {
            throw new ExpressionSyntaxError(`Unexpected token: '${this.peek().value}'`);
        }
        return node;
    }

    private parseOr(): AstNode {
        let left = this.parseAnd();
        while (this.peek().type === 'operator' && this.peek().value === '||') {
            this.consume();
            const right = this.parseAnd();
            left = { type: 'binaryOp', operator: '||', left, right };
        }
        return left;
    }

    private parseAnd(): AstNode {
        let left = this.parseComparison();
        while (this.peek().type === 'operator' && this.peek().value === '&&') {
            this.consume();
            const right = this.parseComparison();
            left = { type: 'binaryOp', operator: '&&', left, right };
        }
        return left;
    }

    private parseComparison(): AstNode {
        let left = this.parseUnary();
        const compOps = ['===', '!==', '==', '!=', '>', '<', '>=', '<='];
        while (this.peek().type === 'operator' && compOps.includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseUnary();
            left = { type: 'binaryOp', operator: op, left, right };
        }
        return left;
    }

    private parseUnary(): AstNode {
        if (this.peek().type === 'operator' && this.peek().value === '!') {
            this.consume();
            const operand = this.parseUnary();
            return { type: 'unaryOp', operator: '!', operand };
        }
        return this.parsePostfix();
    }

    private parsePostfix(): AstNode {
        let node = this.parsePrimary();

        while (true) {
            if (this.peek().type === 'dot') {
                this.consume(); // consume '.'
                const prop = this.consume('identifier');

                // Check for method call
                if (this.peek().type === 'lparen') {
                    this.consume(); // consume '('
                    const args: AstNode[] = [];
                    if (this.peek().type !== 'rparen') {
                        args.push(this.parseOr());
                        while (this.peek().type === 'comma') {
                            this.consume();
                            args.push(this.parseOr());
                        }
                    }
                    this.consume('rparen');
                    node = { type: 'methodCall', object: node, method: prop.value, args };
                } else {
                    node = { type: 'memberAccess', object: node, property: prop.value };
                }
            } else {
                break;
            }
        }

        return node;
    }

    private parsePrimary(): AstNode {
        const token = this.peek();

        switch (token.type) {
            case 'string':
                this.consume();
                return { type: 'literal', value: token.value };
            case 'number':
                this.consume();
                return { type: 'literal', value: Number(token.value) };
            case 'boolean':
                this.consume();
                return { type: 'literal', value: token.value === 'true' };
            case 'null':
                this.consume();
                return { type: 'literal', value: null };
            case 'identifier':
                this.consume();
                return { type: 'identifier', name: token.value };
            case 'lbracket': {
                this.consume(); // consume '['
                const elements: AstNode[] = [];
                if (this.peek().type !== 'rbracket') {
                    elements.push(this.parseOr());
                    while (this.peek().type === 'comma') {
                        this.consume();
                        elements.push(this.parseOr());
                    }
                }
                this.consume('rbracket');
                return { type: 'arrayLiteral', elements };
            }
            case 'lparen': {
                this.consume(); // consume '('
                const expr = this.parseOr();
                this.consume('rparen');
                return { type: 'parenthesized', expression: expr };
            }
            default:
                throw new ExpressionSyntaxError(`Unexpected token: '${token.value}'`);
        }
    }
}

// ─── Evaluator ──────────────────────────────────────────────────────────

function evaluateNode<T extends Record<string, unknown>>(node: AstNode, context: T): unknown {
    switch (node.type) {
        case 'literal':
            return node.value;

        case 'identifier': {
            if (!Object.hasOwn(context, node.name)) {
                throw new ExpressionSecurityError(`Access to '${node.name}' is not allowed`);
            }
            return context[node.name];
        }

        case 'memberAccess': {
            const obj = evaluateNode(node.object, context);
            if (obj === null || typeof obj !== 'object') {
                return undefined;
            }
            if (!Object.hasOwn(obj, node.property)) {
                throw new ExpressionSecurityError(`Access to '${node.property}' is not allowed`);
            }
            return (obj as Record<string, unknown>)[node.property];
        }

        case 'arrayLiteral':
            return node.elements.map((el) => evaluateNode(el, context));

        case 'methodCall': {
            const obj = evaluateNode(node.object, context);
            // Only allow safe array methods
            if (node.method === 'includes') {
                if (!Array.isArray(obj)) {
                    throw new ExpressionSecurityError(`'includes' can only be called on arrays`);
                }
                const arg = evaluateNode(node.args[0], context);
                return obj.includes(arg);
            }
            throw new ExpressionSecurityError(`Method '${node.method}' is not allowed`);
        }

        case 'binaryOp': {
            // Short-circuit logical operators: evaluate right side lazily
            if (node.operator === '&&') {
                const left = evaluateNode(node.left, context);
                return left ? evaluateNode(node.right, context) : left;
            }
            if (node.operator === '||') {
                const left = evaluateNode(node.left, context);
                return left ? left : evaluateNode(node.right, context);
            }
            const left = evaluateNode(node.left, context);
            const right = evaluateNode(node.right, context);
            switch (node.operator) {
                case '===':
                    return left === right;
                case '!==':
                    return left !== right;
                case '==':
                    return left == right;
                case '!=':
                    return left != right;
                case '>':
                    return (left as number) > (right as number);
                case '<':
                    return (left as number) < (right as number);
                case '>=':
                    return (left as number) >= (right as number);
                case '<=':
                    return (left as number) <= (right as number);
                default:
                    throw new ExpressionSyntaxError(`Unknown operator: '${node.operator}'`);
            }
        }

        case 'unaryOp': {
            const operand = evaluateNode(node.operand, context);
            if (node.operator === '!') {
                return !operand;
            }
            throw new ExpressionSyntaxError(`Unknown unary operator: '${node.operator}'`);
        }

        case 'parenthesized':
            return evaluateNode(node.expression, context);
    }
}

// ─── Public API ─────────────────────────────────────────────────────────

export class ExpressionSyntaxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionSyntaxError';
    }
}

export class ExpressionSecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionSecurityError';
    }
}

/**
 * Parses and validates an expression string.
 * Throws ExpressionSyntaxError if the expression is invalid.
 * Returns a cached evaluator function for repeated evaluation.
 */
export function compileExpression<T extends Record<string, unknown>>(
    expression: string,
): (context: T) => unknown {
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    const ast = parser.parse();

    return (context: T) => {
        const result = evaluateNode(ast, context);
        return result;
    };
}

/**
 * Evaluates a single expression in the given context.
 * Returns false if the expression fails to parse or evaluate.
 */
export function safeEvaluateExpression<T extends Record<string, unknown>>(
    expression: string,
    context: T,
): unknown {
    try {
        const evaluator = compileExpression<T>(expression);
        return evaluator(context);
    } catch {
        return false;
    }
}

/**
 * Validates expression syntax without evaluating.
 * Returns null if valid, or the error message if invalid.
 */
export function validateExpressionSyntax(expression: string): string | null {
    try {
        const tokens = tokenize(expression);
        const parser = new Parser(tokens);
        parser.parse();
        return null;
    } catch (error) {
        return error instanceof Error ? error.message : 'Invalid expression';
    }
}
