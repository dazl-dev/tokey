import { expect } from 'chai';
import {
    createVariableAssignment,
    isCommentNode,
    isVariableAssignmentNode,
    findVariableNodeById,
    normalizeVariableKey,
    parseEnvAST,
    type CommentNode,
    type VariableAssignmentNode,
    type EmptyLineNode,
} from '../env-parser';

describe('Helper Functions', () => {
    describe('createVariableAssignment', () => {
        it('should create a basic variable assignment node', () => {
            const node = createVariableAssignment('TEST_KEY', 'test_value');

            expect(node.type).to.equal('VariableAssignment');
            expect(node.key).to.equal('TEST_KEY');
            expect(node.value).to.equal('test_value');
            expect(node.quotedWith).to.equal(null);
            expect(node.comment).to.equal(undefined);
            expect(node.beforeComment).to.equal(undefined);
            expect(node.id).to.be.a('string');
            expect(node.id.length).to.be.greaterThan(0);
        });

        it('should create a variable assignment with quotes', () => {
            const node = createVariableAssignment('TEST_KEY', 'test value', '"');

            expect(node.quotedWith).to.equal('"');
        });

        it('should create a variable assignment with single quotes', () => {
            const node = createVariableAssignment('TEST_KEY', 'test value', "'");

            expect(node.quotedWith).to.equal("'");
        });

        it('should create a variable assignment with backticks', () => {
            const node = createVariableAssignment('TEST_KEY', 'test value', '`');

            expect(node.quotedWith).to.equal('`');
        });

        it('should create a variable assignment with inline comment', () => {
            const comment: CommentNode = {
                type: 'Comment',
                id: 'comment-id',
                text: 'inline comment',
            };
            const node = createVariableAssignment('TEST_KEY', 'test_value', null, comment);

            expect(node.comment).to.deep.equal(comment);
        });

        it('should create a variable assignment with before comment', () => {
            const beforeComment: CommentNode = {
                type: 'Comment',
                id: 'before-comment-id',
                text: 'before comment',
            };
            const node = createVariableAssignment(
                'TEST_KEY',
                'test_value',
                null,
                undefined,
                beforeComment,
            );

            expect(node.beforeComment).to.deep.equal(beforeComment);
        });

        it('should create a variable assignment with both inline and before comments', () => {
            const comment: CommentNode = {
                type: 'Comment',
                id: 'comment-id',
                text: 'inline comment',
            };
            const beforeComment: CommentNode = {
                type: 'Comment',
                id: 'before-comment-id',
                text: 'before comment',
            };
            const node = createVariableAssignment(
                'TEST_KEY',
                'test_value',
                '"',
                comment,
                beforeComment,
            );

            expect(node.comment).to.deep.equal(comment);
            expect(node.beforeComment).to.deep.equal(beforeComment);
            expect(node.quotedWith).to.equal('"');
        });

        it('should use provided id when given', () => {
            const customId = 'custom-test-id';
            const node = createVariableAssignment(
                'TEST_KEY',
                'test_value',
                null,
                undefined,
                undefined,
                customId,
            );

            expect(node.id).to.equal(customId);
        });

        it('should handle empty values', () => {
            const node = createVariableAssignment('TEST_KEY', '');

            expect(node.value).to.equal('');
        });

        it('should handle special characters in key and value', () => {
            const node = createVariableAssignment('TEST_KEY_123', 'value with spaces and símbolos');

            expect(node.key).to.equal('TEST_KEY_123');
            expect(node.value).to.equal('value with spaces and símbolos');
        });
    });

    describe('isCommentNode', () => {
        it('should return true for comment nodes', () => {
            const commentNode: CommentNode = {
                type: 'Comment',
                id: 'test-id',
                text: 'test comment',
            };

            expect(isCommentNode(commentNode)).to.equal(true);
        });

        it('should return false for variable assignment nodes', () => {
            const variableNode: VariableAssignmentNode = {
                type: 'VariableAssignment',
                id: 'test-id',
                key: 'TEST_KEY',
                value: 'test_value',
                quotedWith: null,
            };

            expect(isCommentNode(variableNode)).to.equal(false);
        });

        it('should return false for empty line nodes', () => {
            const emptyLineNode: EmptyLineNode = { type: 'EmptyLine', id: 'test-id' };

            expect(isCommentNode(emptyLineNode)).to.equal(false);
        });
    });

    describe('isVariableAssignmentNode', () => {
        it('should return true for variable assignment nodes', () => {
            const variableNode: VariableAssignmentNode = {
                type: 'VariableAssignment',
                id: 'test-id',
                key: 'TEST_KEY',
                value: 'test_value',
                quotedWith: null,
            };

            expect(isVariableAssignmentNode(variableNode)).to.equal(true);
        });

        it('should return false for comment nodes', () => {
            const commentNode: CommentNode = {
                type: 'Comment',
                id: 'test-id',
                text: 'test comment',
            };

            expect(isVariableAssignmentNode(commentNode)).to.equal(false);
        });

        it('should return false for empty line nodes', () => {
            const emptyLineNode: EmptyLineNode = { type: 'EmptyLine', id: 'test-id' };

            expect(isVariableAssignmentNode(emptyLineNode)).to.equal(false);
        });
    });

    describe('findVariableNodeById', () => {
        it('should find variable node by id', () => {
            const content = 'KEY1=value1\nKEY2=value2';
            const ast = parseEnvAST(content);
            const variableNodes = ast.nodes.filter(isVariableAssignmentNode);
            const targetNode = variableNodes[0];

            const foundNode = findVariableNodeById(ast, targetNode.id);

            expect(foundNode).to.deep.equal(targetNode);
        });

        it('should return undefined when id is not found', () => {
            const content = 'KEY1=value1\nKEY2=value2';
            const ast = parseEnvAST(content);

            const foundNode = findVariableNodeById(ast, 'non-existent-id');

            expect(foundNode).to.equal(undefined);
        });

        it('should return undefined when searching in empty AST', () => {
            const ast = parseEnvAST('');

            const foundNode = findVariableNodeById(ast, 'any-id');

            expect(foundNode).to.equal(undefined);
        });

        it('should not find comment nodes when searching by id', () => {
            const content = '# This is a comment\nKEY1=value1';
            const ast = parseEnvAST(content);
            const commentNode = ast.nodes.find(isCommentNode);

            // Even if we search for a comment node's id, findVariableNodeById should return undefined
            const foundNode = findVariableNodeById(ast, commentNode!.id);

            expect(foundNode).to.equal(undefined);
        });

        it('should find variable node with comments', () => {
            const content = '# Before comment\nKEY1=value1 # inline comment';
            const ast = parseEnvAST(content);
            const variableNode = ast.nodes.find(isVariableAssignmentNode);

            const foundNode = findVariableNodeById(ast, variableNode!.id);

            expect(foundNode).to.deep.equal(variableNode);
            expect(foundNode!.beforeComment?.text).to.equal('Before comment');
            expect(foundNode!.comment?.text).to.equal('inline comment');
        });
    });

    describe('normalizeVariableKey', () => {
        it('should convert lowercase to uppercase', () => {
            expect(normalizeVariableKey('lowercase')).to.equal('LOWERCASE');
        });

        it('should convert mixed case to uppercase', () => {
            expect(normalizeVariableKey('MixedCase')).to.equal('MIXEDCASE');
        });

        it('should keep uppercase unchanged', () => {
            expect(normalizeVariableKey('UPPERCASE')).to.equal('UPPERCASE');
        });

        it('should replace dots with underscores', () => {
            expect(normalizeVariableKey('key.with.dots')).to.equal('KEY_WITH_DOTS');
        });

        it('should replace hyphens with underscores', () => {
            expect(normalizeVariableKey('key-with-hyphens')).to.equal('KEY_WITH_HYPHENS');
        });

        it('should replace both dots and hyphens with underscores', () => {
            expect(normalizeVariableKey('key.with-mixed.chars')).to.equal('KEY_WITH_MIXED_CHARS');
        });

        it('should handle multiple consecutive special characters', () => {
            expect(normalizeVariableKey('key...with---multiple')).to.equal('KEY___WITH___MULTIPLE');
        });

        it('should handle empty string', () => {
            expect(normalizeVariableKey('')).to.equal('');
        });

        it('should preserve underscores', () => {
            expect(normalizeVariableKey('key_with_underscores')).to.equal('KEY_WITH_UNDERSCORES');
        });

        it('should handle numbers', () => {
            expect(normalizeVariableKey('key123')).to.equal('KEY123');
        });

        it('should handle keys starting with numbers', () => {
            expect(normalizeVariableKey('123key')).to.equal('123KEY');
        });

        it('should handle special characters at the beginning and end', () => {
            expect(normalizeVariableKey('.key-')).to.equal('_KEY_');
        });

        it('should handle complex real-world examples', () => {
            expect(normalizeVariableKey('database.host')).to.equal('DATABASE_HOST');
            expect(normalizeVariableKey('api-key-secret')).to.equal('API_KEY_SECRET');
            expect(normalizeVariableKey('JWT_SECRET')).to.equal('JWT_SECRET');
            expect(normalizeVariableKey('NODE_ENV')).to.equal('NODE_ENV');
        });
    });
});
