# @tokey/env-file-parser

[![npm version](https://img.shields.io/npm/v/@tokey/env-file-parser.svg)](https://www.npmjs.com/package/@tokey/env-file-parser)
[![npm bundle size](https://badgen.net/bundlephobia/minzip/@tokey/env-file-parser?label=minzip&cache=300)](https://bundlephobia.com/result?p=@tokey/env-file-parser)

A self-contained parser for .env files. No dependencies required.

**Features**

- **safe** - returns an AST that can always be stringified to its original source
- **track offset** - maintains structure and formatting of original file
- **validations** - applies validation flags to ast nodes marking their syntax correctness
- **comments support** - preserves comments and associates them with variables
- **manipulation** - provides functions to add, update, and remove variables
- **typed** - built with TypeScript
- **tested** - thoroughly tested

## Installation

Using NPM:
```
npm install @tokey/env-file-parser
```

## Usage

```typescript
import { parseEnvAST, serializeEnvAST } from '@tokey/env-file-parser';

const envContent = `
# Database configuration
DB_HOST=localhost
DB_PORT=5432
`;

// Parse the .env content
const ast = parseEnvAST(envContent);

// Serialize back to string
const serialized = serializeEnvAST(ast);
```
