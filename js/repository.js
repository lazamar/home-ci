
var Promise = require('promise');
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

  this.getUsername = function getUsername() {
    return username;
  };

  this.getRepoName = function getRepoName() {
    return repoName;
  };

  this.getRepositoriesPath = function getRepositoriesPath() {
    return repositoriesPath;
  };

  var possibleStates = ['cloning', 'installing', 'pulling', 'testing', 'free'];
  var state = 'free';

  this.getState = function getState() {
    return state;
  };

  /**
   * @method _setState
   * @param {String} newState
   * @return {Boolean} whether the state was set or not.
   */
  this._setState = function _setState(newState) {
    newState = newState.toLowerCase();
    if (possibleStates.indexOf(newState) < 0) {
      console.error('Repository._setState(): "' + newState + '" is not a valid state.');
      return false;
    }

    state = newState;
    return true;
  };

  // All test code is in here
  this.tests = new RepoTests(this);
  return this;
}

Repository.prototype.isFree = function isFree() {
  return (this.getState() === 'free');
};

Repository.prototype.getGithubUrl = function getGithubUrl() {
  var username = this.getUsername();
  var repoName = this.getRepoName();
  return 'https://github.com/' + username + '/' + repoName + '.git';
};

Repository.prototype.getLogFolderAddress = function getLogFolderAddress() {
  var repositoriesPath = this.getRepositoriesPath();
  var repoName = this.getRepoName();
  return repositoriesPath + repoName + '/logs/';
};

/**
 * Clones a git repository
 * @method clone
 * @return {Promise}
 */
Repository.prototype.clone = function clone() {
  if (!this.isFree()) { return Promise.reject('busy'); }

  var repositoriesPath = this.getRepositoriesPath();
  var url = this.getGithubUrl();

  console.log('cloning \t' + url);

  this._setState('cloning');
  return runner('git', ['clone', url], repositoriesPath)
    .finally(function () { this._setState('free'); });
};

Repository.prototype.pull = function pull() {
  if (!this.isFree()) { return Promise.reject('busy'); }

  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();

  console.log('pulling \t' + repoName);

  this._setState('pulling');
  return runner('git', ['pull'], repositoriesPath + repoName)
    .finally(function () { this._setState('free'); });
};

Repository.prototype.install = function install() {
  if (!this.isFree()) { return Promise.reject('busy'); }

  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();

  console.log('installing \t' + repoName);
  this._setState('installing');
  return runner('npm', ['install'], repositoriesPath + repoName)
  .finally(function () { this._setState('free'); });
};

module.exports = Repository;
