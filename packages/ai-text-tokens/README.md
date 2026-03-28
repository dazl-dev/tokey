# @tokey/dazl-text-tokens

A powerful tokenizer for parsing text content and extracting URLs, secret tags, and other structured elements from unstructured text. This package is designed for AI applications that need to process and analyze text while preserving the context and location of special tokens.

## Features

- **URL Detection**: Automatically detects and extracts URLs from text, including:
  - Full URLs with protocols (`https://`, `http://`, `ftp://`, `file://`)
  - Domain-only URLs (`example.com`, `www.github.com`)
  - URLs with paths, query parameters, and fragments
  - Support for various TLDs (Top Level Domains)
  - Case-insensitive protocol and TLD matching

- **Secret Tag Parsing**: Extracts structured secret tags in the format:
  ```html
  <secret name="token" displayName="API Token">actual_secret_value</secret>
  ```

- **Markdown Link Support**: Handles markdown-style links `[text](URL)`

- **Precise Location Tracking**: Provides exact start/end positions for all tokens

- **Text Reconstruction**: Ensures lossless reconstruction of original input

## Installation

```bash
npm install @tokey/dazl-text-tokens
```

## Usage

### Basic Usage

```typescript
import { textTokenizer } from '@tokey/dazl-text-tokens';

const text = 'Visit https://github.com or check example.com for more info';
const tokens = textTokenizer(text);

console.log(tokens);
// Output:
// [
//   { kind: 'text', start: 0, end: 6, text: 'Visit ' },
//   { kind: 'url', start: 6, end: 25, url: 'https://github.com' },
//   { kind: 'text', start: 25, end: 35, text: ' or check ' },
//   { kind: 'url', start: 35, end: 46, url: 'example.com' },
//   { kind: 'text', start: 46, end: 60, text: ' for more info' }
// ]
```

### Working with Secret Tags

```typescript
const text = 'Use <secret name="apiKey" displayName="API Key">sk-1234567890</secret> for authentication';
const tokens = textTokenizer(text);

const secretToken = tokens.find(token => token.kind === 'secret');
console.log(secretToken);
// Output:
// {
//   kind: 'secret',
//   start: 4,
//   end: 87,
//   name: 'apiKey',
//   displayName: 'API Key',
//   content: 'sk-1234567890'
// }
```

### Markdown Links

```typescript
const text = 'Check out [this repository](https://github.com/dazl-dev/tokey) for more details';
const tokens = textTokenizer(text);

const urlToken = tokens.find(token => token.kind === 'url');
console.log(urlToken);
// Output:
// {
//   kind: 'url',
//   start: 28,
//   end: 57,
//   url: 'https://github.com/dazl-dev/tokey'
// }
```

## API Reference

### Types

#### `UrlLocation`
```typescript
interface UrlLocation {
    kind: 'url';
    start: number;
    end: number;
    url: string;
}
```

#### `SecretLocation` 
```typescript
interface SecretLocation {
    kind: 'secret';
    start: number;
    end: number;
    name: string;
    displayName: string;
    content: string;
}
```

#### `TextLocation`
```typescript
interface TextLocation {
    kind: 'text';
    start: number;
    end: number;
    text: string;
}
```

### Functions

#### `textTokenizer(text: string)`

Parses the input text and returns an array of tokens representing different parts of the text.

**Parameters:**
- `text` (string): The input text to tokenize

**Returns:**
Array of `UrlLocation | SecretLocation | TextLocation` objects, ordered by their position in the original text.

## Supported URL Formats

### Protocols
- `https://` - Secure HTTP
- `http://` - HTTP  
- `ftp://` - File Transfer Protocol
- `file://` - File URI scheme

### Domain Formats
- Standard domains: `example.com`, `subdomain.example.org`
- Domains with ports: `localhost:3000`, `api.service.com:8080`
- Domains with userinfo: `user:pass@example.com` (though not recommended)
- International domains with valid TLDs

### URL Components
- Paths: `/api/v1/users`, `/path/to/resource`
- Query parameters: `?param=value&other=123`
- Fragments: `#section-1`, `#results`
- Complex URLs: `https://api.example.com/v1/users?sort=name&order=asc#results`

## TLD Support

The package includes comprehensive support for top-level domains (TLDs), including:
- Generic TLDs: `.com`, `.org`, `.net`, `.edu`, `.gov`
- Country code TLDs: `.uk`, `.ca`, `.de`, `.jp`, `.au`
- New generic TLDs: `.museum`, `.travel`, `.company`, `.io`
- And many more (1,400+ TLDs supported)

## Delimiters and Boundaries

The tokenizer recognizes the following characters as URL boundaries:
- Whitespace: spaces, tabs, newlines
- Punctuation: `<>"\`{}|\\^`
- The tokenizer automatically handles common punctuation at the end of URLs (commas, periods, semicolons, etc.)

## Edge Cases Handled

- **Protocol case sensitivity**: `HTTPS://`, `Http://`, `FTP://` are all recognized
- **Domain case preservation**: Original casing is preserved in extracted URLs
- **Trailing punctuation**: URLs followed by punctuation are handled correctly
- **Boundary detection**: URLs are properly extracted even when surrounded by various delimiters
- **Reconstruction guarantee**: All tokens can be reconstructed back to the original input

## Examples

### Complex Text Processing
```typescript
const complexText = `
Please visit https://api.github.com/repos for the API documentation.
You can also check our main site at www.example.org.
For authentication, use your <secret name="token" displayName="Access Token">ghp_xxxxxxxxxxxx</secret>.
Don't forget to read the [documentation](https://docs.example.com/guide) as well!
`;

const tokens = textTokenizer(complexText);

// Filter by token type
const urls = tokens.filter(t => t.kind === 'url');
const secrets = tokens.filter(t => t.kind === 'secret'); 
const textParts = tokens.filter(t => t.kind === 'text');

console.log('Found URLs:', urls.map(u => u.url));
console.log('Found secrets:', secrets.map(s => ({ name: s.name, displayName: s.displayName })));
```

### Text Reconstruction
```typescript
function reconstructText(tokens: Array<UrlLocation | SecretLocation | TextLocation>): string {
    return tokens.map(token => {
        switch (token.kind) {
            case 'text':
                return token.text;
            case 'url':
                return token.url;
            case 'secret':
                return `<secret name="${token.name}" displayName="${token.displayName}">${token.content}</secret>`;
        }
    }).join('');
}

const original = 'Visit https://example.com with <secret name="key" displayName="API Key">abc123</secret>';
const tokens = textTokenizer(original);
const reconstructed = reconstructText(tokens);

console.log(original === reconstructed); // true
```

## License

MIT

## Contributing

This package is part of the [Tokey](https://github.com/dazl-dev/tokey) monorepo. Please refer to the main repository for contribution guidelines.