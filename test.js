var fs = require('fs');
var repositoriesPath = process.cwd();
var repo = '/test';
var log = 'asdfasdfa';

console.log(repositoriesPath + repo + '.log');
fs.writeFile('message.txt', 'Hello Node.js', 'utf8', function () {});

fs.writeFile(repositoriesPath + repo + '.log', log, 'utf8', function (err) {
  console.log(err);
  if (err) {
    console.log("Did not work");
  } else {
    console.log("Worked");
  }
});
