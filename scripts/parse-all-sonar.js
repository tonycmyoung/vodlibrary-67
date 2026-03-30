const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/temp/sonar-all-issues.json', 'utf8'));

console.log(`Total issues: ${data.issues.length}\n`);

// Group by file
const byFile = {};
data.issues.forEach(issue => {
  const file = issue.component.replace('vodlibrary-67:', '');
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push({
    rule: issue.rule,
    message: issue.message,
    line: issue.line,
    severity: issue.severity,
    type: issue.type
  });
});

// Print all issues grouped by file
Object.keys(byFile).sort().forEach(file => {
  console.log(`\n=== ${file} (${byFile[file].length} issues) ===`);
  byFile[file].forEach(issue => {
    console.log(`  Line ${issue.line}: [${issue.rule}] ${issue.message}`);
  });
});
