
var Promise = require('promise');
var utils = require('./utils');
var runner = require('./runner'); //Process runner

module.exports = function Repository(username, repo, repositoriesPath) {

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

  function lastTestNo(repo, repositoriesPath) {
    var tests = utils.readDirectory(repositoriesPath + repo + '/logs/') || [];
    var testName;
    var testNo;
    var highestNo;

    while (tests.length) {
      testName = tests.pop();
      testNo = testName.match(/([0-9]+)(\.log)$/) || [];
      testNo = testNo[1];
      highestNo = (highestNo > testNo) ? highestNo : testNo;
    }

    return highestNo || 0;
  }

  function clone(username, repo, repositoriesPath) {
    console.log('downloadRepo');
    return runner('git', ['clone', 'https://github.com/' + username + '/' + repo + '.git'], repositoriesPath);
  }

  function install(repo, repositoriesPath) {
    console.log('install');
    return runner('npm', ['install'], repositoriesPath + repo);
  }

  function pull(repo, repositoriesPath) {
    console.log('pull');
    return runner('git', ['pull'], repositoriesPath + repo);
  }

  function loadTestLog(repo, repositoriesPath) {
    console.log('loadTestLog');
    var testNo = lastTestNo(repo, repositoriesPath);
    if (testNo > 0) {
      var testName = 'test-' + testNo + '.log';
      return utils.readFile(repositoriesPath + repo + '/logs/' + testName);
    } else {
      return Promise.resolve(null);
    }
  }

  function runTest(repo, repositoriesPath) {
    console.log('runTest');
    return runner('npm', ['test'], repositoriesPath + repo)
    .then(function (res) {
      // Create log header
      var log = '<h1>';
      log += (res.exitStatus > 0) ? 'Test failed' : 'Test passed';
      log += '</h1><br/>';

      //Prettify terminal log;
      log += utils.terminalToHTML(res.output);
      log += '<hr/>';

      //Find log number
      var logsFolder = repositoriesPath + repo + '/logs/';
      var logs = utils.readDirectory(repositoriesPath) || [];
      var testNo = logs.length + 1;

      //Write log to file
      var testName = 'test-' + (lastTestNo(repo, repositoriesPath) + 1) + '.log';
      return utils.writeFile(logsFolder + 'test-' + testNo + '.log', log);
    });
  }

  //Public interface
  this.download = function () { return clone(username, repo, repositoriesPath); };

  this.install = function () { return install(repo, repositoriesPath); };

  this.pull = function () { return pull(repo, repositoriesPath); };

  this.loadTestLog = function () { return loadTestLog(repo, repositoriesPath); };

  this.runTest = function () { return runTest(repo, repositoriesPath); };

  return this;
};
