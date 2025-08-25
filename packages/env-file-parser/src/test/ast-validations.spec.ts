import { expect } from 'chai';
import { parseEnvAST } from '../env-parser';
import {
    maxSecretValueLengthSuggestion,
    validateEnvAST,
    VALIDATION_MESSAGES,
} from '../ast-validations';

describe('Secret validations', () => {
    it('should detect duplicate secret names', () => {
        const content = 'KEY1=value1\nKEY1=value2';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        expect(
            errors.some((e) => e.message === VALIDATION_MESSAGES.DUPLICATE_SECRET_NAME),
        ).to.equal(true);
    });

    it('should validate secret names for uppercase', () => {
        const content = 'lowercase=value\nMIXEDcase=value\nUPPERCASE=value';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const uppercaseWarnings = errors.filter(
            (e) =>
                e.message === VALIDATION_MESSAGES.SECRET_NAME_SHOULD_BE_UPPERCASE &&
                e.severity === 'warning',
        );
        expect(uppercaseWarnings).to.have.length(2);
    });

    it('should validate secret names for invalid characters', () => {
        const content = 'VALID_NAME=value\nINVALID-NAME=value\n123INVALID=value';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const invalidCharErrors = errors.filter(
            (e) =>
                e.message === VALIDATION_MESSAGES.SECRET_NAME_INVALID_CHARACTERS &&
                e.severity === 'error',
        );
        expect(invalidCharErrors).to.have.length(2);
    });

    it('should validate secret values for multi-line content', () => {
        const content = 'KEY1=single line\nKEY2="multi\nline\nvalue"';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const multiLineWarnings = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_VALUE_MULTILINE,
        );
        expect(multiLineWarnings).to.have.length(1);
    });

    it('should validate secret values for unescaped quotes', () => {
        const content = 'KEY1=value with " quotes\nKEY2="properly quoted"';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const quoteWarnings = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_VALUE_UNESCAPED_QUOTES,
        );
        expect(quoteWarnings).to.have.length(1);
    });

    it('should validate secret values for length', () => {
        const longValue = 'x'.repeat(maxSecretValueLengthSuggestion + 1);
        const content = `KEY1=short\nKEY2=${longValue}`;
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const lengthWarnings = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_VALUE_TOO_LONG,
        );
        expect(lengthWarnings).to.have.length(1);
    });

    it('should validate secret values for tab characters', () => {
        const content = 'KEY1=normal\tvalue\nKEY2=clean_value';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const tabWarnings = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_VALUE_TAB_CHARACTERS,
        );
        expect(tabWarnings).to.have.length(1);
    });

    it('should not report parsing errors as validation errors', () => {
        const content = 'INVALID_LINE_NO_EQUALS\nVALID_KEY=value';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const parsingErrorsInValidation = errors.filter((e) =>
            e.message.includes('missing = assignment operator'),
        );
        expect(parsingErrorsInValidation).to.have.length(0);
    });

    it('should validate empty secret key in AST', () => {
        const content = '=value\n   =value';
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const emptyKeyErrors = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_NAME_EMPTY,
        );
        expect(emptyKeyErrors).to.have.length(2);
    });

    it('should validate too long secret value in AST', () => {
        const longValue = 'x'.repeat(maxSecretValueLengthSuggestion + 1);
        const content = `KEY1=${longValue}`;
        const ast = parseEnvAST(content);
        const errors = validateEnvAST(ast);
        const lengthWarnings = errors.filter(
            (e) => e.message === VALIDATION_MESSAGES.SECRET_VALUE_TOO_LONG,
        );
        expect(lengthWarnings).to.have.length(1);
    });
});
