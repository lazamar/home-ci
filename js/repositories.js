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
   * @return {Repository}
   */
  this.get = function get(repoName, userName) {

    //Constructor is a reserved property name
    if (repoName === 'constructor') {
      repoName = '_constructor';
    } else if (userName === 'constructor') {
      userName = '_constructor';
    }

    if (!repos[userName]) { repos[userName] = {}; }

    var userRepos = repos[userName];
    if (!userRepos[repoName]) {
      userRepos[repoName] = new Repository(userName, repoName, repositoriesPath);
    }

    return repos[repoName];
  };
}

module.exports = Repositories;
