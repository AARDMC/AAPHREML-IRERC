#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const deploymentId = String(process.env.IRERC_DEPLOYMENT_ID || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY || 'AARDMC/AAPHREML-IRERC').split('/');
const owner = repository[0].toLowerCase();
const outputDir = path.join(root, '.pages-site');

if (!deploymentId || !/^[A-Za-z0-9_-]+$/.test(deploymentId)) {
  throw new Error('Set IRERC_DEPLOYMENT_ID in the irerc-production environment before building Pages.');
}
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

let html = read('Index.html');
const replacements = [
  ["<?!= include_('styles/styles') ?>", read('styles/styles.html')],
  ["<?!= include_('client/app') ?>", read('client/app.html')],
  ["<?!= include_('client/views') ?>", read('client/views.html')],
  ['<?!= logoDataUri ?>', 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'Logo File.png')).toString('base64')]
];
replacements.forEach(function(pair) {
  if (html.indexOf(pair[0]) === -1) throw new Error('Missing Pages template marker: ' + pair[0]);
  html = html.replace(pair[0], pair[1]);
});

const bridgeUrl = 'https://script.google.com/macros/s/' + deploymentId + '/exec?bridge=1';
const configScript = '<script>window.IRERC_CONFIG = ' + JSON.stringify({ bridgeUrl: bridgeUrl }) + ';</script>';
if (html.indexOf('<!-- IRERC_PAGES_CONFIG -->') === -1) throw new Error('Missing Pages configuration marker.');
html = html.replace('<!-- IRERC_PAGES_CONFIG -->', configScript);
if (html.indexOf('<?!') !== -1 || html.indexOf('IRERC_PAGES_CONFIG') !== -1) {
  throw new Error('Unresolved Apps Script template marker in Pages output.');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(outputDir, '.nojekyll'), '', 'utf8');
console.log('Built GitHub Pages site at .pages-site.');
