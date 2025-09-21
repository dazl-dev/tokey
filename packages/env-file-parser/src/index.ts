export {
    maxSecretValueLengthSuggestion,
    validateEnvAST,
    VALIDATION_MESSAGES,
} from './ast-validations.ts';
export {
    addVariableToAST,
    createEmptyAST,
    createVariableAssignment,
    findVariableNodeById,
    generateId,
    getVariableNodes,
    isCommentNode,
    isVariableAssignmentNode,
    normalizeVariableKey,
    parseEnvAST,
    removeVariableByIdFromAST,
    renameVariableByIdInAST,
    serializeEnvAST,
    updateVariableBeforeCommentByIdInAST,
    updateVariableByIdInAST,
} from './env-parser.ts';
export type {
    ASTNode,
    CommentNode,
    EmptyLineNode,
    EnvAST,
    ParseError,
    ValidationError,
    VariableAssignmentNode,
} from './env-parser.ts';
