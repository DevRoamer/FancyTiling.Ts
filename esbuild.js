import { build } from "esbuild";
import { resolve } from 'path';
import metadata from './src/metadata.json' assert { type: 'json' };

const __out = 'build';
const __src = 'src';

console.debug(`Building ${metadata.name} v${metadata.version}...`);
build({
    entryPoints: [resolve(__src, 'extension.ts'), resolve(__src, 'prefs.ts')],
    outdir: __out,
    bundle: true,
    treeShaking: true,
    target: 'firefox102',
    platform: 'node',
    minify: false,
    keepNames: true,
    charset: 'utf8',
    conditions: ['import'],
    format: 'esm',
    external: ['girs', 'gi://*', 'resource://*', 'system', 'gettext', 'cairo'],
});
