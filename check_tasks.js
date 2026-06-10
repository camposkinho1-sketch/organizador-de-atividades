const https = require('https');
https.get('https://tasks.googleapis.com/$discovery/rest?version=v1', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const doc = JSON.parse(data);
    console.log(doc.schemas.Task.properties.due.description);
  });
});
