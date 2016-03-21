// ------------------------------------------------------------------------
// Server code
// ------------------------------------------------------------------------
'use strict';

var express = require('express');
var utils = require('./utils');
var Controller = require('./controller.js');
var control = new Controller();
var publicFolder = utils.joinPath(__dirname, '..', '..', 'public');

//Lets define a port we want to listen to
var PORT = 4000;

//Create a server
var server = express();

// "/username/repo" request types
server.get(/^\/[\w-.]{2,}\/[\w-.]+\/?$/, function (request, response) {
  var user = utils.parse.user(request.url);
  var repoName = utils.parse.repository(request.url);

  control.getRepoPage(user, repoName)
  .then(function (page) {
    response.write(page);
    response.end();
  })
  .catch(function (err) {
    response.write('An error occurred:');
    response.write(err);
    response.end();
  });
});

// Landing page
server.get(/\/$/, function (request, response) {
  utils.readFile(publicFolder + '/index.html')
  .then(function (index) {
    response.write(index);
    response.end();
  });
});

// "/webhook/username/repo" request types
server.get(/^\/webhook\/[\w-.]{2,}\/[\w-.]+\/?/, function (request, response) {
  var userRepoUrl = request.url.replace('/webhook', '');
  var user = utils.parse.user(userRepoUrl);
  var repoName = utils.parse.repository(userRepoUrl);

  control.webhookEvent('push', user, repoName);
  response.end('Push event recorded');
});

// Serve static files.
server.use('/s', express.static(publicFolder));

//Lets start our server
server.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
