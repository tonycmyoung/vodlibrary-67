const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/temp/sonar-issues.json', 'utf8'));

// Group issues by rule
const byRule = {};
data.issues.forEach(issue => {
  const rule = issue.rule || 'UNKNOWN';
  if (!byRule[rule]) {
    byRule[rule] = [];
  }
  byRule[rule].push(issue);
});

// Group by file
const byFile = {};
data.issues.forEach(issue => {
  const file = issue.component.split(':')[1] || issue.component;
  if (!byFile[file]) {
    byFile[file] = [];
  }
  byFile[file].push(issue);
});

console.log('=== ISSUES BY RULE ===');
Object.entries(byRule).forEach(([rule, issues]) => {
  console.log(`\n${rule}: ${issues.length} issues`);
  issues.slice(0, 3).forEach(issue => {
    console.log(`  - ${issue.component}: Line ${issue.line} - ${issue.message}`);
  });
});

console.log('\n\n=== ISSUES BY FILE ===');
Object.entries(byFile).forEach(([file, issues]) => {
  console.log(`\n${file}: ${issues.length} issues`);
  issues.slice(0, 2).forEach(issue => {
    console.log(`  - ${issue.rule}: Line ${issue.line}`);
  });
});
