
var fs = require('fs');
var utils = require('./utils');
var Promise = require('promise');
var Repositories = require('./repositories');

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

  var repositories = new Repositories(REPOSITORIES_PATH);

  function isAuthorisedUser(user) {
    return (AUTHORISED_USERS.indexOf(user) >= 0);
  }

  /**
   * Creates an HTML page and returns it.
   * @method getRepoPage
   * @param  {String} user
   * @param  {String} repoName
   * @return {Promise}          Resolves to a string with the repo's HTML page.
   */
  this.getRepoPage = function getRepoPage(user, repoName) {
    var authorised = isAuthorisedUser(user);

    if (!user) {
      return Promise.resolve('Invalid git user');
    } else if (!repoName) {
      return Promise.resolve('Invalid URL');
    } else if (!authorised) {
      return Promise.resolve('Username not authorised');
    }

    var repo = repositories.get(user, repoName);

    return repo.tests.getLastLog()
    .then(function (log) {
      if (log) { return log; }

      //test log not found, so let's run an install and run a test.
      return repo.install()
        .then(function () { return repo.tests.run(); });
    })
    .then(function (log) {  //Now we just build the page and return it
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

// if busy, return with a message saying that it is busy and
