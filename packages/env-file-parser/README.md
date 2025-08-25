# @tokey/env-file-parser

[![npm version](https://img.shields.io/npm/v/@tokey/env-file-parser.svg)](https://www.npmjs.com/package/@tokey/env-file-parser)
[![npm bundle size](https://badgen.net/bundlephobia/minzip/@tokey/env-file-parser?label=minzip&cache=300)](https://bundlephobia.com/result?p=@tokey/env-file-parser)

A powerful, zero-dependency .env file parser that creates an Abstract Syntax Tree (AST) for safe parsing and manipulation of environment files.

## Why @tokey/env-file-parser?

Unlike traditional .env parsers that simply extract key-value pairs, this parser creates a complete AST representation that preserves:

- **Original structure**: Comments, empty lines, and formatting are maintained
- **Source fidelity**: Can perfectly reconstruct the original file from the AST
- **Safe manipulation**: Add, update, or remove variables without breaking formatting
- **Validation support**: Built-in validation rules for environment variable best practices
- **Quote handling**: Proper parsing of quoted values with escape sequences
- **Comment associations**: Links comments to their corresponding variables

This makes it perfect for tools that need to programmatically modify .env files while preserving their human-readable structure.

## Features

- **🔒 Safe** - Always reconstruct the original file exactly from the AST
- **📍 Structure-preserving** - Maintains formatting, comments, and empty lines
- **✅ Validation** - Built-in validation rules with error reporting
- **💬 Comment support** - Preserves and associates comments with variables
- **🔧 Manipulation** - Safe functions to add, update, and remove variables
- **📝 TypeScript** - Fully typed with comprehensive type definitions
- **🧪 Well-tested** - Thoroughly tested with edge cases covered
- **📦 Zero dependencies** - No external dependencies required

## Installation

Using NPM:
```bash
npm install @tokey/env-file-parser
```

Using Yarn:
```bash
yarn add @tokey/env-file-parser
```

Using pnpm:
```bash
pnpm add @tokey/env-file-parser
```

## Basic Usage

### Parsing and Serialization

```typescript
import { parseEnvAST, serializeEnvAST } from '@tokey/env-file-parser';

const envContent = `
# Database configuration
DB_HOST=localhost
DB_PORT=5432

# API Configuration  
API_KEY="secret-key-here"
API_URL='https://api.example.com'
`;

// Parse the .env content into an AST
const ast = parseEnvAST(envContent);

// Access parsed variables
console.log(ast.variables);
// { DB_HOST: 'localhost', DB_PORT: '5432', API_KEY: 'secret-key-here', API_URL: 'https://api.example.com' }

// Serialize back to string (preserves original formatting)
const serialized = serializeEnvAST(ast);
console.log(serialized === envContent); // true
```

### Working with the AST

```typescript
import { parseEnvAST, getVariableNodes, isVariableAssignmentNode } from '@tokey/env-file-parser';

const ast = parseEnvAST('KEY1=value1\n# Comment\nKEY2="quoted value"');

// Iterate through all nodes
ast.nodes.forEach(node => {
  if (isVariableAssignmentNode(node)) {
    console.log(`Variable: ${node.key} = ${node.value}`);
    if (node.quotedWith) {
      console.log(`  Quoted with: ${node.quotedWith}`);
    }
  }
});

// Get only variable nodes
const variableNodes = getVariableNodes(ast);
```

## AST Manipulation

### Adding Variables

```typescript
import { parseEnvAST, addVariableToAST, serializeEnvAST } from '@tokey/env-file-parser';

let ast = parseEnvAST('EXISTING_VAR=value');

// Add a simple variable
ast = addVariableToAST(ast, 'NEW_VAR', 'new_value');

// Add a variable with comments
ast = addVariableToAST(
  ast, 
  'API_KEY', 
  'secret-key', 
  'inline comment',  // inline comment
  'Configuration for API access'  // before comment
);

console.log(serializeEnvAST(ast));
```

### Updating Variables

```typescript
import { parseEnvAST, getVariableNodes, updateVariableByIdInAST } from '@tokey/env-file-parser';

let ast = parseEnvAST('DATABASE_URL=old_url\nAPI_KEY=old_key');

// Find a variable by key
const dbNode = getVariableNodes(ast).find(node => node.key === 'DATABASE_URL');

if (dbNode) {
  // Update the variable value
  ast = updateVariableByIdInAST(ast, dbNode.id, 'new_database_url');
}
```

### Removing Variables

```typescript
import { parseEnvAST, findVariableNodeById, removeVariableByIdFromAST } from '@tokey/env-file-parser';

let ast = parseEnvAST(`
# Database config
DATABASE_URL=postgres://localhost
API_KEY=secret
`);

const dbNode = findVariableNodeById(ast, 'DATABASE_URL');
if (dbNode) {
  // Remove variable and its associated comments
  ast = removeVariableByIdFromAST(ast, dbNode.id);
}
```

### Renaming Variables

```typescript
import { parseEnvAST, getVariableNodes, renameVariableByIdInAST } from '@tokey/env-file-parser';

let ast = parseEnvAST('OLD_KEY=value');
const node = getVariableNodes(ast)[0];

if (node) {
  ast = renameVariableByIdInAST(ast, node.id, 'NEW_KEY');
}
```

## Validation

The parser includes built-in validation rules for environment variables:

```typescript
import { parseEnvAST, validateEnvAST } from '@tokey/env-file-parser';

const ast = parseEnvAST(`
lowercase_var=value
DUPLICATE_VAR=value1  
DUPLICATE_VAR=value2
very_long_value=${'x'.repeat(15000)}
`);

const validationErrors = validateEnvAST(ast);
validationErrors.forEach(error => {
  console.log(`${error.severity}: ${error.field} - ${error.message}`);
});
```

Validation checks include:
- **Naming conventions**: Variables should be uppercase
- **Invalid characters**: Only letters, numbers, and underscores allowed
- **Duplicate keys**: Warns about duplicate variable names
- **Value issues**: Long values, unescaped quotes, multiline values, tab characters
- **Empty names**: Variable names cannot be empty

## Advanced Usage

### Custom Node Creation

```typescript
import { createVariableAssignment, createEmptyAST } from '@tokey/env-file-parser';

// Create nodes manually
const comment = { type: 'Comment', id: 'comment-1', text: 'Configuration' };
const variable = createVariableAssignment('API_KEY', 'secret', '"', undefined, comment);
const emptyLine = { type: 'EmptyLine', id: 'empty-1' };

// Create AST from nodes
const ast = createEmptyAST([comment, variable, emptyLine]);
```

### Working with Quoted Values

The parser handles different quote types and escape sequences:

```typescript
const ast = parseEnvAST(`
SINGLE_QUOTED='value with spaces'
DOUBLE_QUOTED="value with \\"quotes\\" and \\n newlines"
BACKTICK_QUOTED=\`template string value\`
UNQUOTED=simple_value
`);

getVariableNodes(ast).forEach(node => {
  console.log(`${node.key}: "${node.value}" (quoted with: ${node.quotedWith || 'none'})`);
});
```

## API Reference

### Core Functions

- `parseEnvAST(content: string): EnvAST` - Parse .env content into AST
- `serializeEnvAST(ast: EnvAST): string` - Convert AST back to string
- `createEmptyAST(nodes?: ASTNode[]): EnvAST` - Create empty or pre-populated AST

### Manipulation Functions

- `addVariableToAST(ast, key, value, comment?, beforeComment?): EnvAST`
- `updateVariableByIdInAST(ast, id, newValue): EnvAST`
- `renameVariableByIdInAST(ast, id, newKey): EnvAST`
- `removeVariableByIdFromAST(ast, id): EnvAST`

### Query Functions

- `getVariableNodes(ast): VariableAssignmentNode[]` - Get all variable nodes
- `findVariableNodeById(ast, id): VariableAssignmentNode | undefined`
- `isVariableAssignmentNode(node): boolean` - Type guard for variable nodes
- `isCommentNode(node): boolean` - Type guard for comment nodes

### Validation Functions

- `validateEnvAST(ast): ValidationError[]` - Validate AST nodes
- `normalizeVariableKey(key): string` - Normalize variable key format

### Types

```typescript
interface EnvAST {
  nodes: ASTNode[];
  errors: ParseError[];
  variables: Record<string, string>;
}

interface VariableAssignmentNode {
  type: 'VariableAssignment';
  id: string;
  key: string;
  value: string;
  quotedWith: '"' | "'" | '`' | null;
  comment?: CommentNode;
  beforeComment?: CommentNode;
}

interface CommentNode {
  type: 'Comment';
  id: string;
  text: string;
}
```

## Use Cases

- **Environment management tools** - Safely modify .env files programmatically
- **Configuration validators** - Validate environment variable naming and values
- **Documentation generators** - Extract and document environment variables
- **Migration tools** - Transform environment files between formats
- **Development tools** - IDE extensions for .env file manipulation
- **CI/CD pipelines** - Automated environment configuration management

## License

MIT
