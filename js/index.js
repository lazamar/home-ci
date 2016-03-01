// ------------------------------------------------------------------------
// Server code
// ------------------------------------------------------------------------

//Lets require/import the HTTP module
var http = require('http');
var ansi_up = require('ansi_up'); //ANSI to coloured HTML
var runner = require('./runner'); //Process runner
var fetch = require('node-fetch');
var fs = require('fs');
var Promise = require('promise');
var projectRoot = process.cwd();
var repositoriesPath = projectRoot + '/repositories/';

//Lets define a port we want to listen to
var PORT = 4000;

var validate = (function () {
  var users = [
    'lazamar',
    'fourlabsldn'
  ];

  var userNameRegex = /\/([-\w]*)/;
  var repositoryRegex = /^\/[-\w]+\/?([-\w]+)$/;
  return {
    user: function (url) {
      var userName = url.match(userNameRegex) || [];
      return userName[1];
    },

    repository: function (url) {
      var rep = url.match(repositoryRegex) || [];
      return rep[1];
    },

    // githubAddr: function (url) {
    //   return fetch('https://github.com' + url, { method: 'get' })
    //     .then(function (res) {
    //       if (res.status < 200 || res.status > 299) {
    //         return Promise.resolve(false);
    //       }
    //
    //       return Promise.resolve(true);
    //     });
    // }
  };
}());

function downloadRepo(url) {
  console.log('downloadRepo');
  return runner('git', ['clone', 'https://github.com' + url + '.git'], repositoriesPath);
}

function install(repo) {
  console.log('install');
  return runner('npm', ['install'], repositoriesPath + repo);
}

function pull(repo) {
  console.log('pull');
  return runner('git', ['pull'], repositoriesPath + repo);
}

function loadTestLog(repo) {
  console.log('loadTestLog');

  return new Promise(function (resolve, reject) {
    fs.readFile(repositoriesPath + repo + '.log', function (err, data) {
      if (err) {
        reject('File not found.');
      } else {
        resolve(data);
      }
    });
  });
}

function runTest(repo) {
  console.log('runTest');

  return runner('npm', ['test'], repositoriesPath + repo)
  .then(function (res) {
    return new Promise(function (resolve, reject) {
      // Create log header
      var log = '';
      log += '<h1>';
      log += (res.exitStatus > 0) ? 'Test failed' : 'Test passed';
      log += '</h1><br/>';

      //Prettify terminal log;
      log += ansi_up.ansi_to_html(res.output.replace(/(\n+)/g, ' <br/> '));

      //Write log to file
      fs.writeFile(repositoriesPath + repo + '.log', log, function (err) {
        if (err) {
          resolve(false);
        } else {
          resolve(log);
        }
      });
    });
  });
}

//We need a function which handles requests and send response
function handleRequest(request, response) {
  var user = validate.user(request.url);
  var repo = validate.repository(request.url);

  if (!user) {
    return response.end('Invalid git user');
  } else if (!repo) {
    return response.end('Invalid URL');
  }

  var folders = fs.readdirSync(repositoriesPath);

  //HTML header
  response.write('<!DOCTYPE html><head><link  rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/jasonm23/markdown-css-themes/gh-pages/swiss.css"></link><meta charset="UTF-8"><title>Home-CLI</title></head><body>');

  if (folders.indexOf(repo) >= 0) { //Repository is downloaded
    runTest(repo)
    .then(function () {
      return loadTestLog(repo);
    })
    .then(function (log) {
      response.write(log);
    })
    .catch(function (err) {
      response.write('An error occurred:');
      response.write(err);
    })
    .finally(function () {
      return response.end();
    });
  } else { //repository needs to be downloaded
    downloadRepo(request.url)
    .then(function () {
      return runTest(repo);
    })
    .then(function () {
      return install(repo);
    })
    .then(function () {
      return runTest(repo);
    })
    .then(function (log) {
      response.write(log);
    })
    .catch(function (err) {
      response.write('An error occurred:');
      response.write(err);
    })
    .finally(function () {
      return response.end();
    });
  }

}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
