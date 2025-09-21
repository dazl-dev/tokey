import { expect } from 'chai';
import {
    parseEnvAST,
    updateVariableByIdInAST,
    addVariableToAST,
    removeVariableByIdFromAST,
    updateVariableBeforeCommentByIdInAST,
    renameVariableByIdInAST,
    getVariableNodes,
    type EnvAST,
    type VariableAssignmentNode,
} from '../env-parser.ts';

function findVariableNodes(ast: EnvAST, key: string): VariableAssignmentNode[] {
    return getVariableNodes(ast).filter((node) => node.key === key);
}

describe('AST manipulation', () => {
    it('should update variable in AST', () => {
        const content = 'KEY1=value1\nKEY2=value2';
        const ast = parseEnvAST(content);
        const key1Node = findVariableNodes(ast, 'KEY1')[0];
        const updatedAST = updateVariableByIdInAST(ast, key1Node.id, 'new_value');

        expect(updatedAST.variables.KEY1).to.equal('new_value');
        expect(updatedAST.variables.KEY2).to.equal('value2');
    });

    it('should add variable to AST', () => {
        const content = 'KEY1=value1';
        const ast = parseEnvAST(content);
        const updatedAST = addVariableToAST(ast, 'KEY2', 'value2');

        expect(updatedAST.variables.KEY2).to.equal('value2');
        const varNode = findVariableNodes(updatedAST, 'KEY2')[0];
        expect(varNode?.key).to.equal('KEY2');
    });

    it('should add variable with before comment to AST', () => {
        const content = 'KEY1=value1';
        const ast = parseEnvAST(content);
        const updatedAST = addVariableToAST(
            ast,
            'KEY2',
            'value2',
            'inline description',
            'before comment',
        );

        expect(updatedAST.variables.KEY2).to.equal('value2');
        const varNode = findVariableNodes(updatedAST, 'KEY2')[0];
        expect(varNode?.key).to.equal('KEY2');
        expect(varNode?.comment?.text).to.equal('inline description');
        expect(varNode?.beforeComment?.text).to.equal('before comment');
    });

    it('should remove variable from AST', () => {
        const content = 'KEY1=value1\nKEY2=value2';
        const ast = parseEnvAST(content);
        const key1Node = findVariableNodes(ast, 'KEY1')[0];
        const updatedAST = removeVariableByIdFromAST(ast, key1Node.id);

        expect(updatedAST.variables).to.not.have.property('KEY1');
        expect(updatedAST.variables.KEY2).to.equal('value2');
    });

    it('should remove variable and its before comment from AST', () => {
        const content = '# Comment for KEY1\nKEY1=value1\nKEY2=value2';
        const ast = parseEnvAST(content);

        // Verify the before comment exists before removal
        const varNode = findVariableNodes(ast, 'KEY1')[0];
        expect(varNode?.beforeComment?.text).to.equal('Comment for KEY1');
        expect(ast.nodes).to.have.length(3); // comment + 2 variables

        const updatedAST = removeVariableByIdFromAST(ast, varNode.id);

        // Verify both variable and before comment are removed
        expect(updatedAST.variables).to.not.have.property('KEY1');
        expect(updatedAST.variables.KEY2).to.equal('value2');
        expect(updatedAST.nodes).to.have.length(1); // only KEY2 should remain

        // Verify the comment node is no longer in the AST
        const commentNodes = updatedAST.nodes.filter((node) => node.type === 'Comment');
        expect(commentNodes).to.have.length(0);
    });

    it('should update variable before comment in AST', () => {
        const content = 'KEY1=value1\nKEY2=value2';
        const ast = parseEnvAST(content);
        const key1Node = findVariableNodes(ast, 'KEY1')[0];
        const updatedAST = updateVariableBeforeCommentByIdInAST(
            ast,
            key1Node.id,
            'new before comment',
        );

        const varNode = findVariableNodes(updatedAST, 'KEY1')[0];
        expect(varNode?.beforeComment?.text).to.equal('new before comment');
        expect(updatedAST.variables.KEY1).to.equal('value1');
    });

    it('should remove before comment when updating with undefined', () => {
        const content = '# old comment\nKEY1=value1';
        const ast = parseEnvAST(content);
        const key1Node = findVariableNodes(ast, 'KEY1')[0];
        const updatedAST = updateVariableBeforeCommentByIdInAST(ast, key1Node.id, undefined);

        const varNode = findVariableNodes(updatedAST, 'KEY1')[0];
        expect(varNode?.beforeComment).to.equal(undefined);
    });

    it('should replace existing before comment', () => {
        const content = '# old comment\nKEY1=value1';
        const ast = parseEnvAST(content);
        const key1Node = findVariableNodes(ast, 'KEY1')[0];
        const updatedAST = updateVariableBeforeCommentByIdInAST(ast, key1Node.id, 'new comment');

        const varNode = findVariableNodes(updatedAST, 'KEY1')[0];
        expect(varNode?.beforeComment?.text).to.equal('new comment');

        // Should not have duplicate comment nodes
        const commentNodes = updatedAST.nodes.filter((node) => node.type === 'Comment');
        expect(commentNodes).to.have.length(1);
        if (commentNodes[0]?.type === 'Comment') {
            expect(commentNodes[0].text).to.equal('new comment');
        }
    });

    it('should rename variable in AST', () => {
        const content = 'old_key=value1\nKEY2=value2';
        const ast = parseEnvAST(content);
        const oldKeyNode = findVariableNodes(ast, 'old_key')[0];
        const updatedAST = renameVariableByIdInAST(ast, oldKeyNode.id, 'new_key');

        expect(updatedAST.variables).to.not.have.property('old_key');
        expect(updatedAST.variables.NEW_KEY).to.equal('value1');
        expect(updatedAST.variables.KEY2).to.equal('value2');

        const renamedNode = findVariableNodes(updatedAST, 'NEW_KEY')[0];
        expect(renamedNode?.key).to.equal('NEW_KEY');
        expect(renamedNode?.value).to.equal('value1');
    });

    it('should normalize variable key when renaming', () => {
        const content = 'old_key=value1';
        const ast = parseEnvAST(content);
        const oldKeyNode = findVariableNodes(ast, 'old_key')[0];
        const updatedAST = renameVariableByIdInAST(ast, oldKeyNode.id, 'new-key.name');

        expect(updatedAST.variables).to.not.have.property('old_key');
        expect(updatedAST.variables.NEW_KEY_NAME).to.equal('value1');

        const renamedNode = findVariableNodes(updatedAST, 'NEW_KEY_NAME')[0];
        expect(renamedNode?.key).to.equal('NEW_KEY_NAME');
    });

    it('should not change AST when renaming to same normalized key', () => {
        const content = 'TEST_KEY=value1';
        const ast = parseEnvAST(content);
        const keyNode = findVariableNodes(ast, 'TEST_KEY')[0];
        const updatedAST = renameVariableByIdInAST(ast, keyNode.id, 'test_key');

        expect(updatedAST).to.deep.equal(ast);
        expect(updatedAST.variables.TEST_KEY).to.equal('value1');
    });

    it('should preserve comments when renaming variable', () => {
        const content = '# Comment for old key\nold_key=value1 # inline comment';
        const ast = parseEnvAST(content);
        const oldKeyNode = findVariableNodes(ast, 'old_key')[0];
        const updatedAST = renameVariableByIdInAST(ast, oldKeyNode.id, 'new_key');

        const renamedNode = findVariableNodes(updatedAST, 'NEW_KEY')[0];
        expect(renamedNode?.key).to.equal('NEW_KEY');
        expect(renamedNode?.value).to.equal('value1');
        expect(renamedNode?.beforeComment?.text).to.equal('Comment for old key');
        expect(renamedNode?.comment?.text).to.equal('inline comment');
    });
});
