// ------------------------------------------------------------------------
// Server code
// ------------------------------------------------------------------------

var projectRoot = process.cwd() + '/';
var repositoriesPath = projectRoot + 'repositories/';

var express = require('express');
var fetch = require('node-fetch');
var Promise = require('promise');
var utils = require('./utils');
var Repository = require('./repository');

//Lets define a port we want to listen to
var PORT = 4000;

//Create a server
var server = express();

// "/username/repo" request types
server.get(/^\/[\w-.]{2,}\/[\w-.]+\/?$/, function (request, response) {
  var user = utils.parse.user(request.url);
  var repoName = utils.parse.repository(request.url);
  var validUser = utils.validate.user(user);
  var logFolder = repositoriesPath + repoName + '/logs';

  if (!user) {
    return response.end('Invalid git user');
  } else if (!repoName) {
    return response.end('Invalid URL');
  } else if (!validUser) {
    return response.end('Username not authorised');
  }

  var folders = utils.readDirectory(repositoriesPath) || [];
  var repo = new Repository(user, repoName, repositoriesPath);
  var handling; //this will be a promise

  if (folders.indexOf(repoName) >= 0 && utils.readDirectory(logFolder)) { //Repository is downloaded
    handling = repo.lastTest()
    .then(function (log) {
      if (log === null) { //no log found
        return repo.runTest();
      } else {
        return log;
      }
    });
  } else { //repository needs to be downloaded
    handling = repo.clone()
    .then(function () { return repo.runTest(); })
    .then(function () { return repo.install(); })
    .then(function () { return repo.runTest(); });
  }

  //Now we just build the response
  handling.then(function (log) {
    return utils.buildTemplate({
      username: user,
      repo: repoName,
      code: '',
      content: log,
    });
  })
  .then(function (template) { response.write(template); })
  .catch(function (err) {
    response.write('An error occurred:');
    response.write(err);
  })
  .finally(function () {
    return response.end();
  });
});

server.get(/\/$/, function (request, response) {
  var homePage = utils.readFile('html/index.html')
  .then(function (index) {
    response.write(index);
    response.end();
  });
});

//Lets start our server
server.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
