// ========================================================
//      Singleton to command repos
//      It takes care that there will always only be
//      one Repo object for each repository.
//      When a repository is requested, it checks it is
//      a valid repo.
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

    //Return existing object.
    if (repos[userName] && repos[userName][repoName]) {
      return Promise.resolve(repos[userName][repoName]);
    }

    //Create new one.
    var newRepo = new Repository(userName, repoName, repositoriesPath);

    return newRepo.isValidGithubRepo()
    .then(function (isValid) {
      if (!isValid) { throw new Error('Invalid git repository'); }

      if (!repos[userName]) { repos[userName] = {}; }

      //We have to check again because maybe while the repo validity was being
      //checked, the repo obj was created in another thread.
      if (!repos[userName][repoName]) {
        repos[userName][repoName] = newRepo;
      }

      return repos[userName][repoName];
    });
  };
}

module.exports = Repositories;
