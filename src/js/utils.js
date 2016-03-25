var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('promise'); //jshint ignore:line
var ansi_up = require('ansi_up'); //ANSI to coloured HTML
var rimraf = require('rimraf');
var Path = require('path');

module.exports = (function utils() {
  'use strict';

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

  // TODO: Make readfile functions return null if an error happens
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
          console.log('writing error');
          reject(err);
        } else {
          console.log('Successfully written.');
          resolve(content);
        }
      });
    });
  }

  function terminalToHTML(text) {
    var withLineBreaks = text.replace(/\n/g, '\n<br/> ');
    return ansi_up.ansi_to_html(withLineBreaks);
  }

  var ansi = {
    green: '\x1B[32m',
    red: '\x1B[31m',
    yellow: '\x1B[33m',
    blue: '\x1b[34m',
    none: '\x1B[0m'
  };

  function ansiColorise(color, str) {
    return ansi[color] + str + ansi.none;
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

  /**
   * [checkExistsSync description]
   * @param  {String} what directory or file
   * @param  {String} path
   * @return {Boolean}
   */
  function checkExistsSync(what, path) {
    try {
      if (what === 'file') {
        return fs.statSync(path).isFile();
      } else if (what === 'directory') {
        return fs.statSync(path).isDirectory();
      } else {
        throw new Error('Unexpected parameter value in utils.checkExistsSync.');
      }
    } catch (e) {
      // no such file or directory. File really does not exist
      if (e.code === 'ENOENT') { return false; }

      // something else went wrong, we don't have rights or something
      console.log('Exception fs.statSync (' + path + '): ' + e);
      throw e;
    }
  }

  function dirExistsSync(dir) {
    return checkExistsSync('directory', dir);
  }

  function fileExistsSync(filePath) {
    return checkExistsSync('file', filePath);
  }

  /**
   * Deletes a directory and everything within it.
   * @method deleteDir
   * @param  {String} path
   * @return {Promise}      Will resolve with void or fail with an error
   */
  function deleteDir(path) {
    return new Promise(function (resolve, reject) {
      rimraf(path, { glob: false }, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function joinPath() {
    return Path.join.apply({}, arguments);
  }

  function buildTemplate(fields) {
    if (!fields || !fields.repo || !fields.username) {
      return null;
    }

    var projectRoot = joinPath(__dirname, '..', '..');
    var htmlFolder = joinPath(projectRoot, 'src', 'html');
    return readFile(htmlFolder + '/project_page.html')
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
    ansiColorise: ansiColorise,
    writeFile: writeFile,
    readFile: readFile,
    readFileSync: readFileSync,
    parse: parse,
    compareFileNames: compareFileNames,
    getFileNumber: getFileNumber,
    dirExistsSync: dirExistsSync,
    fileExistsSync: fileExistsSync,
    deleteDir: deleteDir,
    joinPath: joinPath,
  };
}());
