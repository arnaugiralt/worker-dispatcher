const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  return handler(request, response, {
		cleanUrls: false,
		public: './example',
    redirects: [
      { source: '/', destination: 'index.html' }
    ]
  });
})

server.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});
