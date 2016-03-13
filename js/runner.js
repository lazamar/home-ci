// ------------------------------------------------------------------------
//  Command runner
// ------------------------------------------------------------------------

var childProcess = require('child_process');
var spawn = childProcess.spawn;
var Promise = require('promise');

module.exports = function runner(commandName, args, dir) {
  dir = dir || process.cwd();

  console.log(dir);
  console.log(commandName + ' ' + [].join.call(args, ' '));

  //Change current working directory
  process.chdir(dir);

  return new Promise(function (resolve, reject) {
    //Say what command is being executed and where
    var output = '$: ' + commandName + ' ' + args.join(' ') + '\n';

    var proc = spawn(commandName, args);
    proc.stdout.on('data', function (data) {
      var buff = new Buffer(data);
      output += buff.toString('utf8');
      console.log('>>>>>>>>>: ' + data);
    });

    proc.stderr.on('data', function (data) {
      output += '\nERROR: ' + data;
      console.log('>>ERROR>>: ' + data);
    });

    proc.on('exit', function (code) {
      var returnObj = {
        exitStatus: code,
        output: output,
      };
      resolve(returnObj);
    });
  });
};
