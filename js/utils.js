var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('promise');
var ansi_up = require('ansi_up'); //ANSI to coloured HTML
var projectRoot = process.cwd() + '/';

module.exports = (function utils() {

  var exp = {};

  var parse = (function () {
    var validateRegex = /^(\/)([\w-]+)(?:(\/)([\w-]+))?/;
    return {
      user: function (url) {
        var userMatch = url.match(validateRegex) || [];
        return userMatch[2];
      },

      repository: function (url) {
        var repMatch = url.match(validateRegex) || [];
        return repMatch[4];
      },
    };
  }());

  function readFile(fileName) {
    return new Promise(function (resolve, reject) {
      fs.readFile(fileName, function (err, data) {
        if (err) {
          reject('File not found:' + fileName);
        } else {
          resolve(data);
        }
      });
    });
  }

  function readFileSync(fileName) {
    fs.readFileSync(fileName);
  }

  function writeFile(filePath, content) {
    console.log('writing to file...');
    var fileName = filePath.match(/\/[^\/]+$/);
    var pathFolders = filePath.replace(fileName[0], '');
    mkdirp.sync(pathFolders);
    return new Promise(function (resolve, reject) {
      fs.writeFile(filePath, content, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  function terminalToHTML(text) {
    var withLineBreaks = text.replace(/\n/g, '\n<br/> ');
    return ansi_up.ansi_to_html(withLineBreaks);
  }

  function readDirectory(path) {
    var content = null;
    try {
      content = fs.readdirSync(path);
    } catch (e) {
      content = null;
    }

    return content;
  }

  function buildTemplate(fields) {
    if (!fields || !fields.repo || !fields.username) {
      return null;
    }

    return readFile(projectRoot + 'html/project_page.html')
      .then(function (template) {
        if (!template) {
          return 'Error building Template \n';
        }

        template = template.toString();
        template = template.replace('$$REPO$$', fields.repo);
        template = template.replace('$$USERNAME$$', fields.username);
        template = template.replace('$$CONTENT$$', fields.content);
        template = template.replace('$$SCRIPT$$', fields.script);
        return template;
      });
  }

  //get number of files like test10.log and test11.log
  function getFileNumber(fileName) {
    if (!fileName) { return null; }

    var match = fileName.match(/([0-9]+)\.[^0-9]+$/) || [];
    var fileNo = parseInt(match[1]);
    return fileNo || null;
  }

  //Compares names like test10.log and test11.log
  function compareFileNames(f1, f2) {
    //Make number an int or NaN if no number was matched.
    var f1No = getFileNumber(f1);
    var f2No = getFileNumber(f2);

    return f1No > f2No;
  }

  return {
    buildTemplate: buildTemplate,
    readDirectory: readDirectory,
    terminalToHTML: terminalToHTML,
    writeFile: writeFile,
    readFile: readFile,
    readFileSync: readFileSync,
    parse: parse,
    compareFileNames: compareFileNames,
    getFileNumber: getFileNumber
  };
}());
