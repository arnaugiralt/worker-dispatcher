const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  return handler(request, response, {
    redirects: [
      { source: '/', destination: '/example/index.html' }
    ]
  });
})

server.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});
