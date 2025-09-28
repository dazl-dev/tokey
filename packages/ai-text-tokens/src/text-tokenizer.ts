import { tlds } from './tlds.ts';

const SUPPORTED_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file']);

export interface UrlLocation {
    kind: 'url';
    start: number;
    end: number;
    url: string;
}

export interface SecretLocation {
    kind: 'secret';
    start: number;
    end: number;
    name: string;
    displayName: string;
    content: string;
}

export interface TextLocation {
    kind: 'text';
    start: number;
    end: number;
    text: string;
}

export function textTokenizer(text: string): (UrlLocation | SecretLocation | TextLocation)[] {
    const results: (UrlLocation | SecretLocation | TextLocation)[] = [];
    const length = text.length;
    let lastProcessedIndex = 0;

    let tokenStart = -1;
    let currentToken = '';
    let hasDot = false;
    let hasProtocol = false;
    let hasUnsupportedProtocol = false;

    for (let i = 0; i < length; i++) {
        const char = text[i];

        // Check for markdown link pattern [](URL)
        if (char === ']' && i + 1 < length && text[i + 1] === '(') {
            const res = processToken(i);
            // treat ]( as token boundary
            if (res) {
                resetState();
            }

            // Look for the next closing parenthesis
            const closingParen = text.indexOf(')', i + 2);
            if (closingParen !== -1) {
                const urlCandidate = text.slice(i + 2, closingParen);
                if (isValidUrlOrDomain(urlCandidate)) {
                    addTextNodeIfNeeded(i + 2);
                    results.push({
                        start: i + 2,
                        end: closingParen,
                        url: urlCandidate,
                        kind: 'url',
                    });
                    lastProcessedIndex = closingParen;
                    resetState();
                    i = closingParen; // Skip past the closing parenthesis
                    continue;
                }
            }
        }

        if (isWhitespaceOrDelimiter(char)) {
            const res = processToken(i);
            if (res) {
                resetState();
            }
            if (char === '<' && text.slice(i, i + 7) === '<secret') {
                // Look for closing tag
                const closingTagIndex = text.indexOf('</secret>', i);
                if (closingTagIndex !== -1) {
                    const openingTagEnd = text.indexOf('>', i + 7);
                    if (openingTagEnd !== -1 && openingTagEnd < closingTagIndex) {
                        const openingTag = text.slice(i, openingTagEnd + 1);
                        const content = text.slice(openingTagEnd + 1, closingTagIndex);
                        const secret = parseSecretTag(openingTag, content, i, closingTagIndex + 9);
                        if (secret) {
                            addTextNodeIfNeeded(i);
                            results.push(secret);
                            lastProcessedIndex = closingTagIndex + 9;
                            i = closingTagIndex + 8; // Move index to end of closing tag
                            resetState();
                            continue;
                        }
                    }
                }
            }

            resetState();
            continue;
        }

        if (tokenStart === -1) {
            tokenStart = i;
        }

        currentToken += char;

        if (!hasProtocol) {
            if (currentToken.endsWith('://')) {
                // Remove any non-protocol characters from the start, then extract the protocol part before '://'
                const cleanProtocol = currentToken.replace(/^[^a-zA-Z0-9+.-]+/, '').toLowerCase();
                tokenStart += currentToken.length - cleanProtocol.length;
                const protocol = cleanProtocol.slice(0, -3); // Remove '://'
                if (SUPPORTED_PROTOCOLS.has(protocol)) {
                    hasProtocol = true;
                } else {
                    hasUnsupportedProtocol = true;
                }
            }
        }

        if (char === '.') {
            hasDot = true;
        }
    }

    processToken(length);

    // Add final text node if there's remaining text
    if (lastProcessedIndex < length) {
        results.push({
            kind: 'text',
            start: lastProcessedIndex,
            end: length,
            text: text.slice(lastProcessedIndex, length),
        });
    }

    // results.sort((a, b) => a.start - b.start);

    return results;

    function addTextNodeIfNeeded(currentIndex: number) {
        if (lastProcessedIndex < currentIndex) {
            results.push({
                kind: 'text',
                start: lastProcessedIndex,
                end: currentIndex,
                text: text.slice(lastProcessedIndex, currentIndex),
            });
        }
    }

    function processToken(i: number) {
        if (tokenStart !== -1 && (hasProtocol || hasDot)) {
            const cleanToken = currentToken.replace(/[,.;:]+$/, '');
            const actualEnd = i - (currentToken.length - cleanToken.length);

            if (isValidUrlOrDomain(cleanToken) && !hasUnsupportedProtocol) {
                addTextNodeIfNeeded(tokenStart);
                results.push({
                    start: tokenStart,
                    end: actualEnd,
                    url: cleanToken,
                    kind: 'url',
                });
                lastProcessedIndex = actualEnd;
                return true;
            }
        }
        hasUnsupportedProtocol = false;
        return false;
    }

    function resetState() {
        tokenStart = -1;
        currentToken = '';
        hasDot = false;
        hasProtocol = false;
    }
}

/**
 * Checks if a character is whitespace or a URL delimiter
 */
function isWhitespaceOrDelimiter(char: string): boolean {
    return /[\s<>"`{}|\\^]/.test(char);
}

function isValidUrlOrDomain(input: string): boolean {
    if (URL.canParse(input)) {
        return true;
    }

    if (URL.canParse(`https://${input}`)) {
        if (input.includes('..')) {
            return false;
        }

        if (input.startsWith('.') || input.endsWith('.')) {
            return false;
        }

        return hasKnownTLD(new URL(`https://${input}`).hostname);
    }

    return false;
}

function hasKnownTLD(tld: string): boolean {
    const lastDot = tld.lastIndexOf('.');
    if (lastDot !== -1) {
        const afterDot = tld.slice(lastDot + 1).toLowerCase();
        return tlds.has(afterDot);
    }
    return false;
}

function parseSecretTag(
    openingTag: string,
    content: string,
    start: number,
    end: number,
): SecretLocation | null {
    // Parse name attribute
    let nameMatch = '';
    let nameStart = openingTag.indexOf('name="');
    let nameEnd = -1;
    if (nameStart !== -1) {
        nameStart += 6; // length of 'name="'
        nameEnd = openingTag.indexOf('"', nameStart);
        if (nameEnd !== -1) {
            nameMatch = openingTag.slice(nameStart, nameEnd);
        }
    }
    if (nameEnd === -1 || !nameMatch) {
        // invalid tag
        return null;
    }

    // Parse displayName attribute
    let displayNameMatch = '';
    let displayNameStart = openingTag.indexOf('displayName="', nameEnd);
    let displayNameEnd = -1;
    if (displayNameStart !== -1) {
        displayNameStart += 13; // length of 'displayName="'
        displayNameEnd = openingTag.indexOf('"', displayNameStart);
        if (displayNameEnd !== -1) {
            displayNameMatch = openingTag.slice(displayNameStart, displayNameEnd);
        }
    }

    if (displayNameEnd === -1 || !displayNameMatch) {
        return null;
    }

    return {
        start,
        end,
        name: nameMatch,
        displayName: displayNameMatch,
        content: content,
        kind: 'secret',
    };
}
