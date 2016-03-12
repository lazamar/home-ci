
var fs = require('fs');
var utils = require('./utils');
var Promise = require('promise');
var Repository = require('./repository');

var PROJECTROOT = process.cwd() + '/';
var REPOSITORIESPATH = PROJECTROOT + 'repositories/';

function Controller() {
  if (!(this instanceof Controller)) {
    return new Controller();
  }

  var authorisedUsers = [
    'lazamar',
    'fourlabsldn',
  ];
  var repositoriesRunning = [];

  this.isAuthorisedUser = function isAuthorisedUser(user) {
    return (authorisedUsers.indexOf(user) >= 0);
  };

  this.isRunning = function isRunning(repoName) {
    return (repositoriesRunning.indexOf(repoName) >= 0);
  };

  this.addToRunning = function addToRunning(repoName) {
    if (this.isRunning(repoName)) {
      console.error('Repository ' + repoName + 'is already running.');
      return null;
    }

    repositoriesRunning.push(repoName);
  };
}

Controller.prototype.getRepoPage = function getRepoPage(user, repoName) {
  var authorised = this.isAuthorisedUser(user);
  var logFolder = REPOSITORIESPATH + repoName + '/logs';

  if (!user) {
    return Promise.resolve('Invalid git user');
  } else if (!repoName) {
    return Promise.resolve('Invalid URL');
  } else if (!authorised) {
    return Promise.resolve('Username not authorised');
  }

  var repo = new Repository(user, repoName, REPOSITORIESPATH);
  var handling; //this will be a promise

  if (fs.existsSync(REPOSITORIESPATH + repoName)) { //Repository is downloaded
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

  //Now we just build the page and return
  return handling.then(function (log) {
    return utils.buildTemplate({
      username: user,
      repo: repoName,
      code: '',
      content: log,
    });
  });
};

module.exports = Controller;
