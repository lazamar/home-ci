
var Promise = require('promise');
var utils = require('./utils');
var runner = require('./runner'); //Process runner

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

// ---------------------------------
//    TESTS
// ---------------------------------

// RETRIEVING TESTS //

//If last test was test12.log, it returns 12.
Repository.prototype.lastTestNumber = function lastTestNumber() {
  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repoName + '/logs/') || [];
  if (testFileNames.length > 0) { testFileNames.sort(utils.compareFileNames); }

  var lastTest = testFileNames.pop();
  return utils.getFileNumber(lastTest);
};

//Loads the most recent test log.
Repository.prototype.lastTest = function lastTest() {
  console.log('lastTest');
  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repoName + '/logs/') || [];
  testFileNames.sort(utils.compareFileNames);

  var lastTest = testFileNames.pop();
  if (lastTest) {
    return utils.readFile(repositoriesPath + repoName + '/logs/' + lastTest);
  } else {
    return Promise.resolve(null);
  }
};

Repository.prototype.allTests = function allTests() {
  console.log('loadTestLog');
  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repoName + '/logs/') || [];
  testFileNames.sort(utils.compareFileNames);

  var tests = [];
  for (var i = testFileNames.length; i >= 0; i--) {
    tests[i] = utils.readFileSync(repositoriesPath + repoName + '/logs/' + testFileNames[i]);
  }

  return tests;
};

// RUNNING TESTS //

Repository.prototype.runTest = function runTest() {
  if (!this.isFree()) { return Promise.reject('busy'); }

  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();
  var _this = this;

  console.log('Running test for ' + repoName);
  this._setState('testing');
  return runner('npm', ['test'], repositoriesPath + repoName)
    .then(function (res) {
      _this.saveTest(res.output, res.exitStatus);
    })
    .catch(function (err) {
      console.error('Error running test: ' + err);
    })
    .finally(function () { this._setState('free'); });
};

Repository.prototype.formatTest = function formatTest(content, exitStatus) {
  //Prettify terminal log;
  var log = utils.terminalToHTML(content);
  log += 'Exit status: ' + exitStatus;
  return log;
};

Repository.prototype.saveTest = function saveTest(content, exitStatus) {
  console.log('saving test');
  var log = this.formatTest(content, exitStatus);

  //Find log number
  var lastTestNo = this.lastTestNumber() || 0;
  var newTestNo = lastTestNo + 1;

  //Write log to file
  var repoName = this.getRepoName();
  var repositoriesPath = this.getRepositoriesPath();
  var testName = 'test-' + newTestNo + '.log';
  var fullPath = repositoriesPath + repoName + '/logs/' + testName;

  utils.writeFile(fullPath, log);
  return log;
};

module.exports = Repository;
