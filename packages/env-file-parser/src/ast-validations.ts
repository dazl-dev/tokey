import { type ValidationError, type EnvAST, getVariableNodes } from './env-parser';

export const VALIDATION_MESSAGES = {
    SECRET_NAME_EMPTY: 'Secret name cannot be empty',
    SECRET_NAME_SHOULD_BE_UPPERCASE: 'Secret names should be uppercase',
    SECRET_NAME_INVALID_CHARACTERS: 'Secret name contains invalid characters',
    SECRET_VALUE_MULTILINE: 'Multi-line secret values may cause issues',
    SECRET_VALUE_UNESCAPED_QUOTES: 'Unescaped quotes in secret value may cause parsing issues',
    SECRET_VALUE_TOO_LONG: 'Very long secret values may cause performance issues',
    SECRET_VALUE_TAB_CHARACTERS: 'Tab characters in secret values may cause issues',
    DUPLICATE_SECRET_NAME: 'Duplicate secret name',
} as const;

function validateSecretKey(key: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!key.trim()) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_NAME_EMPTY,
            severity: 'error',
        });
        return errors;
    }
    if (key !== key.toUpperCase()) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_NAME_SHOULD_BE_UPPERCASE,
            severity: 'warning',
        });
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_NAME_INVALID_CHARACTERS,
            severity: 'error',
        });
    }
    return errors;
}

export const maxSecretValueLengthSuggestion = 10000;

function validateSecretValue(
    value: string,
    field: string,
    quotedWith?: '"' | "'" | '`' | null,
): ValidationError[] {
    const errors: ValidationError[] = [];
    if (value.includes('\n')) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_VALUE_MULTILINE,
            severity: 'warning',
        });
    }
    if (value.includes('"') && quotedWith !== '"') {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_VALUE_UNESCAPED_QUOTES,
            severity: 'warning',
        });
    }
    if (value.length > maxSecretValueLengthSuggestion) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_VALUE_TOO_LONG,
            severity: 'warning',
        });
    }
    if (value.includes('\t')) {
        errors.push({
            field,
            message: VALIDATION_MESSAGES.SECRET_VALUE_TAB_CHARACTERS,
            severity: 'warning',
        });
    }
    return errors;
}

export function validateEnvAST(ast: EnvAST, seenKeys = new Set<string>()): ValidationError[] {
    const errors: ValidationError[] = [];
    const duplicateKeys = new Set<string>();
    const secretNodes = getVariableNodes(ast);
    for (const secretNode of secretNodes) {
        const key = secretNode.key;
        if (seenKeys.has(key)) {
            duplicateKeys.add(key);
        }
        seenKeys.add(key);
        errors.push(...validateSecretKey(key, key));
        errors.push(...validateSecretValue(secretNode.value, key, secretNode.quotedWith));
    }
    for (const duplicateKey of duplicateKeys) {
        errors.push({
            field: duplicateKey,
            message: VALIDATION_MESSAGES.DUPLICATE_SECRET_NAME,
            severity: 'error',
        });
    }
    return errors;
}
