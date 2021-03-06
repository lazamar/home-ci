var utils = require('./utils');
var runner = require('./runner');
var LiveLog = require('./livelog');
var path = require('path');
var Promise = require('promise');
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
  this.liveLog = new LiveLog;
  return this;
}


/**
 * Whether the current repository is passing the tests or not.
 * It returns a promise which will be resolved into a boolean value.
 * If there are no tests the result will be false
 * @method isPassing
 * @return {Promise[Boolean]}
 */
RepoTests.prototype.isPassing = function isPassing() {
  return this.getLastLog()
  .then(function (log) {
    if (!log) { return false; }
    return log.success;
  });
};

// --------------------------------------------------------------
//                    GETTING LOGS
// --------------------------------------------------------------

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
 * Loads a log object from a file.
 * @method getLogFromFile
 * @param  {String} fileName Name of test file to be read
 * @return {Promise}          Will resolve into a log object or rejected
 */
RepoTests.prototype.getLogFromFile = function getLogFromFile(fileName) {
  if (!fileName) { return Promise.resolve(null); }

  var logsFolder = this.repo.logsFolder;
  var testPath = path.format({ dir: logsFolder, base: fileName });

  return utils.readFile(testPath)
  .then(function (jsonString) {
    return JSON.parse(jsonString);
  })
  .catch(function () { return null; });
};

/**
 * Gets last test's content.
 * @method lastLog
 * @return {Promise} Resoves an Object if there is a test and to null otherwise.
 */
RepoTests.prototype.getLastLog = function getLastLog() {
  var testFileNames = this.getFileNames();
  var lastTest = testFileNames.pop();

  return this.getLogFromFile(lastTest);
};

/**
 * Returns a Promise to be resolved into an Array of Strings containing
 * test logs chronologically ordered.
 * @method allLogs
 * @return {Promise} Which will be resolved in an Array[Object].
 */
RepoTests.prototype.getAllLogs = function getAllLogs() {
  var testFileNames = this.getFileNames();
  var testLogs = [];

  testFileNames.forEach(function (fileName, i) {
    testLogs[i] = this.getLogFromFile(fileName);
  });

  return Promise.all(testLogs);
};

// --------------------------------------------------------------
//                    RUNNING TESTS
// --------------------------------------------------------------

/**
 * Will run npm test in the repository
 * @method run
 * @return {Promise} will be resolved in an object with output and exitStatus
 */
RepoTests.prototype.run = function run() {
  var stateSet = this.repo._setState('testing');
  if (!stateSet) { return Promise.reject('busy'); }
  console.log('Running test for ' + this.repo.name);

  var process = runner('npm', ['test'], this.repo.folder);
  var _this = this;

  process.on('message', function (msg) {
    _this.liveLog._addLine(msg);
  });

  return process.promise
    .catch(function (err) {
      var output = 'Error running test in ' + _this.repo.name + ': ' + err;
      console.error(output);
      return { output: output, exitStatus: 1 };
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

  // Stringify with 2 spaces padding.
  var log = JSON.stringify(logObj, null, 2);
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

  // Find log number
  var lastTestNo = this.getNumberOfLast() || 0;
  var newTestNo = lastTestNo + 1;

  // Write log to file
  var logsFolder = this.repo.logsFolder;
  var testName = 'test-' + newTestNo + '.json';
  var fullPath = path.format({ dir: logsFolder, base: testName });

  utils.writeFile(fullPath, log);
  return log;
};

module.exports = RepoTests;
