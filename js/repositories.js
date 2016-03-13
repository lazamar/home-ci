// ========================================================
//      Singleton to command repos
//      It takes care that there will always only be
//      one Repo object for each repository.
// ========================================================

var Repository = require('./repository');

function Repositories(reposPath) {
  if (!(this instanceof Repositories)) {
    return new Repositories(arguments[0]);
  }

  //Hash table of hash tables.
  //each key is a userName. Each userName key has an object of Repositories
  //indexed by repoName as values.
  var repos = {};
  var repositoriesPath = reposPath;

  /**
   * Fetches an existing Repository object or creates a new one.
   * @method get
   * @param  {String} repoName
   * @param  {String} userName
   * @return {Promise} will resolve into a Repository or into null
   */
  this.get = function get(userName, repoName) {

    //Constructor is a reserved property name
    if (repoName === 'constructor') {
      repoName = '_constructor';
    } else if (userName === 'constructor') {
      userName = '_constructor';
    }

    var newRepo = new Repository(userName, repoName, repositoriesPath);

    return newRepo.isValidGithubRepo()
    .then(function (isValid) {
      if (!isValid) { return null; }

      if (!repos[userName]) { repos[userName] = {}; }

      if (!repos[userName][repoName]) {
        repos[userName][repoName] = newRepo;
      }

      //NOTE: By default, whenever a repository is created, it will be cloned
      //if it hasn't been cloned yet.
      //NOTE 2: This may misbehave and return that a repository is busy when its
      // Repository instance is constructed. Check on that.
      var repo = repos[userName][repoName];
      repo.clone();

      return repos[userName][repoName];
    });
  };
}

module.exports = Repositories;
