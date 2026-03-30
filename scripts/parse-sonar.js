import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/temp/sonar-issues.json', 'utf8'));

const issuesSummary = data.issues.map(issue => ({
  rule: issue.rule,
  severity: issue.severity,
  component: issue.component.split(':')[1],
  line: issue.line,
  message: issue.message
}));

// Group by file
const byFile = {};
issuesSummary.forEach(issue => {
  const file = issue.component;
  if (!byFile[file]) {
    byFile[file] = [];
  }
  byFile[file].push(issue);
});

console.log('=== SONARQUBE ISSUES BY FILE ===\n');

Object.keys(byFile).sort().forEach(file => {
  console.log(`\n📁 ${file}:`);
  byFile[file].forEach(issue => {
    console.log(`  [${issue.severity}] Line ${issue.line}: ${issue.rule}`);
    console.log(`    ${issue.message}`);
  });
});

console.log('\n\n=== SUMMARY BY SEVERITY ===');
const bySeverity = {};
issuesSummary.forEach(issue => {
  if (!bySeverity[issue.severity]) {
    bySeverity[issue.severity] = 0;
  }
  bySeverity[issue.severity]++;
});
console.log(bySeverity);
