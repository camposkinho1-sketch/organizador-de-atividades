const fs = require('fs');
fs.writeFileSync('test_tasks.js', `
  console.log("We can't easily test the API without auth.");
`);
