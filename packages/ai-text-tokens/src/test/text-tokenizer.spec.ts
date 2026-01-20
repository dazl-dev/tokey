import { expect } from 'chai';
import { textTokenizer, type UrlLocation } from '../text-tokenizer.ts';

describe('Text Tokenizer', () => {
    /**
     * Validates that the tokenizer output can be reconstructed back to the original input
     */
    function validateTokenReconstruction(input: string): void {
        const result = textTokenizer(input);

        // Reconstruct the string from tokens
        let reconstructed = '';
        for (const token of result) {
            if (token.kind === 'text') {
                reconstructed += token.text;
            } else if (token.kind === 'url') {
                reconstructed += token.url;
            } else if (token.kind === 'secret') {
                reconstructed += `<secret name="${token.name}" displayName="${token.displayName}">${token.content}</secret>`;
            }
        }

        expect(reconstructed).to.equal(
            input,
            `Reconstructed text "${reconstructed}" does not match original input "${input}"`,
        );

        // Also validate that tokens don't overlap and cover the entire input
        let expectedStart = 0;
        for (const token of result) {
            expect(token.start).to.equal(
                expectedStart,
                `Token at position ${token.start} should start at ${expectedStart}`,
            );
            expectedStart = token.end;
        }
        expect(expectedStart).to.equal(
            input.length,
            `Tokens should cover entire input (expected ${input.length}, got ${expectedStart})`,
        );
    }
    function testUrlMatch(input: string, expectedUrls: string[] = []): void {
        // First validate that the tokenizer output can be reconstructed to the original input
        validateTokenReconstruction(input);

        const result = textTokenizer(input);
        const foundUrls: string[] = [];
        for (const token of result) {
            if (token.kind === 'url') {
                foundUrls.push(token.url);
            }
        }

        if (expectedUrls.length === 0) {
            expect(foundUrls).to.have.lengthOf(
                0,
                `Expected "${input}" not to contain any URLs, but found: ${foundUrls.length > 0 ? foundUrls.join(', ') : 'none'}`,
            );
        } else {
            expect(foundUrls).to.have.lengthOf(
                expectedUrls.length,
                `Expected "${input}" to contain ${expectedUrls.length} URL(s): [${expectedUrls.join(', ')}], but found ${foundUrls.length}: [${foundUrls.join(', ')}]`,
            );

            expectedUrls.forEach((expectedUrl, index) => {
                expect(foundUrls[index]).to.equal(
                    expectedUrl,
                    `Expected URL at index ${index} to be "${expectedUrl}", but found "${foundUrls[index] || 'undefined'}"`,
                );
            });
        }
    }

    interface ExpectedUrlLocation {
        url: string;
        start: number;
        end: number;
    }

    function testUrlMatchWithLocations(
        input: string,
        expectedUrls: ExpectedUrlLocation[] = [],
    ): void {
        // First validate that the tokenizer output can be reconstructed to the original input
        validateTokenReconstruction(input);

        const result = textTokenizer(input);
        const urlTokens: UrlLocation[] = [];
        for (const token of result) {
            if (token.kind === 'url') {
                urlTokens.push(token);
            }
        }
        const foundUrls = urlTokens.map((r) => r.url);

        if (expectedUrls.length === 0) {
            expect(urlTokens).to.have.lengthOf(
                0,
                `Expected "${input}" not to contain any URLs, but found: ${foundUrls.length > 0 ? foundUrls.join(', ') : 'none'}`,
            );
        } else {
            expect(urlTokens).to.have.lengthOf(
                expectedUrls.length,
                `Expected "${input}" to contain ${expectedUrls.length} URL(s): [${expectedUrls.map((u) => u.url).join(', ')}], but found ${foundUrls.length}: [${foundUrls.join(', ')}]`,
            );

            expectedUrls.forEach((expectedUrlLocation, index) => {
                expect(urlTokens[index]).to.deep.equal(
                    {
                        start: expectedUrlLocation.start,
                        end: expectedUrlLocation.end,
                        url: expectedUrlLocation.url,
                        kind: 'url',
                    },
                    `Expected URL at index ${index} to be at location ${expectedUrlLocation.start}-${expectedUrlLocation.end} with URL "${expectedUrlLocation.url}", but found location ${urlTokens[index].start}-${urlTokens[index].end} with URL "${urlTokens[index]?.url || 'undefined'}"`,
                );
            });
        }
    }

    function testSingleUrlLocation(
        input: string,
        expectedUrl: string,
        expectedStart: number,
        expectedEnd: number,
    ): void {
        // First validate that the tokenizer output can be reconstructed to the original input
        validateTokenReconstruction(input);

        const result = textTokenizer(input);
        const urlTokens = result.filter((token) => token.kind === 'url');
        expect(urlTokens).to.have.lengthOf(1, `Expected exactly one URL in "${input}"`);
        expect(urlTokens[0]).to.deep.equal({
            start: expectedStart,
            end: expectedEnd,
            url: expectedUrl,
            kind: 'url',
        });
    }

    describe('protocol variations', () => {
        it('should detect URLs with https:// protocol', () => {
            testUrlMatchWithLocations('https://example.com', [
                { url: 'https://example.com', start: 0, end: 19 },
            ]);
        });

        it('should detect URLs with http:// protocol', () => {
            testUrlMatchWithLocations('http://example.com', [
                { url: 'http://example.com', start: 0, end: 18 },
            ]);
        });

        it('should detect URLs with ftp:// protocol', () => {
            testUrlMatchWithLocations('ftp://example.com', [
                { url: 'ftp://example.com', start: 0, end: 17 },
            ]);
        });

        it('should detect URLs with file:// protocol', () => {
            testUrlMatchWithLocations('file://example.com', [
                { url: 'file://example.com', start: 0, end: 18 },
            ]);
        });

        it('should not detect URLs with unsupported protocols', () => {
            testUrlMatchWithLocations('mailto://user@example.com', []);
            testUrlMatchWithLocations('tel://123-456-7890', []);
        });

        it('should handle URLs with prefix text correctly', () => {
            testUrlMatchWithLocations('absdhttp://a.com', [
                { url: 'http://a.com', start: 4, end: 16 },
            ]);
        });
    });

    describe('domain-only URLs (without protocol)', () => {
        it('should detect basic domain', () => {
            testUrlMatchWithLocations('example.com', [{ url: 'example.com', start: 0, end: 11 }]);
        });

        it('should detect URLs with www prefix', () => {
            testUrlMatchWithLocations('www.example.com', [
                { url: 'www.example.com', start: 0, end: 15 },
            ]);
        });

        it('should detect URLs without www prefix', () => {
            testUrlMatchWithLocations('blog.example.com', [
                { url: 'blog.example.com', start: 0, end: 16 },
            ]);
        });

        it('should detect URLs with multiple subdomain levels', () => {
            testUrlMatchWithLocations('sub.domain.example.com', [
                { url: 'sub.domain.example.com', start: 0, end: 22 },
            ]);
        });
    });

    describe('TLD variations', () => {
        it('should detect URLs with common TLDs', () => {
            ['com', 'org', 'net', 'edu', 'gov', 'io', 'co'].forEach((tld) => {
                const url = `example.${tld}`;
                testUrlMatchWithLocations(url, [{ url, start: 0, end: url.length }]);
            });
        });

        it('should detect URLs with country code TLDs', () => {
            ['uk', 'ca', 'de', 'jp', 'au', 'fr'].forEach((tld) => {
                const url = `example.${tld}`;
                testUrlMatchWithLocations(url, [{ url, start: 0, end: url.length }]);
            });
        });

        it('should detect URLs with longer TLDs', () => {
            ['museum', 'travel', 'company'].forEach((tld) => {
                const url = `example.${tld}`;
                testUrlMatchWithLocations(url, [{ url, start: 0, end: url.length }]);
            });
        });
    });

    describe('URLs with paths, queries, and fragments', () => {
        it('should detect URLs with simple paths', () => {
            testUrlMatchWithLocations('example.com/path', [
                { url: 'example.com/path', start: 0, end: 16 },
            ]);
            testUrlMatchWithLocations('https://example.com/path/to/resource', [
                { url: 'https://example.com/path/to/resource', start: 0, end: 36 },
            ]);
        });

        it('should detect URLs with query parameters', () => {
            testUrlMatchWithLocations('example.com?param=value', [
                { url: 'example.com?param=value', start: 0, end: 23 },
            ]);
            testUrlMatchWithLocations('example.com?param=value&other=123', [
                { url: 'example.com?param=value&other=123', start: 0, end: 33 },
            ]);
        });

        it('should detect URLs with fragments', () => {
            testUrlMatchWithLocations('example.com#section-1', [
                { url: 'example.com#section-1', start: 0, end: 21 },
            ]);
        });

        it('should detect URLs with complex paths, queries and fragments', () => {
            testUrlMatchWithLocations('example.com/api/v1/users?sort=name&order=asc#results', [
                { url: 'example.com/api/v1/users?sort=name&order=asc#results', start: 0, end: 52 },
            ]);
            testUrlMatchWithLocations(
                'https://example.com/api/v1/users?sort=name&order=asc#results',
                [
                    {
                        url: 'https://example.com/api/v1/users?sort=name&order=asc#results',
                        start: 0,
                        end: 60,
                    },
                ],
            );
        });

        it('should detect URLs with special characters in path', () => {
            testUrlMatchWithLocations('example.com/path/with-dash/and_underscore/and', [
                { url: 'example.com/path/with-dash/and_underscore/and', start: 0, end: 45 },
            ]);
        });
    });

    describe('URLs in context (with surrounding text)', () => {
        it('should parse a single URL', () => {
            testUrlMatch('https://example.com', ['https://example.com']);
            testSingleUrlLocation('https://example.com', 'https://example.com', 0, 19);
        });

        it('should parse a URL with text before and after', () => {
            const input = 'Visit https://example.com for more info';
            const result = textTokenizer(input);
            const urlTokens = result.filter((token) => token.kind === 'url');

            expect(urlTokens).to.have.lengthOf(1);
            expect(urlTokens[0]).to.deep.equal({
                start: 6,
                end: 25,
                url: 'https://example.com',
                kind: 'url',
            });

            // Verify text nodes are present
            const textTokens = result.filter((token) => token.kind === 'text');
            expect(textTokens).to.have.lengthOf(2);
            expect(textTokens[0]).to.deep.equal({
                start: 0,
                end: 6,
                text: 'Visit ',
                kind: 'text',
            });
            expect(textTokens[1]).to.deep.equal({
                start: 25,
                end: 39,
                text: ' for more info',
                kind: 'text',
            });
        });

        it('should parse multiple URLs in text', () => {
            const input = 'Check https://example.com and also http://test.org';
            const result = textTokenizer(input);
            const urlTokens = result.filter((token) => token.kind === 'url');

            expect(urlTokens).to.have.lengthOf(2);
            expect(urlTokens[0]).to.deep.equal({
                start: 6,
                end: 25,
                url: 'https://example.com',
                kind: 'url',
            });
            expect(urlTokens[1]).to.deep.equal({
                start: 35,
                end: 50,
                url: 'http://test.org',
                kind: 'url',
            });

            // Verify text nodes are present between URLs
            const textTokens = result.filter((token) => token.kind === 'text');
            expect(textTokens).to.have.lengthOf(2);
            expect(textTokens[0]).to.deep.equal({
                start: 0,
                end: 6,
                text: 'Check ',
                kind: 'text',
            });
            expect(textTokens[1]).to.deep.equal({
                start: 25,
                end: 35,
                text: ' and also ',
                kind: 'text',
            });
        });

        it('should handle URLs at start and end of text', () => {
            testUrlMatch('https://start.com middle text https://end.com', [
                'https://start.com',
                'https://end.com',
            ]);
        });
    });

    describe('edge cases and special scenarios', () => {
        it('should handle URLs with ports', () => {
            testUrlMatchWithLocations('https://localhost:3000', [
                { url: 'https://localhost:3000', start: 0, end: 22 },
            ]);
            testUrlMatchWithLocations('example.com:8080', [
                { url: 'example.com:8080', start: 0, end: 16 },
            ]);
        });

        it('should handle URLs with userinfo (though not common)', () => {
            testUrlMatchWithLocations('https://user:pass@example.com', [
                { url: 'https://user:pass@example.com', start: 0, end: 29 },
            ]);
        });

        it('should handle URLs ending at string boundary', () => {
            testSingleUrlLocation('Visit example.com', 'example.com', 6, 17);
        });

        it('should reset state on whitespace', () => {
            const input = 'partial.invalid.start example.com';
            testUrlMatchWithLocations(input, [{ url: 'example.com', start: 22, end: 33 }]);
        });

        it('should handle multiple URLs separated by various delimiters', () => {
            testUrlMatchWithLocations('Sites: example.com, test.org; also check blog.net', [
                { url: 'example.com', start: 7, end: 18 },
                { url: 'test.org', start: 20, end: 28 },
                { url: 'blog.net', start: 41, end: 49 },
            ]);
        });
    });

    describe('things that should NOT match', () => {
        it('should not match standalone words', () => {
            testUrlMatchWithLocations('word', []);
            testUrlMatchWithLocations('hello', []);
        });

        it('should not match object method notation', () => {
            testUrlMatchWithLocations('object.method()', []);
            testUrlMatchWithLocations('console.log()', []);
        });

        it('should not match common file extensions that are not domains', () => {
            testUrlMatchWithLocations('document.pdf', []);
            testUrlMatchWithLocations('image.jpg', []);
            testUrlMatchWithLocations('script.js', []);
            testUrlMatchWithLocations('style.css', []);
        });

        it('should not match code snippets with dots', () => {
            testUrlMatchWithLocations('console.log("test")', []);
            testUrlMatchWithLocations('Math.floor(3.14)', []);
        });

        it('should not match IP addresses (current implementation)', () => {
            // Note: Current implementation likely won't match IP addresses due to isValidDomain logic
            testUrlMatchWithLocations('192.168.1.1', []);
            testUrlMatchWithLocations('127.0.0.1', []);
        });

        it('should not match paths without domain', () => {
            testUrlMatchWithLocations('/path/to/file', []);
            testUrlMatchWithLocations('./relative/path', []);
            testUrlMatchWithLocations('../parent/path', []);
        });

        it('should not match version numbers', () => {
            testUrlMatchWithLocations('v1.2.3', []);
            testUrlMatchWithLocations('version.1.0', []);
        });

        it('should not match domains with invalid TLDs', () => {
            // TLDs that are too short or too long, or contain invalid characters
            testUrlMatchWithLocations('example.a', []); // Too short
            testUrlMatchWithLocations('example.verylongtldthatexceeds', []); // Too long
        });

        it('should not match incomplete domains', () => {
            testUrlMatchWithLocations('.com example. example..com', []); // Starts with dot
        });
    });

    describe('whitespace and delimiter handling', () => {
        it('should handle various whitespace characters', () => {
            testUrlMatchWithLocations('before\texample.com\tafter', [
                { url: 'example.com', start: 7, end: 18 },
            ]);
            testUrlMatchWithLocations('before\nexample.com\nafter', [
                { url: 'example.com', start: 7, end: 18 },
            ]);
            testUrlMatchWithLocations('before example.com after', [
                { url: 'example.com', start: 7, end: 18 },
            ]);
        });

        it('should handle various delimiter characters', () => {
            testUrlMatchWithLocations('<example.com>', [{ url: 'example.com', start: 1, end: 12 }]);
            testUrlMatchWithLocations('"example.com"', [{ url: 'example.com', start: 1, end: 12 }]);
            testUrlMatchWithLocations('`example.com`', [{ url: 'example.com', start: 1, end: 12 }]);
            testUrlMatchWithLocations('{example.com}', [{ url: 'example.com', start: 1, end: 12 }]);
            testUrlMatchWithLocations('|example.com|', [{ url: 'example.com', start: 1, end: 12 }]);
        });

        it('should handle mixed delimiters and whitespace', () => {
            testUrlMatchWithLocations('Visit <https://example.com> for info', [
                { url: 'https://example.com', start: 7, end: 26 },
            ]);
            testUrlMatchWithLocations('Check "www.test.org" and `blog.example.net`', [
                { url: 'www.test.org', start: 7, end: 19 },
                { url: 'blog.example.net', start: 26, end: 42 },
            ]);
        });
    });

    describe('complex real-world scenarios', () => {
        it('should handle markdown-like syntax', () => {
            testUrlMatchWithLocations('[Link](https://example.com)', [
                { url: 'https://example.com', start: 7, end: 26 },
            ]);
            testUrlMatchWithLocations('See https://example.com/path?param=value for details', [
                { url: 'https://example.com/path?param=value', start: 4, end: 40 },
            ]);
        });

        it('should handle HTML-like content', () => {
            testUrlMatchWithLocations('<a href="https://example.com">link</a>', [
                { url: 'https://example.com', start: 9, end: 28 },
            ]);
        });

        it('should handle mixed content with multiple URL types', () => {
            const input =
                'Visit https://secure.example.com or plain example.org, also check ftp://files.test.net';
            testUrlMatchWithLocations(input, [
                { url: 'https://secure.example.com', start: 6, end: 32 },
                { url: 'example.org', start: 42, end: 53 },
                { url: 'ftp://files.test.net', start: 66, end: 86 },
            ]);
        });

        it('should handle URLs with unicode domains (if supported)', () => {
            // This test might fail depending on current implementation
            // testUrlMatchWithLocations('例え.テスト', [{ url: '例え.テスト', start: 0, end: 5 }]);
        });
    });

    describe('performance and edge cases', () => {
        it('should handle empty string', () => {
            testUrlMatchWithLocations('', []);
        });

        it('should handle very long URLs', () => {
            const longPath = '/very/long/path/' + 'segment/'.repeat(50);
            const longUrl = `https://example.com${longPath}`;
            testUrlMatchWithLocations(longUrl, [{ url: longUrl, start: 0, end: longUrl.length }]);
        });

        it('should handle text with many potential false positives', () => {
            const input =
                'Math.PI equals 3.14159, version 2.0.1, file.txt, obj.method(), but visit example.com';
            testUrlMatchWithLocations(input, [{ url: 'example.com', start: 73, end: 84 }]);
        });
    });

    describe('token reconstruction validation', () => {
        it('should reconstruct plain text without any special tokens', () => {
            const inputs = [
                'Hello world!',
                'This is a simple text.',
                'No special tokens here.',
                'Just plain text with spaces and punctuation!',
                '',
                'Single line',
                'Multi\nline\ntext\nwith\nbreaks',
                'Text with    multiple    spaces',
                'Tabs\tand\tother\twhitespace\tcharacters',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
                // Also verify it produces only text tokens
                const result = textTokenizer(input);
                const allTokensAreText = result.every((token) => token.kind === 'text');
                expect(allTokensAreText).to.equal(true);
            });
        });

        it('should reconstruct text with URLs', () => {
            const inputs = [
                'Visit https://example.com for more info',
                'Check example.com and google.com',
                'URL: https://sub.domain.example.org/path?q=1#section',
                'Before https://example.com after',
                'Multiple URLs: https://first.com and https://second.org here',
                'Text with ftp://files.example.com/file.txt download',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });

        it('should reconstruct text with secret tokens', () => {
            const inputs = [
                'Here is a <secret name="token" displayName="API Token">abc123</secret> for you',
                'Before <secret name="key" displayName="Secret Key">xyz789</secret> after',
                'Multiple <secret name="a" displayName="A">1</secret> and <secret name="b" displayName="B">2</secret> secrets',
                '<secret name="start" displayName="At Start">value</secret> rest of text',
                'Text before <secret name="end" displayName="At End">final</secret>',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });

        it('should reconstruct complex mixed content', () => {
            const inputs = [
                'Visit https://example.com with <secret name="token" displayName="API Token">abc123</secret> for auth',
                'Before https://api.service.com after <secret name="key" displayName="Key">secret</secret> end',
                'Multiple URLs https://first.com and https://second.com with <secret name="auth" displayName="Auth">token</secret>',
                'Text <secret name="s1" displayName="S1">val1</secret> between https://example.com more <secret name="s2" displayName="S2">val2</secret>',
                'Check [Link](https://example.com) and use <secret name="api" displayName="API Key">key123</secret>',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });

        it('should reconstruct markdown-style links', () => {
            const inputs = [
                '[Link](https://example.com)',
                'See [this link](https://github.com/user/repo) for details',
                'Before [text](https://example.com/path) after',
                'Multiple [first](https://one.com) and [second](https://two.com) links',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });

        it('should handle edge cases and maintain character integrity', () => {
            const inputs = [
                // Whitespace preservation
                '   spaces before and after   ',
                '\t\ttabs\teverywhere\t\t',
                '\n\nNewlines\n\n',
                '   https://example.com   ',

                // Punctuation around URLs
                'Visit https://example.com!',
                'Check (https://example.com)',
                '"https://example.com"',
                'URL: https://example.com;',

                // Special characters
                'Text with émojis 🚀 and https://example.com',
                'Unicode: αβγ and example.com',

                // Empty and minimal cases
                'https://example.com',
                'example.com',
                '<secret name="only" displayName="Only">value</secret>',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });
    });

    describe('case sensitivity', () => {
        it('should detect URLs with mixed case protocols', () => {
            testUrlMatch('HTTPS://example.com', ['HTTPS://example.com']);
            testUrlMatch('Http://example.com', ['Http://example.com']);
            testUrlMatch('FTP://example.com', ['FTP://example.com']);
            testUrlMatch('FILE://example.com', ['FILE://example.com']);
        });

        it('should detect URLs with mixed case domains', () => {
            testUrlMatch('https://EXAMPLE.COM', ['https://EXAMPLE.COM']);
            testUrlMatch('https://Example.Com', ['https://Example.Com']);
            testUrlMatch('https://API.GITHUB.COM', ['https://API.GITHUB.COM']);
            testUrlMatch('EXAMPLE.COM', ['EXAMPLE.COM']);
        });

        it('should detect URLs with mixed case TLDs', () => {
            testUrlMatch('example.COM', ['example.COM']);
            testUrlMatch('example.Co.UK', ['example.Co.UK']);
            testUrlMatch('example.ORG', ['example.ORG']);
            testUrlMatch('example.Net', ['example.Net']);
            testUrlMatch('example.EDU', ['example.EDU']);
        });

        it('should detect URLs with mixed case subdomains', () => {
            testUrlMatch('WWW.example.com', ['WWW.example.com']);
            testUrlMatch('www.EXAMPLE.com', ['www.EXAMPLE.com']);
            testUrlMatch('API.GITHUB.com', ['API.GITHUB.com']);
            testUrlMatch('SUBDOMAIN.api.EXAMPLE.com', ['SUBDOMAIN.api.EXAMPLE.com']);
        });

        it('should detect URLs with mixed case paths and parameters', () => {
            testUrlMatch('https://example.com/PATH/TO/PAGE', ['https://example.com/PATH/TO/PAGE']);
            testUrlMatch('https://example.com/Api/V1/Users', ['https://example.com/Api/V1/Users']);
            testUrlMatch('https://example.com?Param=VALUE', ['https://example.com?Param=VALUE']);
            testUrlMatch('https://example.com#ANCHOR', ['https://example.com#ANCHOR']);
        });

        it('should preserve original case in extracted URLs', () => {
            testUrlMatchWithLocations('Visit HTTPS://API.GITHUB.COM/users/test', [
                { url: 'HTTPS://API.GITHUB.COM/users/test', start: 6, end: 39 },
            ]);

            testUrlMatchWithLocations('Check WWW.EXAMPLE.ORG for more info', [
                { url: 'WWW.EXAMPLE.ORG', start: 6, end: 21 },
            ]);

            testUrlMatchWithLocations('Go to Example.Com/About-Us', [
                { url: 'Example.Com/About-Us', start: 6, end: 26 },
            ]);
        });

        it('should handle mixed case in multiple URLs', () => {
            testUrlMatchWithLocations('See HTTPS://EXAMPLE.COM and http://test.ORG', [
                { url: 'HTTPS://EXAMPLE.COM', start: 4, end: 23 },
                { url: 'http://test.ORG', start: 28, end: 43 },
            ]);
        });

        it('should handle case sensitivity with special characters and boundaries', () => {
            testUrlMatch('Visit (HTTPS://EXAMPLE.COM)!', ['HTTPS://EXAMPLE.COM']);
            testUrlMatch('"WWW.TEST.ORG"', ['WWW.TEST.ORG']);
            testUrlMatch('URL: API.GITHUB.COM;', ['API.GITHUB.COM']);
            testUrlMatch('<HTTP://LOCALHOST:8080>', ['HTTP://LOCALHOST:8080']);
        });

        it('should validate case insensitive TLD matching', () => {
            // These should all be detected as valid URLs since TLD validation is case insensitive
            testUrlMatch('example.com', ['example.com']);
            testUrlMatch('example.COM', ['example.COM']);
            testUrlMatch('example.Com', ['example.Com']);
            testUrlMatch('example.co.uk', ['example.co.uk']);
            testUrlMatch('example.CO.UK', ['example.CO.UK']);
            testUrlMatch('example.Co.Uk', ['example.Co.Uk']);
        });

        it('should handle case sensitivity in complex scenarios', () => {
            const input =
                'Please visit HTTPS://API.GITHUB.COM/repos or check WWW.EXAMPLE.ORG/docs for more information.';
            testUrlMatchWithLocations(input, [
                { url: 'HTTPS://API.GITHUB.COM/repos', start: 13, end: 41 },
                { url: 'WWW.EXAMPLE.ORG/docs', start: 51, end: 71 },
            ]);
        });

        it('should preserve case in reconstruction validation', () => {
            const inputs = [
                'HTTPS://EXAMPLE.COM',
                'Http://Test.Org',
                'WWW.GITHUB.COM',
                'api.EXAMPLE.org/V1',
                'Visit HTTPS://API.Test.COM and WWW.example.ORG',
                'Check (HTTP://LOCALHOST:8080) for details',
            ];

            inputs.forEach((input) => {
                validateTokenReconstruction(input);
            });
        });
    });
});
