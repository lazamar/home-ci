var utils = require('./utils');
var Promise = require('promise'); //jshint ignore: line
var Repositories = require('./repositories');

/**
 *  Singleton Controller
 */
function Controller() {
  if (!(this instanceof Controller)) {
    return new Controller();
  }

  //Constants
  const PROJECT_ROOT = utils.joinPath(__dirname, '..', '..');
  const REPOSITORIES_PATH = utils.joinPath(PROJECT_ROOT, 'repositories/');
  const AUTHORISED_USERS = [
    'lazamar',
    'fourlabsldn',
    'foaly-nr1'
  ];

  var repositories = new Repositories(REPOSITORIES_PATH);

  function isAuthorisedUser(user) {
    return (AUTHORISED_USERS.indexOf(user) >= 0);
  }

  function validateUserAndRepo(user, repoName) {
    var authorised = isAuthorisedUser(user);
    var err = null;

    if (!user) {
      err = 'Invalid git user';
    } else if (!repoName) {
      err = 'Invalid URL';
    } else if (!authorised) {
      err = 'Username not authorised';
    }

    return err;
  }

  /**
   * Creates an HTML page and returns it.
   * @method getRepoPage
   * @param  {String} user
   * @param  {String} repoName
   * @return {Promise}          Resolves to a string with the repo's HTML page.
   */
  this.getRepoPage = function getRepoPage(user, repoName) {
    var validationError = validateUserAndRepo(user, repoName);
    if (validationError) {
      return utils.buildTemplate({
        username: user,
        repo: repoName,
        content: validationError,
        success: false,
      });
    }

    var repo;
    var rawPage = repositories.get(user, repoName)
    .then(function (repoFound) {
      if (typeof repoFound !== 'object') {
        throw new Error('Invalid Object returned by Repositories.get()');
      }

      repo = repoFound;
      if (!repo.isFree()) { return null; }

      return repo.tests.getLastLog();
    })
    .then(function (log) {
      if (!log) {
        // test log not found, so let's run a test and update the state.
        repo.test();
      }

      return log; // Return log for page to be constructed or null.
    })
    .catch(function (err) {
      console.error(err);
      return { content: err, success: false };
    });

    // Now we just build the page and return it
    return rawPage.then(function (retrievedLog) {
      var log = retrievedLog || {};
      return utils.buildTemplate({
        username: user,
        repo: repoName,
        code: '',
        content: log.output,
        success: log.success,
        state: repo ? repo.getState() : null,
      });
    });
  };

  this.webhookEvent = function webhookEvent(eventName, user, repoName) {
    // NOTE: for now we run a test for all events.
    var err = validateUserAndRepo(user, repoName);
    if (err) { return 'Invalid credentials'; }

    repositories.get(user, repoName)
    .then(function (repo) {
      if (typeof repo !== 'object') {
        throw new Error('Invalid Object returned by Repositories.get()');
      }

      // TODO: have an execution queue if it is not free.
      if (repo.isFree()) {
        repo.test();
        console.log('Testing ' + repo.name + ' from webhook call.');
      }
    });

    return 'Webhook event recorded';
  };

  this.getStatusObject = function getStatusObject(user, repoName) {
    var err = validateUserAndRepo(user, repoName);
    if (err) { return Promise.reject(err); }

    return repositories.get(user, repoName)
    .then(function (repo) {
      if (typeof repo !== 'object') {
        throw new Error('Invalid Object returned by Repositories.get()');
      }

      var status = {
        state: repo.getState(),
        success: repo.isPassingTests(),
      };

      return status;
    });
  };
}

module.exports = Controller;

// if busy, return with a message saying that it is busy and
