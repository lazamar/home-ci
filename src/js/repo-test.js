var utils = require('./utils');
var runner = require('./runner');
var path = require('path');

// This is under Repository.tests
/**
 * @class RepoTests
 * @param {Repository} repo
 */
function RepoTests(repo) {
  if (!(this instanceof RepoTests)) {
    return new RepoTests();
  }

  this.repo = repo;
}

/**
 * If the file for the last test is test12.log, it returns 12.
 * @method getNumberOfLast
 * @return {int} or null, if there are no tests.
 */
RepoTests.prototype.getNumberOfLast = function getNumberOfLast() {
  var logsFolder = this.repo.logsFolder;

  var testFileNames = utils.readDirectory(logsFolder) || [];
  if (testFileNames.length > 0) { testFileNames.sort(utils.compareFileNames); }

  var lastTest = testFileNames.pop();
  return utils.getFileNumber(lastTest);
};

/**
 * Returns an Array of test file names ordered by their number.
 * @method fileNames
 * @return {Array[String]}
 */
RepoTests.prototype.getFileNames = function getFileNames() {
  var logsFolder = this.repo.logsFolder;

  var testFileNames = utils.readDirectory(logsFolder) || [];
  if (testFileNames.length > 0) { testFileNames.sort(utils.compareFileNames); }

  return testFileNames;
};

/**
 * Gets last test's content.
 * @method lastLog
 * @return {Promise} Resoves to String if there is a test and to null otherwise.
 */
RepoTests.prototype.getLastLog = function getLastLog() {
  console.log('Getting last test for' + this.repo.name);
  var testFileNames = this.getFileNames();
  var lastTest = testFileNames.pop();

  if (lastTest) {
    var logsFolder = this.repo.logsFolder;
    var testPath = path.format({ dir: logsFolder, base: lastTest });
    return utils.readFile(testPath);
  } else {
    return Promise.resolve(null);
  }
};

/**
 * Returns an Array of Strings containing test logs chronologically ordered.
 * @method allLogs
 * @return {Array[String]}
 */
RepoTests.prototype.getAllLogs = function getAllLogs() {
  console.log('Loading all test logs for ' + this.repo.name);
  var testFileNames = this.getFileNames();
  var logsFolder = this.repo.logsFolder;
  var testLogs = [];
  var testPath;

  for (var i = 0; i < testFileNames.length; i++) {
    testPath = path.format({ dir: logsFolder, base: testFileNames[i] });
    testLogs[i] = utils.readFileSync(testPath);
  }

  return testLogs;
};

// RUNNING TESTS //
/**
 * Will run npm test in the repository
 * @method run
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
RepoTests.prototype.run = function run() {
  var stateSet = this.repo._setState('testing');
  if (!stateSet) { return Promise.reject('busy'); }

  var _this = this;

  console.log('Running test for ' + this.repo.name);
  return runner('npm', ['test'], this.repo.folder)
    .catch(function (err) {
      console.error('Error running test in ' + _this.repo.name + ': ' + err);
    })
    .finally(function () { _this.repo._setState('free'); });
};

/**
 * Format a test log
 * @method formatTestLog
 * @param  {String} content
 * @param  {int} exitStatus
 * @return {String}            The formatted log
 */
RepoTests.prototype.formatTestLog = function formatTestLog(content, exitStatus) {
  // Prettify terminal log;
  var prettyOutput = utils.terminalToHTML(content);

  var logObj = {};
  logObj.output = prettyOutput;
  logObj.exitStatus = exitStatus;
  logObj.success = (exitStatus === 0);

  var log = JSON.stringify(logObj);
  return log;
};

/**
 * Write a test log formatter into a file
 * @method saveTest
 * @param  {String} content
 * @param  {int} exitStatus
 * @return {Strings}            The saved log
 */
RepoTests.prototype.saveTest = function saveTest(content, exitStatus) {
  console.log('saving test');
  var log = this.formatTestLog(content, exitStatus);

  //Find log number
  var lastTestNo = this.getNumberOfLast() || 0;
  var newTestNo = lastTestNo + 1;

  //Write log to file
  var logsFolder = this.repo.logsFolder;
  var testName = 'test-' + newTestNo + '.log';
  var fullPath = path.format({ dir: logsFolder, base: testName });

  utils.writeFile(fullPath, log);
  return log;
};

module.exports = RepoTests;
