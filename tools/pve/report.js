// Prints (and with --md writes tools/results/LATEST.md) the report of the newest stored batch: node tools/pve/report.js [--md]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'results');
const files = fs.readdirSync(dir).filter(x => /^pve-(?!tune-)\S+\.json$/.test(x)).sort((a, b) => fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs);   // v63: the newest by time (by name, 'v63e' sorted after 'v63')
const f = path.join(dir, files[files.length - 1]);
const { summary, runs, label } = JSON.parse(fs.readFileSync(f, 'utf8'));
const { report } = require('./analyze.js');
const text = `PvE balance report (${label}, ${runs} simulated runs, ${path.basename(f)})\n\n` + report(summary);
console.log(text);
if (process.argv.includes('--md')) fs.writeFileSync(path.join(dir, 'LATEST.md'), '```\n' + text + '\n```\n');
