import { expect } from 'chai';
import dedent from 'dedent-js';
import {
    parseEnvAST,
    serializeEnvAST,
    createEmptyAST,
    getVariableNodes,
    type EnvAST,
    type VariableAssignmentNode,
} from '../env-parser.ts';

export function findVariableNode(ast: EnvAST, key: string): VariableAssignmentNode | undefined {
    return getVariableNodes(ast).find((node) => node.key === key);
}

describe('env AST parser', () => {
    describe('factory functions', () => {
        it('should create empty AST', () => {
            const emptyAST = createEmptyAST();

            expect(emptyAST.nodes).to.deep.equal([]);
            expect(emptyAST.errors).to.deep.equal([]);
            expect(emptyAST.variables).to.deep.equal({});
        });
    });

    describe('parsing', () => {
        it('should parse basic variables', () => {
            const content = 'KEY1=value1\nKEY2=value2';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1', KEY2: 'value2' });
            expect(ast.nodes).to.have.length(2);
            expect(ast.errors).to.have.length(0);
        });

        it('should parse comments', () => {
            const content = '# This is a comment\nKEY1=value1\n# Another comment';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1' });
            expect(ast.nodes).to.have.length(3);
            expect(ast.nodes[0]?.type).to.equal('Comment');
            expect(ast.nodes[2]?.type).to.equal('Comment');
        });

        it('should parse empty lines', () => {
            const content = 'KEY1=value1\n\nKEY2=value2';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1', KEY2: 'value2' });
            expect(ast.nodes).to.have.length(3);
            expect(ast.nodes[1]?.type).to.equal('EmptyLine');
        });

        it('should parse quoted values', () => {
            const content = 'KEY1="quoted value"\nKEY2=\'single quoted\'';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'quoted value', KEY2: 'single quoted' });
            const varNode1 = findVariableNode(ast, 'KEY1');
            const varNode2 = findVariableNode(ast, 'KEY2');
            expect(varNode1?.quotedWith).to.equal('"');
            expect(varNode2?.quotedWith).to.equal("'");
        });

        it('should treat export as regular variable parsing', () => {
            const content = 'export KEY1=value1\nKEY2=value2';
            const ast = parseEnvAST(content);

            // "export KEY1" is treated as a key name with space, which is valid but will generate validation warnings
            expect(ast.variables).to.deep.equal({ 'export KEY1': 'value1', KEY2: 'value2' });
            expect(ast.errors.length).to.equal(0); // No parsing errors, just validation warnings
        });

        it('should parse inline comments', () => {
            const content = 'KEY1=value1 # inline comment';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1' });
            const varNode = findVariableNode(ast, 'KEY1');
            expect(varNode?.comment?.text).to.equal('inline comment');
        });

        it('should parse before comments', () => {
            const content = '# This is a before comment\nKEY1=value1';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1' });
            const varNode = findVariableNode(ast, 'KEY1');
            expect(varNode?.beforeComment?.text).to.equal('This is a before comment');
        });

        it('should handle both before and inline comments', () => {
            const content = '# Before comment\nKEY1=value1 # Inline comment';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1' });
            const varNode = findVariableNode(ast, 'KEY1');
            expect(varNode?.beforeComment?.text).to.equal('Before comment');
            expect(varNode?.comment?.text).to.equal('Inline comment');
        });

        it('should handle multiple variables with before comments', () => {
            const content = dedent`
                # Comment for KEY1
                KEY1=value1
                # Comment for KEY2
                KEY2=value2
                # Comment for KEY3
                KEY3=value3
            `;
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' });

            const varNode1 = findVariableNode(ast, 'KEY1');
            const varNode2 = findVariableNode(ast, 'KEY2');
            const varNode3 = findVariableNode(ast, 'KEY3');

            expect(varNode1?.beforeComment?.text).to.equal('Comment for KEY1');
            expect(varNode2?.beforeComment?.text).to.equal('Comment for KEY2');
            expect(varNode3?.beforeComment?.text).to.equal('Comment for KEY3');
        });

        it('should not assign before comment when separated by empty line', () => {
            const content = '# This is a comment\n\nKEY1=value1';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1' });
            const varNode = findVariableNode(ast, 'KEY1');
            expect(varNode?.beforeComment).to.equal(undefined);
        });

        it('should preserve variable references as literal text', () => {
            const content = 'BASE_URL=http://localhost\nFULL_URL=${BASE_URL}/api';
            const ast = parseEnvAST(content);

            expect(ast.variables.BASE_URL).to.equal('http://localhost');
            expect(ast.variables.FULL_URL).to.equal('${BASE_URL}/api');
        });

        it('should handle escaped characters in quoted strings', () => {
            const content = 'KEY1="value with \\"quotes\\" and \\n newlines"';
            const ast = parseEnvAST(content);

            expect(ast.variables.KEY1).to.equal('value with "quotes" and \n newlines');
        });

        it('should handle equals signs in quotes correctly', () => {
            const content =
                'KEY1="value=with=equals"\nKEY2=\'value=with=equals\'\nKEY3=`value=with=equals`';
            const ast = parseEnvAST(content);

            expect(ast.variables.KEY1).to.equal('value=with=equals');
            expect(ast.variables.KEY2).to.equal('value=with=equals');
            expect(ast.variables.KEY3).to.equal('value=with=equals');
        });

        it('should handle mixed line endings efficiently', () => {
            const content = 'KEY1=value1\r\nKEY2=value2\nKEY3=value3\r';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({
                KEY1: 'value1',
                KEY2: 'value2',
                KEY3: 'value3',
            });
            expect(ast.nodes).to.have.length(3);
        });
    });

    describe('edge cases', () => {
        it('should handle empty content', () => {
            const content = '';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({});
            expect(ast.nodes).to.have.length(0);
            expect(ast.errors).to.have.length(0);
        });

        it('should handle only whitespace', () => {
            const content = '   \t  \n   \t  \r\n  ';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({});
            expect(ast.nodes).to.have.length(2); // 2 empty lines (one for \n and one for \r\n)
            expect(ast.nodes.every((node) => node.type === 'EmptyLine')).to.equal(true);
        });

        it('should handle only comments', () => {
            const content = '# Comment 1\n# Comment 2\n# Comment 3';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({});
            expect(ast.nodes).to.have.length(3);
            expect(ast.nodes.every((node) => node.type === 'Comment')).to.equal(true);
        });

        it('should handle malformed lines with no equals sign', () => {
            const content = 'MALFORMED_LINE\nVALID=value\nANOTHER_MALFORMED';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ VALID: 'value' });
            expect(ast.errors).to.have.length(2);
            expect(ast.errors[0]?.message).to.include('missing = assignment operator');
            expect(ast.errors[1]?.message).to.include('missing = assignment operator');
        });

        it('should handle equals sign at start of line', () => {
            const content = '=value\nVALID=value';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ VALID: 'value' });
            expect(ast.nodes).to.have.length(2);
            expect(ast.nodes[0]?.type).to.equal('VariableAssignment');
            const firstNode = ast.nodes[0] as VariableAssignmentNode;
            expect(firstNode.key).to.equal('');
            expect(firstNode.value).to.equal('value');
        });

        it('should handle empty variable names', () => {
            const content = ' =value\n  \t=another\nVALID=value';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ VALID: 'value' });
            expect(ast.nodes).to.have.length(3);
            expect(ast.nodes[0]?.type).to.equal('VariableAssignment');
            expect(ast.nodes[1]?.type).to.equal('VariableAssignment');
            const firstNode = ast.nodes[0] as VariableAssignmentNode;
            const secondNode = ast.nodes[1] as VariableAssignmentNode;
            expect(firstNode.key).to.equal('');
            expect(firstNode.value).to.equal('value');
            expect(secondNode.key).to.equal('');
            expect(secondNode.value).to.equal('another');
        });

        it('should handle unclosed quotes', () => {
            const content =
                'KEY1="unclosed quote\nKEY2=\'unclosed single\nKEY3=`unclosed backtick\nVALID=value';
            const ast = parseEnvAST(content);

            // With the optimized parser, unclosed quotes are treated as part of the value
            expect(ast.variables.KEY1).to.equal(
                '"unclosed quote\nKEY2=\'unclosed single\nKEY3=`unclosed backtick\nVALID=value',
            );
            expect(ast.variables.KEY2).to.equal(undefined);
            expect(ast.variables.KEY3).to.equal(undefined);
            expect(ast.variables.VALID).to.equal(undefined);
        });

        it('should handle nested quotes correctly', () => {
            const content =
                'KEY1="He said \'hello\' to me"\nKEY2=\'She replied "hi there"\'\nKEY3=`Both "quotes" and \'apostrophes\'`';
            const ast = parseEnvAST(content);

            expect(ast.variables.KEY1).to.equal("He said 'hello' to me");
            expect(ast.variables.KEY2).to.equal('She replied "hi there"');
            expect(ast.variables.KEY3).to.equal('Both "quotes" and \'apostrophes\'');
        });

        it('should handle hash symbols in quoted values', () => {
            const content = 'COLOR="#ff0000" # This is red\nTAG=\'#hashtag\' # Social media';
            const ast = parseEnvAST(content);

            expect(ast.variables.COLOR).to.equal('#ff0000');
            expect(ast.variables.TAG).to.equal('#hashtag');

            const colorNode = findVariableNode(ast, 'COLOR');
            const tagNode = findVariableNode(ast, 'TAG');
            expect(colorNode?.comment?.text).to.equal('This is red');
            expect(tagNode?.comment?.text).to.equal('Social media');
        });

        it('should handle special characters in unquoted values', () => {
            const content =
                'EMAIL=user@example.com\nPATH=/usr/local/bin:/usr/bin\nURL=https://example.com/path?query=value';
            const ast = parseEnvAST(content);

            expect(ast.variables.EMAIL).to.equal('user@example.com');
            expect(ast.variables.PATH).to.equal('/usr/local/bin:/usr/bin');
            expect(ast.variables.URL).to.equal('https://example.com/path?query=value');
        });

        it('should handle multiple consecutive empty lines', () => {
            const content = 'KEY1=value1\n\n\n\nKEY2=value2\n\n';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ KEY1: 'value1', KEY2: 'value2' });
            expect(ast.nodes).to.have.length(6); // 2 variables + 4 empty lines
            const emptyLineCount = ast.nodes.filter((node) => node.type === 'EmptyLine').length;
            expect(emptyLineCount).to.equal(4);
        });

        it('should handle trailing whitespace after values', () => {
            const content = 'KEY1=value1   \t  \nKEY2=value2\t\nKEY3="quoted value"   \t';
            const ast = parseEnvAST(content);

            expect(ast.variables.KEY1).to.equal('value1');
            expect(ast.variables.KEY2).to.equal('value2');
            expect(ast.variables.KEY3).to.equal('quoted value');
        });

        it('should handle single character values and keys', () => {
            const content = 'A=1\nB=2\nC="3"\nD=\'4\'';
            const ast = parseEnvAST(content);

            expect(ast.variables).to.deep.equal({ A: '1', B: '2', C: '3', D: '4' });
        });

        it('should handle empty values with different quote types', () => {
            const content = 'EMPTY1=\nEMPTY2=""\nEMPTY3=\'\'\nEMPTY4=``';
            const ast = parseEnvAST(content);

            expect(ast.variables.EMPTY1).to.equal('');
            expect(ast.variables.EMPTY2).to.equal('');
            expect(ast.variables.EMPTY3).to.equal('');
            expect(ast.variables.EMPTY4).to.equal('');
        });

        it('should handle Unicode and special characters', () => {
            const content = 'UNICODE=🚀✨🎉\nSPECIAL="åäö ÀÁÂÃ"\nEMOJI=\'🔥💯\'';
            const ast = parseEnvAST(content);

            expect(ast.variables.UNICODE).to.equal('🚀✨🎉');
            expect(ast.variables.SPECIAL).to.equal('åäö ÀÁÂÃ');
            expect(ast.variables.EMOJI).to.equal('🔥💯');
        });
    });

    describe('serialization', () => {
        it('should serialize AST back to string', () => {
            const content = '# Comment\nKEY1=value1\n\nKEY2="quoted value"';
            const ast = parseEnvAST(content);
            const serialized = serializeEnvAST(ast);

            expect(serialized).to.eql(content);
        });

        it('should preserve quote types when serializing', () => {
            const content = 'KEY1="double"\nKEY2=\'single\'';
            const ast = parseEnvAST(content);
            const serialized = serializeEnvAST(ast);

            expect(serialized).to.eql(content);
        });

        it('should serialize before comments correctly', () => {
            const content = '# Before comment\nKEY1=value1 # Inline comment';
            const ast = parseEnvAST(content);
            const serialized = serializeEnvAST(ast);

            expect(serialized).to.eql(content);
        });

        it('should serialize minimal content (vars and before comments)', () => {
            const content =
                '# Before 1\nKEY1=value1 # Inline comment \n# unrelated comment\n# Before 2\nKEY2=value2';
            const ast = parseEnvAST(content);
            const serialized = serializeEnvAST(ast, 'minimal');

            expect(serialized).to.eql(
                '# Before 1\nKEY1=value1 # Inline comment \n\n# Before 2\nKEY2=value2',
            );
        });
    });

    describe('dotenv compatibility tests', () => {
        const testEnvContent = dedent(`
            BASIC=basic

            # previous line intentionally left blank
            AFTER_LINE=after_line
            EMPTY=
            EMPTY_SINGLE_QUOTES=''
            EMPTY_DOUBLE_QUOTES=""
            EMPTY_BACKTICKS=\`\`
            SINGLE_QUOTES='single_quotes'
            SINGLE_QUOTES_SPACED='    single quotes    '
            DOUBLE_QUOTES="double_quotes"
            DOUBLE_QUOTES_SPACED="    double quotes    "
            DOUBLE_QUOTES_INSIDE_SINGLE='double "quotes" work inside single quotes'
            DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET="{ port: $MONGOLAB_PORT}"
            SINGLE_QUOTES_INSIDE_DOUBLE="single 'quotes' work inside double quotes"
            BACKTICKS_INSIDE_SINGLE='\`backticks\` work inside single quotes'
            BACKTICKS_INSIDE_DOUBLE="\`backticks\` work inside double quotes"
            BACKTICKS=\`backticks\`
            BACKTICKS_SPACED=\`    backticks    \`
            DOUBLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" work inside backticks\`
            SINGLE_QUOTES_INSIDE_BACKTICKS=\`single 'quotes' work inside backticks\`
            DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" and single 'quotes' work inside backticks\`
            EXPAND_NEWLINES="expand\\nnew\\nlines"
            DONT_EXPAND_UNQUOTED=dontexpand\\nnewlines
            DONT_EXPAND_SQUOTED='dontexpand\\nnewlines'
            # COMMENTS=work
            INLINE_COMMENTS=inline comments # work #very #well
            INLINE_COMMENTS_SINGLE_QUOTES='inline comments outside of #singlequotes' # work
            INLINE_COMMENTS_DOUBLE_QUOTES="inline comments outside of #doublequotes" # work
            INLINE_COMMENTS_BACKTICKS=\`inline comments outside of #backticks\` # work
            INLINE_COMMENTS_SPACE=inline comments start with a#number sign. no space required.
            EQUAL_SIGNS=equals==
            RETAIN_INNER_QUOTES={"foo": "bar"}
            RETAIN_INNER_QUOTES_AS_STRING='{"foo": "bar"}'
            RETAIN_INNER_QUOTES_AS_BACKTICKS=\`{"foo": "bar's"}\`
            TRIM_SPACE_FROM_UNQUOTED=    some spaced out string
            USERNAME=therealnerdybeast@example.tld
                SPACED_KEY = parsed
        `);

        const ast = parseEnvAST(testEnvContent);
        const parsed = ast.variables;

        it('should return an object', () => {
            expect(parsed).to.be.an('object');
        });

        it('sets basic environment variable', () => {
            expect(parsed.BASIC).to.equal('basic');
        });

        it('reads after a skipped line', () => {
            expect(parsed.AFTER_LINE).to.equal('after_line');
        });

        it('defaults empty values to empty string', () => {
            expect(parsed.EMPTY).to.equal('');
            expect(parsed.EMPTY_SINGLE_QUOTES).to.equal('');
            expect(parsed.EMPTY_DOUBLE_QUOTES).to.equal('');
            expect(parsed.EMPTY_BACKTICKS).to.equal('');
        });

        it('escapes single quoted values', () => {
            expect(parsed.SINGLE_QUOTES).to.equal('single_quotes');
        });

        it('respects surrounding spaces in single quotes', () => {
            expect(parsed.SINGLE_QUOTES_SPACED).to.equal('    single quotes    ');
        });

        it('escapes double quoted values', () => {
            expect(parsed.DOUBLE_QUOTES).to.equal('double_quotes');
        });

        it('respects surrounding spaces in double quotes', () => {
            expect(parsed.DOUBLE_QUOTES_SPACED).to.equal('    double quotes    ');
        });

        it('respects double quotes inside single quotes', () => {
            expect(parsed.DOUBLE_QUOTES_INSIDE_SINGLE).to.equal(
                'double "quotes" work inside single quotes',
            );
        });

        it('respects spacing for badly formed brackets', () => {
            expect(parsed.DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET).to.equal('{ port: $MONGOLAB_PORT}');
        });

        it('respects single quotes inside double quotes', () => {
            expect(parsed.SINGLE_QUOTES_INSIDE_DOUBLE).to.equal(
                "single 'quotes' work inside double quotes",
            );
        });

        it('respects backticks inside single quotes', () => {
            expect(parsed.BACKTICKS_INSIDE_SINGLE).to.equal(
                '`backticks` work inside single quotes',
            );
        });

        it('respects backticks inside double quotes', () => {
            expect(parsed.BACKTICKS_INSIDE_DOUBLE).to.equal(
                '`backticks` work inside double quotes',
            );
        });

        it('parses backticks', () => {
            expect(parsed.BACKTICKS).to.equal('backticks');
        });

        it('respects surrounding spaces in backticks', () => {
            expect(parsed.BACKTICKS_SPACED).to.equal('    backticks    ');
        });

        it('respects double quotes inside backticks', () => {
            expect(parsed.DOUBLE_QUOTES_INSIDE_BACKTICKS).to.equal(
                'double "quotes" work inside backticks',
            );
        });

        it('respects single quotes inside backticks', () => {
            expect(parsed.SINGLE_QUOTES_INSIDE_BACKTICKS).to.equal(
                "single 'quotes' work inside backticks",
            );
        });

        it('respects mixed quotes inside backticks', () => {
            expect(parsed.DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS).to.equal(
                'double "quotes" and single \'quotes\' work inside backticks',
            );
        });

        it('expands newlines but only if double quoted', () => {
            expect(parsed.EXPAND_NEWLINES).to.equal('expand\nnew\nlines');
            expect(parsed.DONT_EXPAND_UNQUOTED).to.equal('dontexpand\\nnewlines');
            expect(parsed.DONT_EXPAND_SQUOTED).to.equal('dontexpand\\nnewlines');
        });

        it('ignores commented lines', () => {
            expect(parsed.COMMENTS).to.equal(undefined);
        });

        it('ignores inline comments', () => {
            expect(parsed.INLINE_COMMENTS).to.equal('inline comments');
            expect(parsed.INLINE_COMMENTS_SINGLE_QUOTES).to.equal(
                'inline comments outside of #singlequotes',
            );
            expect(parsed.INLINE_COMMENTS_DOUBLE_QUOTES).to.equal(
                'inline comments outside of #doublequotes',
            );
            expect(parsed.INLINE_COMMENTS_BACKTICKS).to.equal(
                'inline comments outside of #backticks',
            );
        });

        it('treats # character as start of comment', () => {
            expect(parsed.INLINE_COMMENTS_SPACE).to.equal('inline comments start with a');
        });

        it('respects equals signs in values', () => {
            expect(parsed.EQUAL_SIGNS).to.equal('equals==');
        });

        it('retains inner quotes', () => {
            expect(parsed.RETAIN_INNER_QUOTES).to.equal('{"foo": "bar"}');
            expect(parsed.RETAIN_INNER_QUOTES_AS_STRING).to.equal('{"foo": "bar"}');
            expect(parsed.RETAIN_INNER_QUOTES_AS_BACKTICKS).to.equal('{"foo": "bar\'s"}');
        });

        it('trims spaces from unquoted values', () => {
            expect(parsed.TRIM_SPACE_FROM_UNQUOTED).to.equal('some spaced out string');
        });

        it('parses email addresses completely', () => {
            expect(parsed.USERNAME).to.equal('therealnerdybeast@example.tld');
        });

        it('parses keys and values surrounded by spaces', () => {
            expect(parsed.SPACED_KEY).to.equal('parsed');
        });

        it('handles different line endings', () => {
            const crContent = 'SERVER=localhost\rPASSWORD=password\rDB=tests\r';
            const lfContent = 'SERVER=localhost\nPASSWORD=password\nDB=tests\n';
            const crlfContent = 'SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n';
            const expected = { SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' };

            expect(parseEnvAST(crContent).variables).to.deep.equal(expected);
            expect(parseEnvAST(lfContent).variables).to.deep.equal(expected);
            expect(parseEnvAST(crlfContent).variables).to.deep.equal(expected);
        });
    });
});
