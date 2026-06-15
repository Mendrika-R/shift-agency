#!/usr/bin/env node
/*
 * Inline the compiled Tailwind stylesheet into index.html, replacing the
 * contents of <style id="tw">…</style>. This removes a render-blocking
 * request (the CSS is only ~5.5KB gzipped). Run after build:css and before
 * sync:en (en/index.html is regenerated from index.html).
 *
 * Usage: node scripts/inline-css.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "assets", "styles.css");
const htmlPath = path.join(root, "index.html");

const css = fs.readFileSync(cssPath, "utf8").trim();
let html = fs.readFileSync(htmlPath, "utf8");

const re = /(<style id="tw">)[\s\S]*?(<\/style>)/;
if (!re.test(html)) {
  console.error('error: <style id="tw">…</style> marker not found in index.html');
  process.exit(1);
}
html = html.replace(re, `$1\n${css}\n$2`);
fs.writeFileSync(htmlPath, html);
console.log(`inlined ${css.length} bytes of CSS into index.html`);
