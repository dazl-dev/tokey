import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

const indexRoot = path.join(import.meta.dirname, '../demos');

const compileModule = createWorker(path.join(import.meta.dirname, 'ts-worker.js'));

const port = 8080;
http.createServer((req, res) => {
    respond(req, res).catch((e) => {
        res.statusCode = 500;
        res.write(e.stack);
        res.end();
    });
}).listen(port, console.log.bind(console, `Listening at http://localhost:${port}`));

const headersTypes = {
    js: { 'Content-Type': 'application/javascript' },
    html: { 'Content-Type': 'text/html' },
    css: { 'Content-Type': 'text/css' },
};

const extensions = ['.ts', '.js', '.html'];

async function respond(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const { fullPath, content, ext } = await lookupRequest(url);

    console.log(req.url, ext);

    if (ext === '.ts') {
        const compiled = await compileModule(content, path.basename(fullPath));
        sendContent(res, compiled, headersTypes.js);
    } else if (ext === '.js') {
        sendContent(res, content, headersTypes.js);
    } else if (ext === '.html') {
        sendContent(res, content, headersTypes.html);
    } else if (ext === '.css') {
        sendContent(res, content, headersTypes.css);
    } else {
        sendContent(res, await createIndex(), headersTypes.html);
    }
}

async function lookupRequest(url) {
    const filePath = path.join(process.cwd(), url.pathname);
    const stackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
    try {
        return {
            fullPath: filePath,
            content: await fs.readFile(filePath, 'utf-8'),
            ext: path.extname(filePath),
        };
    } catch {
        for (const ext of extensions) {
            const fullPath = filePath + ext;
            try {
                return {
                    fullPath,
                    content: await fs.readFile(fullPath, 'utf-8'),
                    ext,
                };
            } catch {
                // console.error(e);
            }
        }
    }
    Error.stackTraceLimit = stackTraceLimit;
    return { fullPath: filePath, content: undefined, ext: undefined };
}

async function createIndex() {
    const files = await fs.readdir(indexRoot, {
        withFileTypes: true,
    });
    const paths = files
        .filter((file) => !file.isDirectory() && file.name.endsWith('html'))
        .map(({ name: fileName }) => {
            const { name, ext } = path.parse(fileName);
            const href = `/demos/${name}${ext}`;
            return `<a href="${href}">${name}</a>`;
        });
    return `
      <style>body{font-family: monospace;} a {padding: 0.5em 1em;display:block}</style>
      <h2>Demos</h2>
      ${paths.join('')}
    `;
}

function createWorker(filePath) {
    const tsWorker = new Worker(filePath);
    let id = 0;
    const pending = new Map();
    tsWorker.on('message', ({ id, result }) => {
        pending.get(id).resolve(result);
        pending.delete(id);
    });
    return (...args) => {
        return new Promise((resolve, reject) => {
            const mid = id++;
            tsWorker.postMessage({ args, id: mid });
            pending.set(mid, { resolve, reject });
        });
    };
}

function sendContent(res, content, headers) {
    res.writeHead(200, headers);
    res.write(content);
    res.end();
}
