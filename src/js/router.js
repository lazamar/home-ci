// ------------------------------------------------------------------------
// Server code
// ------------------------------------------------------------------------

var express = require('express');
var utils = require('./utils');
var Controller = require('./controller.js');
var control = new Controller();
var publicFolder = utils.joinPath(__dirname, '..', '..', 'public');

// Produce a function that returns an appropriate error message.
function internalServerError(response) {
  return function (err) {
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.write('Internal server error.\n');
    if (err) {
      response.write(JSON.stringify(err));
    }
    response.end();
  };
}

// Lets define a port we want to listen to
var PORT = 4000;

// Create a server
var server = express();

// Landing page
server.get(/\/$/, function (request, response) {
  utils.readFile(publicFolder + '/index.html')
  .then(function (index) {
    response.write(index);
    response.end();
  })
  .catch(internalServerError(response));
});

// Serve static files.
server.use('/s', express.static(publicFolder));

// "/username/repo" request types
server.get(/^\/[\w-.]{2,}\/[\w-.]+\/?$/, function (request, response) {
  var user = utils.parse.user(request.url);
  var repoName = utils.parse.repository(request.url);

  control.getRepoPage(user, repoName)
  .then(function (page) {
    response.write(page);
    response.end();
  })
  .catch(internalServerError(response));
});

// "/webhook/username/repo" request types
server.get(/^\/webhook\/[\w-.]{2,}\/[\w-.]+\/?/, function (request, response) {
  var userRepoUrl = request.url.replace('/webhook', '');
  var user = utils.parse.user(userRepoUrl);
  var repoName = utils.parse.repository(userRepoUrl);

  var eventProcessingMessage = control.webhookEvent('push', user, repoName);
  response.end(eventProcessingMessage);
});

// "/u/username/repo" request types. Status update on a request.
server.get(/^\/u\/[\w-.]{2,}\/[\w-.]+\/?/, function (request, response) {
  var userRepoUrl = request.url.replace('/u', '');
  var user = utils.parse.user(userRepoUrl);
  var repoName = utils.parse.repository(userRepoUrl);

  control.getStatusObject(user, repoName)
  .then(function (status) {
    response.end(JSON.stringify(status));
  })
  .catch(internalServerError(response));
});

// Lets start our server
server.listen(PORT, function () {
  // Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
