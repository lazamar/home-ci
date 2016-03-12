
var fs = require('fs');
var utils = require('./utils');
var Promise = require('promise');
var Repository = require('./repository');

/**
 *  Singleton Controller
 */
function Controller() {
  if (!(this instanceof Controller)) {
    return new Controller();
  }

  //Constants
  const PROJECT_ROOT = process.cwd() + '/';
  const REPOSITORIES_PATH = PROJECT_ROOT + 'repositories/';
  const AUTHORISED_USERS = [
    'lazamar',
    'fourlabsldn',
  ];

  function isAuthorisedUser(user) {
    return (AUTHORISED_USERS.indexOf(user) >= 0);
  }

  this.getRepoPage = function getRepoPage(user, repoName) {
    var authorised = this.isAuthorisedUser(user);

    if (!user) {
      return Promise.resolve('Invalid git user');
    } else if (!repoName) {
      return Promise.resolve('Invalid URL');
    } else if (!authorised) {
      return Promise.resolve('Username not authorised');
    }

    var repo = new Repository(user, repoName, REPOSITORIES_PATH);
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


}

module.exports = Controller;
