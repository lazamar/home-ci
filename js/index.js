// ------------------------------------------------------------------------
// Server code
// ------------------------------------------------------------------------

//Lets require/import the HTTP module
var http = require('http');
var runner = require('./runner'); //Process runner
var fetch = require('node-fetch');
var Promise = require('promise');
var utils = require('./utils');
var projectRoot = process.cwd() + '/';
var repositoriesPath = projectRoot + 'repositories/';

//Lets define a port we want to listen to
var PORT = 4000;

function downloadRepo(username, repo) {
  console.log('downloadRepo');
  return runner('git', ['clone', 'https://github.com/' + username + '/' + repo + '.git'], repositoriesPath);
}

function install(repo) {
  console.log('install');
  return runner('npm', ['install'], repositoriesPath + repo);
}

function pull(repo) {
  console.log('pull');
  return runner('git', ['pull'], repositoriesPath + repo);
}

function lastTestNo(repo) {
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

function loadTestLog(repo) {
  console.log('loadTestLog');
  var testNo = lastTestNo(repo);
  if (testNo > 0) {
    var testName = 'test-' + testNo + '.log';
    return utils.readFile(repositoriesPath + repo + '/logs/' + testName);
  } else {
    return Promise.resolve(null);
  }
}

function runTest(repo) {
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
    var testName = 'test-' + (lastTestNo(repo) + 1) + '.log';
    return utils.writeFile(logsFolder + 'test-' + testNo + '.log', log);
  });
}

//We need a function which handles requests and send response
function handleRequest(request, response) {
  var user = utils.parse.user(request.url);
  var repo = utils.parse.repository(request.url);
  var validUser = utils.validate.user(user);

  if (!user) {
    return response.end('Invalid git user');
  } else if (!repo) {
    return response.end('Invalid URL');
  } else if (!validUser) {
    return response.end('Username not authorised');
  }

  var folders = utils.readDirectory(repositoriesPath) || [];
  var handling; //this will be a promise
  if (folders.indexOf(repo) >= 0 &&
      utils.readDirectory(repositoriesPath + repo + '/logs')) { //Repository is downloaded
    handling = loadTestLog(repo);
  } else { //repository needs to be downloaded
    handling = downloadRepo(user, repo)
    .then(function () {
      return runTest(repo);
    })
    .then(function () {
      return install(repo);
    })
    .then(function () {
      return runTest(repo);
    });
  }

  handling.then(function (log) {
    return utils.buildTemplate({
      username: user,
      repo: repo,
      code: '',
      content: log,
    });
  })
  .then(function (template) {
    response.write(template);
  })
  .catch(function (err) {
    response.write('An error occurred:');
    response.write(err);
  })
  .finally(function () {
    return response.end();
  });

}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
