const fs = require('fs');

// Read the file as text and extract using regex since the path might be tricky
const rawContent = fs.readFileSync('/user_read_only_context/text_attachments/sonar-issues-HqGbP.json', 'utf8');
const data = JSON.parse(rawContent);

console.log('TOTAL ISSUES:', data.total);
console.log('\n=== ALL UNIQUE RULES ===');

// Get unique rules
const rules = new Set();
data.issues.forEach(issue => rules.add(issue.rule));
console.log([...rules].join('\n'));

console.log('\n=== FULL BREAKDOWN BY RULE ===');
const byRule = {};
data.issues.forEach(issue => {
  const rule = issue.rule;
  if (!byRule[rule]) byRule[rule] = [];
  byRule[rule].push(issue);
});

Object.entries(byRule).forEach(([rule, issues]) => {
  console.log(`\n${rule}: ${issues.length} issues`);
  issues.forEach(issue => {
    const file = issue.component.split(':')[1] || issue.component;
    console.log(`  Line ${issue.line}: ${file}`);
    console.log(`    Message: ${issue.message}`);
  });
});
