// Produce two single-file builds from the module source.
//
//   dist/real-estate-empire.html  a complete page: double-click it, or drop it on any
//                                 static host. No server, no dependencies, no build step
//                                 for whoever receives it.
//   dist/artifact.html            the same page without the document scaffolding, for
//                                 hosts that supply their own <head> and <body>.
//
// Run: node tools/build.mjs   (requires npx esbuild, fetched on demand)

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BUILD = join(ROOT, 'build');
const TMP = join(DIST, '.app.bundle.js');

mkdirSync(DIST, { recursive: true });
mkdirSync(BUILD, { recursive: true });

console.log('bundling…');
// Node 24 refuses to spawn .cmd shims directly, so go through the shell.
execSync(
  `npx --yes esbuild@0.25.10 "${join(ROOT, 'src/ui/app.js')}" --bundle --format=iife --target=es2020 --outfile="${TMP}"`,
  { stdio: 'inherit', cwd: ROOT, shell: true },
);

const js = readFileSync(TMP, 'utf8');
const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
rmSync(TMP, { force: true });

// Inline the typefaces as data URIs. The single-file build has to be genuinely single:
// a relative url() to fonts/ would break the moment somebody moves the file, and a link
// to Google would reintroduce the third-party request this project deliberately removed.
const fontCss = readFileSync(join(ROOT, 'fonts.css'), 'utf8')
  .replace(/url\('fonts\/([^']+)'\)/g, (_, file) => {
    const b64 = readFileSync(join(ROOT, 'fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${b64})`;
  });

// The gallery and browser tab want a name, not a caption with a date range after it.
const TITLE = 'Hyderabad Real Estate Empire';

const head = `<title>${TITLE}</title>
<style>
${fontCss}
${css}
</style>`;

const singleHash = createHash('sha256').update(js).digest('hex').slice(0, 10);
const body = `<div id="app"></div>
<div id="modal-root"></div>
<script>
${js.replace(/__BUILD_ID__/g, singleHash)}
</script>`;

writeFileSync(join(DIST, 'artifact.html'), `${head}\n${body}\n`);

writeFileSync(join(DIST, 'real-estate-empire.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="A business simulation of building a real-estate company in Hyderabad between 1995 and 2020, driven by the actual historical record.">
${head}
</head>
<body>
${body}
</body>
</html>
`);

// ---------------------------------------------------------------- hosted build
//
// GitHub Pages serves assets with a ten-minute cache and no revalidation, and the browser
// keeps ES modules considerably longer than that. The practical effect is that a player
// sitting on a broken build can keep hitting the bug after it has been fixed, with no way
// to know. So the hosted page loads one bundle whose filename contains a hash of its own
// contents: change a byte and the filename changes, and a stale copy becomes unreachable
// rather than merely unlucky. It also turns twelve round trips into one.
const hash = createHash('sha256').update(js).digest('hex').slice(0, 10);
// Stamp the build id into the code so the running version is visible in the interface.
// Without it, "did you get the fix?" is unanswerable for both of us.
const stamped = js.replace(/__BUILD_ID__/g, hash);
const bundleName = `app.${hash}.js`;

// Drop any bundle from a previous build so the directory does not accumulate.
for (const f of readdirSync(BUILD)) if (/^app\.[0-9a-f]{10}\.js$/.test(f)) rmSync(join(BUILD, f));
writeFileSync(join(BUILD, bundleName), stamped);

const index = readFileSync(join(ROOT, 'index.html'), 'utf8')
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, `<script src="build/${bundleName}"></script>`);
writeFileSync(join(ROOT, 'index.html'), index);

const kb = (p, dir = DIST) => (readFileSync(join(dir, p)).length / 1024).toFixed(0) + ' KB';
console.log(`dist/real-estate-empire.html  ${kb('real-estate-empire.html')}`);
console.log(`dist/artifact.html            ${kb('artifact.html')}`);
console.log(`build/${bundleName}${' '.repeat(Math.max(0, 24 - bundleName.length))}${kb(bundleName, BUILD)}  (index.html now points here)`);
