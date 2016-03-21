
var Promise = require('promise');
var fetch = require('node-fetch');
var utils = require('./utils');
var runner = require('./runner'); //Process runner
var RepoTests = require('./repo-test');
var NodeGit = require('nodegit');
var secrets = require('./secrets');
var GITHUB_TOKEN = secrets.personalAccessToken;

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
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
Repository.prototype.clone = function clone() {

  var alreadyCloned = utils.dirExistsSync(this.folder);
  if (alreadyCloned) { return Promise.resolve(); }

  var stateSet = this._setState('cloning');
  if (!stateSet) { return Promise.reject('busy'); }

  //Nodegit specific stuff.
  var cloneOptions = {
    fetchOpts: {
      callbacks: {
        certificateCheck: function () { return 1; },

        credentials: function () {
          return NodeGit.Cred.userpassPlaintextNew(GITHUB_TOKEN, 'x-oauth-basic');
        }
      }
    }
  };
  var repositoriesPath = this.repositoriesPath;
  var url = this.githubUrl;
  var _this = this;
  var cloning = NodeGit.Clone(url, repositoriesPath, cloneOptions)
    .then(function (repository) {
      var res = {};
      res.output = 'Cloned successfully.';
      res.exitStatus = 0;
      return res;
    })
    .catch(function (err) {
      console.error('Error cloning ' + _this.name + ': ' + err);
      return { exitStatus: 1 };
    })
    .finally(function () { _this._setState('free'); });

  console.log('cloning \t' + url);
  return cloning;
};

/**
 * Pulls git repository
 * @method pull
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
Repository.prototype.pull = function pull() {
  var stateSet = this._setState('pulling');
  if (!stateSet) { return Promise.reject('busy'); }

  var repoFolder = this.folder;
  var repoName = this.name;
  console.log('pulling \t' + repoName);

  var _this = this;
  return runner('git', ['pull'], repoFolder)
    .catch(function (err) {
      console.error('Error pulling ' + _this.name + ': ' + err);
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
  var stateSet = this._setState('installing');
  if (!stateSet) { return Promise.reject('busy'); }

  var repoName = this.name;
  var repoFolder = this.folder;

  var _this = this;
  console.log('installing \t' + repoName);
  return runner('npm', ['install'], repoFolder)
    .catch(function (err) {
      console.error('Error installing ' + _this.name + ': ' + err);
    })
    .finally(function () { _this._setState('free'); });
};

/**
 * Will run an install and then execute the tests.
 * @method run
 * @return {Promise} Will be resolved with a String containing either the test
 *                        	log or an error message.
 */
Repository.prototype.test = function test() {
  var _this = this;
  var installResponse;
  var testResponse;

  _this.install()
    .then(function (res) {
      if (!res) { return; }

      installResponse = res;
      return (installResponse.exitStatus === 0) ? _this.tests.run() : null;
    })
    .then(function (res) {
      if (!installResponse) { return; } //Program error in install

      testResponse = res;
      var output = installResponse.output;
      output += (testResponse) ? '\n' + testResponse.output : '';
      var exitStatus = (testResponse) ? testResponse.exitStatus : installResponse.exitStatus;

      //save log
      return _this.tests.saveTest(output, exitStatus);
    });
};

module.exports = Repository;
