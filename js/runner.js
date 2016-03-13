// ------------------------------------------------------------------------
//  Command runner
// ------------------------------------------------------------------------

var childProcess = require('child_process');
var spawn = childProcess.spawn;
var Promise = require('promise');
var utils = require('./utils');

module.exports = function runner(commandName, args, dir) {
  dir = dir || process.cwd();

  console.log(commandName + ' ' + [].join.call(args, ' '));

  //Change current working directory
  process.chdir(dir);
  var timeoutTime = 60000; // 1min
  return new Promise(function (resolve, reject) {

    //Object to be returned
    var res = { exitStatus: undefined, output: '' };

    //Say what command is being executed and where
    res.output = '$: ' + commandName + ' ' + args.join(' ') + '\n';

    //Start execution
    var proc = spawn(commandName, args);

    //Prepare process timeout in case it takes too long
    var timeout = setTimeout(function () {
      proc.kill('SIGINT');
      res.output += utils.ansiColorise('red',
          '\nTest timed out. Test duration over ' + timeoutTime);

      res.exitStatus = 1;
      resolve(res);
    }, timeoutTime);

    //Append data to output String
    proc.stdout.on('data', function (data) {
      var buff = new Buffer(data);
      res.output += buff.toString('utf8');
      console.log('>>>>>>>>>: ' + data);
    });

    //Append error to output String
    proc.stderr.on('data', function (data) {
      res.output += utils.ansiColorise('red', '\nERR: ' + data);
      console.log('>>ERROR>>: ' + data);
    });

    //Return whatever we have
    proc.on('exit', function (code) {
      clearTimeout(timeout);
      res.exitStatus = code;
      resolve(res);
    });
  });
};
