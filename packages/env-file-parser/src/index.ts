export { parseEnvAST, serializeEnvAST } from './env-parser';
export type {
    EnvAST,
    ASTNode,
    CommentNode,
    EmptyLineNode,
    VariableAssignmentNode,
    ParseError,
} from './env-parser';
export {
    createEmptyAST,
    createVariableAssignment,
    isCommentNode,
    isVariableAssignmentNode,
    findVariableNodeById,
    getVariableNodes,
    updateVariableByIdInAST,
    addVariableToAST,
    updateVariableBeforeCommentByIdInAST,
    renameVariableByIdInAST,
    removeVariableByIdFromAST,
    normalizeVariableKey,
    generateId,
} from './env-parser';
export {
    validateEnvAST,
    VALIDATION_MESSAGES,
    maxSecretValueLengthSuggestion,
} from './ast-validations';
export type { ValidationError } from './env-parser';
