
var Promise = require('promise');
var fetch = require('node-fetch');
var utils = require('./utils');
var runner = require('./runner'); //Process runner
var RepoTests = require('./repo-test');

/**
 * Each Repository instance represents one github repository
 * @class Repository
 * @param {Stirng} username
 * @param {String} repoName
 * @param {String} repositoriesPath
 */
function Repository(username, repoName, repositoriesPath) {

  //Check if invoked as constructor
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

  this.repositoriesPath = repositoriesPath;
  this.username = username;
  this.name = repoName;
  this.githubUrl = 'https://github.com/' + username + '/' + repoName + '.git';
  this.logsFolder = repositoriesPath + repoName + '/logs/';
  this.folder = repositoriesPath + repoName; //Repository folder

  var possibleStates = ['cloning', 'installing', 'pulling', 'testing', 'free'];
  var state = 'free';

  /**
   * The state will serve as a lock. Whenever a repository is in any stater
   * other than 'free' it will not be able to change to any state other than 'free'
   * @method _setState
   * @param {String} newState
   * @return {Boolean} whether the state was set or not.
   */
  this._setState = function _setState(newState) {
    newState = newState.toLowerCase();
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
  .then(function (response) {
    if (response && response.status > 199 && response.status < 300) { //Success
      return true;
    } else {
      return false;
    }
  })
  .catch(function () { return false; });
};

/**
 * Clones a git repository
 * @method clone
 * @return {Promise} will be resolved to a String with the terminal output.
 */
Repository.prototype.clone = function clone() {
  var alreadyCloned = utils.dirExistsSync(this.folder);
  if (alreadyCloned) { return Promise.resolve(); }

  var stateSet = this._setState('cloning');
  if (!stateSet) { return Promise.reject('busy'); }

  var repositoriesPath = this.repositoriesPath;
  var url = this.githubUrl;

  console.log('cloning \t' + url);

  var _this = this;
  return runner('git', ['clone', url], repositoriesPath)
    .finally(function () { _this._setState('free'); });
};

/**
 * Pulls git repository
 * @method pull
 * @return {Promise} resolves into a String with terminal output
 */
Repository.prototype.pull = function pull() {
  var stateSet = this._setState('pulling');
  if (!stateSet) { return Promise.reject('busy'); }

  var repoFolder = this.folder;
  var repoName = this.name;
  console.log('pulling \t' + repoName);

  var _this = this;
  return runner('git', ['pull'], repoFolder)
    .finally(function () { _this._setState('free'); });
};

/**
 * Run npm install
 * @method install
 * @return {Promise} resolves into a String with terminal output
 */
Repository.prototype.install = function install() {
  var stateSet = this._setState('installing');
  if (!stateSet) { return Promise.reject('busy'); }

  var repoName = this.name;
  var repoFolder = this.folder;

  var _this = this;
  console.log('installing \t' + repoName);
  return runner('npm', ['install'], repoFolder)
    .finally(function () {
      _this._setState('free');
    });
};

module.exports = Repository;
