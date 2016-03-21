
var fs = require('fs');
var utils = require('./utils');
var Promise = require('promise');
var path = require('path');
var Repositories = require('./repositories');

/**
 *  Singleton Controller
 */
function Controller() {
  if (!(this instanceof Controller)) {
    return new Controller();
  }

  //Constants
  const PROJECT_ROOT = path.join(__dirname, '..');
  const REPOSITORIES_PATH = path.join(PROJECT_ROOT, 'repositories/');
  const AUTHORISED_USERS = [
    'lazamar',
    'fourlabsldn',
    'foaly-nr1'
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
    var rawPage; //will be a promise

    if (!user) {
      rawPage = Promise.resolve('Invalid git user');
    } else if (!repoName) {
      rawPage = Promise.resolve('Invalid URL');
    } else if (!authorised) {
      rawPage = Promise.resolve('Username not authorised');
    } else {
      rawPage = repositories.get(user, repoName)
      .then(function (repo) {
        if (typeof repo !== 'object') {
          throw new Error('Invalid Object returned by Repositories.get()');
        }

        if (!repo.isFree()) { return 'Busy ' + repo.getState(); }

        return repo.tests.getLastLog()
        .then(function (log) {
          if (log) { return log; }//Return log for page to be constructed.

          //test log not found, so let's run a test
          //and give an appropriate answer while it executes.
          repo.test();

          return 'Busy ' + repo.getState();
        });
      })
      .catch(function (err) {
        console.error(err);
        return err;
      });
    }

    //Now we just build the page and return it
    return rawPage.then(function (log) {
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
