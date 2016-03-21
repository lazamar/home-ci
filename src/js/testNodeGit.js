var NodeGit = require('nodegit');
var secrets = require('./secrets');

var GITHUB_TOKEN = secrets.personalAccessToken;

var cloneURL = 'https://github.com/foaly-nr1/DJDHive';

var localPath = require('path').join(__dirname, 'tmp');

var cloneOptions = {};
cloneOptions.fetchOpts = {
  callbacks: {
    certificateCheck: function () {
      return 1;
    },

    credentials: function () {
      return NodeGit.Cred.userpassPlaintextNew(GITHUB_TOKEN, 'x-oauth-basic');
    }
  }
};

var cloneRepository = NodeGit.Clone(cloneURL, localPath, cloneOptions);
cloneRepository.then(function (repository) {
    // Access any repository methods here.
    console.log('Is the repository bare? %s', Boolean(repository.isBare()));
  })
  .catch(function (err) {
    console.log('ERROR: ' + err);
  });
