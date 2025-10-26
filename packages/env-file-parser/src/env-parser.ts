export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface CommentNode {
    type: 'Comment';
    id: string;
    text: string;
}

export interface EmptyLineNode {
    type: 'EmptyLine';
    id: string;
}

export interface VariableAssignmentNode {
    type: 'VariableAssignment';
    id: string;
    key: string;
    value: string;
    quotedWith: '"' | "'" | '`' | null;
    comment?: CommentNode;
    beforeComment?: CommentNode;
}

export type ASTNode = CommentNode | EmptyLineNode | VariableAssignmentNode;

export function isCommentNode(node: ASTNode): node is CommentNode {
    return node.type === 'Comment';
}

export function isVariableAssignmentNode(node: ASTNode): node is VariableAssignmentNode {
    return node.type === 'VariableAssignment';
}

export interface ParseError {
    message: string;
    severity: 'error' | 'warning';
}

export interface EnvAST {
    nodes: ASTNode[];
    errors: ParseError[];
    variables: Record<string, string>;
}

export function createEmptyAST(nodes: ASTNode[] = []): EnvAST {
    return {
        nodes,
        errors: [],
        variables: Object.fromEntries(
            nodes.filter(isVariableAssignmentNode).map((n) => [n.key, n.value]),
        ),
    };
}

export function createVariableAssignment(
    key: string,
    value: string,
    quotedWith: '"' | "'" | '`' | null = null,
    comment?: CommentNode,
    beforeComment?: CommentNode,
    id: string = generateId(),
): VariableAssignmentNode {
    return {
        type: 'VariableAssignment',
        id,
        key,
        value,
        quotedWith,
        comment,
        beforeComment,
    };
}

export function parseEnvAST(content: string): EnvAST {
    const nodes: ASTNode[] = [];
    const errors: ParseError[] = [];
    const variables: Record<string, string> = {};
    let beforeCommentNode: CommentNode | undefined = undefined;
    let i = 0;
    const len = content.length;
    while (i < len) {
        // Skip leading whitespace
        while (i < len && (content[i] === ' ' || content[i] === '\t')) i++;
        // Check for empty line
        if (i < len && (content[i] === '\n' || content[i] === '\r')) {
            nodes.push({ type: 'EmptyLine', id: generateId() });
            // Handle \r\n
            if (content[i] === '\r' && content[i + 1] === '\n') i += 2;
            else i++;
            beforeCommentNode = undefined;
            continue;
        }
        // Check for comment line
        if (i < len && content[i] === '#') {
            const commentStart = i + 1;
            let commentEnd = commentStart;
            // Find end of line
            while (commentEnd < len && content[commentEnd] !== '\n' && content[commentEnd] !== '\r')
                commentEnd++;
            // Trim leading spaces in comment
            const commentText = content.slice(commentStart, commentEnd).trimStart();
            beforeCommentNode = { type: 'Comment', id: generateId(), text: commentText };
            nodes.push(beforeCommentNode);
            // Move to next line
            if (content[commentEnd] === '\r' && content[commentEnd + 1] === '\n')
                i = commentEnd + 2;
            else i = commentEnd + 1;
            continue;
        }
        // Parse variable assignment
        const keyStart = i;
        let keyEnd = i;
        let inQuotes = false;
        let quoteChar = '';
        let equalIndex = -1;
        // Find unquoted =
        while (keyEnd < len) {
            const c = content[keyEnd];
            if (!inQuotes && (c === '"' || c === "'" || c === '`')) {
                inQuotes = true;
                quoteChar = c;
            } else if (inQuotes && c === quoteChar) {
                if (keyEnd === keyStart || content[keyEnd - 1] !== '\\') {
                    inQuotes = false;
                    quoteChar = '';
                }
            } else if (!inQuotes && c === '=') {
                equalIndex = keyEnd;
                break;
            } else if (!inQuotes && (c === '\n' || c === '\r')) {
                break;
            }
            keyEnd++;
        }
        if (equalIndex === -1) {
            // No = found, treat as error or skip
            let lineEnd = keyEnd;
            while (lineEnd < len && content[lineEnd] !== '\n' && content[lineEnd] !== '\r')
                lineEnd++;
            errors.push({
                message: 'Invalid syntax: missing = assignment operator',
                severity: 'error',
            });
            beforeCommentNode = undefined;
            // Move to next line
            if (content[lineEnd] === '\r' && content[lineEnd + 1] === '\n') i = lineEnd + 2;
            else i = lineEnd + 1;
            continue;
        }
        // Extract key
        const keyRaw = content.slice(keyStart, equalIndex);
        // Trim whitespace from key
        const key = keyRaw.trim();
        // Extract value
        const valueStart = equalIndex + 1;
        let valueEnd = valueStart;
        let valueInQuotes = false;
        let valueQuoteChar = '';
        let commentIndex = -1;
        while (valueEnd < len) {
            const c = content[valueEnd];
            if (!valueInQuotes && (c === '"' || c === "'" || c === '`')) {
                valueInQuotes = true;
                valueQuoteChar = c;
            } else if (valueInQuotes && c === valueQuoteChar) {
                if (valueEnd === valueStart || content[valueEnd - 1] !== '\\') {
                    valueInQuotes = false;
                    valueQuoteChar = '';
                }
            } else if (!valueInQuotes && c === '#') {
                commentIndex = valueEnd;
                break;
            } else if (!valueInQuotes && (c === '\n' || c === '\r')) {
                break;
            }
            valueEnd++;
        }
        // Trim whitespace from value
        let value = content.slice(valueStart, commentIndex !== -1 ? commentIndex : valueEnd).trim();
        let quotedWith: '"' | "'" | '`' | null = null;
        // Handle quoted values
        if (
            value.length >= 2 &&
            ((value[0] === '"' && value[value.length - 1] === '"') ||
                (value[0] === "'" && value[value.length - 1] === "'") ||
                (value[0] === '`' && value[value.length - 1] === '`'))
        ) {
            quotedWith = value[0];
            value = value.slice(1, -1);
            if (quotedWith === '"') {
                value = value
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\\/g, '\\');
            }
        }
        // Inline comment
        let inlineComment: CommentNode | undefined = undefined;
        if (commentIndex !== -1) {
            const commentTextStart = commentIndex + 1;
            let commentTextEnd = commentTextStart;
            while (
                commentTextEnd < len &&
                content[commentTextEnd] !== '\n' &&
                content[commentTextEnd] !== '\r'
            )
                commentTextEnd++;
            const commentText = content.slice(commentTextStart, commentTextEnd).trimStart();
            inlineComment = { type: 'Comment', id: generateId(), text: commentText };
        }
        // Create node
        const variableNode: VariableAssignmentNode = {
            type: 'VariableAssignment',
            id: generateId(),
            key,
            value,
            quotedWith,
            comment: inlineComment,
            beforeComment: beforeCommentNode,
        };
        nodes.push(variableNode);
        if (key) {
            variables[key] = value;
        }
        beforeCommentNode = undefined;
        // Move to next line
        let lineEnd = valueEnd;
        if (commentIndex !== -1) {
            // Move to end of comment
            lineEnd = commentIndex;
            while (lineEnd < len && content[lineEnd] !== '\n' && content[lineEnd] !== '\r')
                lineEnd++;
        }
        if (content[lineEnd] === '\r' && content[lineEnd + 1] === '\n') i = lineEnd + 2;
        else i = lineEnd + 1;
    }
    return { nodes, errors, variables };
}

export function serializeEnvAST(ast: EnvAST, mode: 'all' | 'minimal' = 'all'): string {
    if (mode === 'minimal') {
        return ast.nodes
            .map((node) => {
                if (node.type === 'VariableAssignment') {
                    const beforeComment = node.beforeComment
                        ? `# ${node.beforeComment.text}\n`
                        : '';
                    const quotedValue = formatVariableValue(node.value, node.quotedWith);
                    const inlineComment = node.comment ? ` # ${node.comment.text}` : '';
                    return `${beforeComment}${node.key}=${quotedValue}${inlineComment}`;
                }
                return '';
            })
            .filter(Boolean)
            .join('\n\n');
    }
    return ast.nodes
        .map((node) => {
            switch (node.type) {
                case 'EmptyLine':
                    return '';
                case 'Comment':
                    return `# ${node.text}`;
                case 'VariableAssignment': {
                    const quotedValue = formatVariableValue(node.value, node.quotedWith);
                    const inlineComment = node.comment ? ` # ${node.comment.text}` : '';
                    return `${node.key}=${quotedValue}${inlineComment}`;
                }
            }
        })
        .join('\n');
}

function formatVariableValue(value: string, originalQuoteType: '"' | "'" | '`' | null): string {
    if (originalQuoteType === '"') {
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
    }
    if (originalQuoteType === "'") {
        return `'${value}'`;
    }
    if (originalQuoteType === '`') {
        return `\`${value}\``;
    }

    const needsQuotes =
        value.includes(' ') || value.includes('\n') || value.includes('\t') || value.includes('#');
    if (needsQuotes) {
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
    }

    return value;
}

export function findVariableNodeById(ast: EnvAST, id: string): VariableAssignmentNode | undefined {
    const node = ast.nodes.find((node) => isVariableAssignmentNode(node) && node.id === id);
    if (node && isVariableAssignmentNode(node)) {
        return node;
    }
    return undefined;
}

export function getVariableNodes(ast: EnvAST): VariableAssignmentNode[] {
    return ast.nodes.filter(isVariableAssignmentNode);
}

export function updateVariableByIdInAST(ast: EnvAST, id: string, newValue: string): EnvAST {
    let updatedKey: string | null = null;

    const nodes = ast.nodes.map((node) => {
        if (isVariableAssignmentNode(node) && node.id === id) {
            updatedKey = node.key;
            return { ...node, value: newValue };
        }
        return node;
    });

    // If no node was found, return the original AST
    if (updatedKey === null) return ast;

    return {
        ...ast,
        nodes,
        variables: {
            ...ast.variables,
            [updatedKey]: newValue,
        },
    };
}

export function addVariableToAST(
    ast: EnvAST,
    key: string,
    value: string,
    description?: string,
    beforeComment?: string,
): EnvAST {
    const nodes = [...ast.nodes];

    // Add before comment as a separate node if provided
    let beforeCommentNode: CommentNode | undefined;
    if (beforeComment) {
        beforeCommentNode = { type: 'Comment', id: generateId(), text: beforeComment };
        nodes.push(beforeCommentNode);
    }

    const newVariableNode: VariableAssignmentNode = {
        type: 'VariableAssignment',
        id: generateId(),
        key,
        value,
        quotedWith: null,
        comment: description
            ? ({ type: 'Comment', id: generateId(), text: description } as CommentNode)
            : undefined,
        beforeComment: beforeCommentNode,
    };

    nodes.push(newVariableNode);

    return {
        ...ast,
        nodes,
        variables: { ...ast.variables, [key]: value },
    };
}

export function updateVariableBeforeCommentByIdInAST(
    ast: EnvAST,
    id: string,
    beforeComment?: string,
): EnvAST {
    let targetVariableIndex = -1;
    let oldBeforeCommentNode: CommentNode | undefined;

    // Find the variable node and its existing before comment
    ast.nodes.forEach((node, index) => {
        if (isVariableAssignmentNode(node) && node.id === id) {
            targetVariableIndex = index;
            oldBeforeCommentNode = node.beforeComment;
        }
    });

    if (targetVariableIndex === -1) return ast;

    const newNodes = [...ast.nodes];

    // Remove the old before comment node from the AST if it exists
    if (oldBeforeCommentNode) {
        const commentIndex = newNodes.findIndex((n) => n === oldBeforeCommentNode);
        if (commentIndex !== -1) {
            newNodes.splice(commentIndex, 1);
            // Adjust target index if comment was before the variable
            if (commentIndex < targetVariableIndex) {
                targetVariableIndex--;
            }
        }
    }

    // Create new before comment node if needed
    let newBeforeCommentNode: CommentNode | undefined;
    if (beforeComment) {
        newBeforeCommentNode = { type: 'Comment', id: generateId(), text: beforeComment };
        newNodes.splice(targetVariableIndex, 0, newBeforeCommentNode);
        targetVariableIndex++; // Variable index moves after comment insertion
    }

    // Update the variable node with the new before comment reference
    newNodes[targetVariableIndex] = {
        ...(newNodes[targetVariableIndex] as VariableAssignmentNode),
        beforeComment: newBeforeCommentNode,
    };

    return {
        ...ast,
        nodes: newNodes,
    };
}

export function renameVariableByIdInAST(ast: EnvAST, id: string, newKey: string): EnvAST {
    const normalizedNewKey = normalizeVariableKey(newKey);

    const variableNode = ast.nodes.find(
        (node) => isVariableAssignmentNode(node) && node.id === id,
    ) as VariableAssignmentNode;
    const oldKey = variableNode?.key;

    if (!variableNode || oldKey === normalizedNewKey) return ast;

    const newNodes = ast.nodes.map((node) => {
        if (isVariableAssignmentNode(node) && node.id === id) {
            return {
                ...node,
                key: normalizedNewKey,
            };
        }
        return node;
    });

    const newVariables = { ...ast.variables };
    const value = newVariables[oldKey];
    delete newVariables[oldKey];
    if (value !== undefined) {
        newVariables[normalizedNewKey] = value;
    }

    return {
        ...ast,
        nodes: newNodes,
        variables: newVariables,
    };
}

export function removeVariableByIdFromAST(ast: EnvAST, id: string): EnvAST {
    // Find the variable node to get its beforeComment reference
    const variableNode = findVariableNodeById(ast, id);
    const beforeCommentToRemove = variableNode?.beforeComment;
    const key = variableNode?.key;

    // Remove the variable node and its associated beforeComment node
    const newNodes = ast.nodes.filter((node) => {
        // Remove the variable node
        if (isVariableAssignmentNode(node) && node.id === id) {
            return false;
        }
        // Remove the beforeComment node if it exists
        if (beforeCommentToRemove && node === beforeCommentToRemove) {
            return false;
        }
        return true;
    });

    const newVariables = { ...ast.variables };
    if (key) {
        delete newVariables[key];
    }

    return {
        ...ast,
        nodes: newNodes,
        variables: newVariables,
    };
}

export function normalizeVariableKey(key: string): string {
    return key.toUpperCase().replace(/[.-]/g, '_');
}

export function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
