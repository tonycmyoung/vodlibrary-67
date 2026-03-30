const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./temp/sonar-issues-latest.json', 'utf8'));

console.log(`Total issues: ${data.total}`);
console.log('\n=== Issues by File ===');

const byFile = {};
const byRule = {};

data.issues.forEach(issue => {
  const file = issue.component.replace('tonycmyoung_vodlibrary-67:', '');
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push({
    line: issue.line,
    rule: issue.rule,
    message: issue.message,
    severity: issue.severity
  });
  
  if (!byRule[issue.rule]) byRule[issue.rule] = 0;
  byRule[issue.rule]++;
});

Object.entries(byFile).forEach(([file, issues]) => {
  console.log(`\n${file} (${issues.length} issues):`);
  issues.forEach(i => {
    console.log(`  Line ${i.line}: [${i.severity}] ${i.rule} - ${i.message}`);
  });
});

console.log('\n=== Issues by Rule ===');
Object.entries(byRule).sort((a,b) => b[1] - a[1]).forEach(([rule, count]) => {
  console.log(`${rule}: ${count}`);
});
