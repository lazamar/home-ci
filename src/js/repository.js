
var Promise = require('promise');
var fetch = require('node-fetch');
var utils = require('./utils');
var runner = require('./runner');
var RepoTests = require('./repo-test');
var path = require('path');
var NodeGit = require('nodegit');
var GITHUB_TOKEN = require('./secrets').personalAccessToken;

/**
 * Each Repository instance represents one github repository
 * @class Repository
 * @param {Stirng} username
 * @param {String} repoName
 * @param {String} repositoriesPath
 */
function Repository(username, repoName, repositoriesPath) {
  // Check if invoked as constructor
  if (!(this instanceof Repository)) {
    return new Repository(username, repoName, repositoriesPath);
  }

  if (!username) {
    throw new Error('Repository: No "username" argument provided.');
  } else if (!repoName) {
    throw new Error('Repository: No "repository" argument provided.');
  } else if (!repositoriesPath) {
    throw new Error('Repository: No "repositoriesPath" argument provided.');
  }

  this.username = username;
  this.name = repoName;
  this.githubUrl = 'https://github.com/' + username + '/' + repoName + '.git';
  this.logsFolder = utils.joinPath(repositoriesPath, username, repoName + '-logs');
  this.folder = utils.joinPath(repositoriesPath, username, repoName); // Repository folder

  // Private variables
  var possibleStates = ['cloning', 'installing', 'pulling', 'testing', 'free'];
  var state = 'free';

  /**
   * The state will serve as a lock. Whenever a repository is in any stater
   * other than 'free' it will not be able to change to any state other than 'free'
   * @method _setState
   * @param {String} newState
   * @return {Boolean} whether the state was set or not.
   */
  this._setState = function _setState(newStateUnnormalised) {
    var newState = newStateUnnormalised.toLowerCase();
    if (possibleStates.indexOf(newState) < 0) {
      console.error('Repository._setState(): "' + newState + '" is not a valid state.');
      return false;
    } else if (state !== 'free' && newState !== 'free') {
      return false;
    }

    state = newState;
    return true;
  };

  this.getState = function getState() {
    return state;
  };

  // All test code is in here
  this.tests = new RepoTests(this);

  return this;
}

Repository.prototype.isFree = function isFree() {
  console.log('get state: ' + this.getState());
  return (this.getState() === 'free');
};

Repository.prototype.isValidGithubRepo = function isValidGithubRepo() {
  return fetch(this.githubUrl)
  .then(function t(response) {
    // Success
    if (response && response.status > 199 && response.status < 300) {
      return true;
    }

    return false;
  })
  .catch(function c() { return false; });
};

/**
 * Clones a git repository
 * @method clone
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
Repository.prototype.clone = function clone() {
  var stateSet = this._setState('cloning');
  if (!stateSet) { return Promise.reject('busy'); }

  var cloning;
  var alreadyCloned = utils.dirExistsSync(this.folder);
  if (alreadyCloned) {
    cloning = Promise.resolve();
  } else {
    // Variables for cloning
    var cloneOptions = {
      fetchOpts: {
        callbacks: {
          credentials: function () {
            return NodeGit.Cred.userpassPlaintextNew(GITHUB_TOKEN, 'x-oauth-basic');
          },
        },
      },
    };
    var cloneFolder = this.folder;
    var url = this.githubUrl;
    cloning = NodeGit.Clone(url, cloneFolder, cloneOptions) // eslint-disable-line
    console.log('cloning \t' + url);
  }

  var _this = this;
  return cloning
  .then(function () {
    return { exitStatus: 0, output: 'Cloned successfully.' };
  })
  .catch(function (err) {
    console.error('Error cloning ' + _this.name + ': ' + err);
    return { exitStatus: 1 };
  })
  .finally(function () { _this._setState('free'); });
};

/**
 * NOTE: The tests class use this method.
 * Run npm install
 * @method install
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
Repository.prototype.install = function install() {
  var packageJsonPath = path.format({ dir: this.folder, base: 'package.json' });
  var hasPackageJson = utils.fileExistsSync(packageJsonPath);
  if (!hasPackageJson) {
    return Promise.reject('No package.json found. Installation failed.');
  }

  var stateSet = this._setState('installing');
  if (!stateSet) { return Promise.reject('busy'); }

  var maxTime = 300000; // Five minutes
  var repoName = this.name;
  var repoFolder = this.folder;
  console.log('installing \t' + repoName);

  var process = runner('npm', ['install'], repoFolder, maxTime);
  var _this = this;

  process.on('message', function (msg) {
    _this.tests.liveLog._addLine(msg);
  });

  return process.promise
    .catch(function (err) {
      var output = 'Error installing ' + _this.name + ': ' + err;
      return { output: output, exitStatus: 1 };
    })
    .finally(function () { _this._setState('free'); });
};

/**
 * Deletes files downloaded from Github.
 * Does not delete log files
 * @method deleteFiles
 * @return {Promise} Will resolve in void or fail with an error.
 */
Repository.prototype.deleteFiles = function () {
  return utils.deleteDir(this.folder);
};

/**
 * Will clone if needed, run an install and then execute the tests.
 * @method run
 * @return {Promise} Will be resolved with a String containing either the test
 *                        	log or an error message.
 */
Repository.prototype.test = function test() {
  if (!this.isFree()) { return Promise.resolve('Busy'); }

  var output = '';
  var exitStatus = 0;

  // Prepare liveLog for action
  this.tests.liveLog._clear();

  var _this = this;
  return _this.clone()
    .then(function (res) {
      output += '\n' + res.output;
      exitStatus += res.exitStatus;
      if (exitStatus > 0) { return Promise.reject(res.output); }

      _this.tests.liveLog._addLine(output);
      return _this.install();
    })
    .then(function (res) {
      output += '\n' + res.output;
      exitStatus += res.exitStatus;
      if (exitStatus > 0) { return Promise.reject(res.output); }

      return _this.tests.run();
    })
    .then(function (res) {
      output += '\n' + res.output;
      exitStatus += res.exitStatus;
      if (exitStatus > 0) { return Promise.reject(res.output); }

      return Promise.resolve();
    })
    .catch(function (err) {
      output += '\n:: ERROR ::\n' + (err || '');
      exitStatus = 1;
    })
    .finally(function () {
      // save log
      var log = _this.tests.saveTest(output, exitStatus);
      // Now we delete all files downloaded from Github
      // _this.deleteFiles(); TODO: Uncomment this line

      return log;
    });
};

module.exports = Repository;
