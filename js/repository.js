
var Promise = require('promise');
var utils = require('./utils');
var runner = require('./runner'); //Process runner

function Repository(username, repo, repositoriesPath) {

  //Check if invoked as constructor
  if (!(this instanceof Repository)) {
    return new Repository(username, repo, repositoriesPath);
  }

  if (!username) {
    throw new Error('Repo: No "username" argument provided.');
  } else if (!repo) {
    throw new Error('Repo: No "repository" argument provided.');
  } else if (!repositoriesPath) {
    throw new Error('Repo: No "repositoriesPath" argument provided.');
  }

  this.getUsername = function getUsername() {
    return username;
  };

  this.getRepo = function getRepo() {
    return repo;
  };

  this.getRepositoriesPath = function getRepositoriesPath() {
    return repositoriesPath;
  };

  return this;
}

Repository.prototype.clone = function clone() {
  var username = this.getUsername();
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();
  var url = 'https://github.com/' + username + '/' + repo + '.git';

  console.log('cloning \t' + repo);
  return runner('git', ['clone', url], repositoriesPath);
};

Repository.prototype.pull = function pull() {
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();

  console.log('pulling \t' + repo);
  return runner('git', ['pull'], repositoriesPath + repo);
};

Repository.prototype.install = function install() {
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();

  console.log('installing \t' + repo);
  return runner('npm', ['install'], repositoriesPath + repo);
};

// ---------------------------------
//    TESTS
// ---------------------------------

// RETRIEVING TESTS //

//If last test was test12.log, it returns 12.
Repository.prototype.lastTestNumber = function lastTestNumber() {
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repo + '/logs/') || [];
  if (testFileNames.length > 0) { testFileNames.sort(utils.compareFileNames); }

  var lastTest = testFileNames.pop();
  return utils.getFileNumber(lastTest);
};

//Loads the most recent test log.
Repository.prototype.lastTest = function lastTest() {
  console.log('lastTest');
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repo + '/logs/') || [];
  testFileNames.sort(utils.compareFileNames);

  var lastTest = testFileNames.pop();
  if (lastTest) {
    return utils.readFile(repositoriesPath + repo + '/logs/' + lastTest);
  } else {
    return Promise.resolve(null);
  }
};

Repository.prototype.allTests = function allTests() {
  console.log('loadTestLog');
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();

  var testFileNames = utils.readDirectory(repositoriesPath + repo + '/logs/') || [];
  testFileNames.sort(utils.compareFileNames);

  var tests = [];
  for (var i = testFileNames.length; i >= 0; i--) {
    tests[i] = utils.readFileSync(repositoriesPath + repo + '/logs/' + testFileNames[i]);
  }

  return tests;
};

// RUNNING TESTS //

Repository.prototype.runTest = function runTest() {
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();
  var _this = this;

  console.log('runTest');
  return runner('npm', ['test'], repositoriesPath + repo)
    .then(function (res) {
      _this.saveTest(res.output, res.exitStatus);
    })
    .catch(function (err) {
      console.error('Error running test: ' + err);
    });
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
  var repo = this.getRepo();
  var repositoriesPath = this.getRepositoriesPath();
  var testName = 'test-' + newTestNo + '.log';
  var fullPath = repositoriesPath + repo + '/logs/' + testName;

  utils.writeFile(fullPath, log);
  return log;
};

module.exports = Repository;
