// ------------------------------------------------------------------------
//  Command runner
// ------------------------------------------------------------------------

var childProcess = require('child_process');
var spawn = childProcess.spawn;
var utils = require('./utils');
var Messager = require('./messager');

module.exports = function runner(commandName, args, dir, timeoutTime) {
  // Go to the directory where the command must be executed
  dir = dir || process.cwd();
  process.chdir(dir);
  timeoutTime = timeoutTime || 60000; // default: 1min

  // Object to be returned
  var exitStatus = { success: 0, error: 1 };
  var messager = new Messager();
  messager.send('$: ' + commandName + ' ' + args.join(' ') + '\n');

  // Start execution
  var proc = spawn(commandName, args);

  // Prepare process timeout in case it takes too long
  var timeout = setTimeout(function () {
    proc.kill('SIGINT');
    var err = utils.ansiColorise('red',
      '\nCommand "' + commandName + ' ' + args.join(' ') + '" timed out.' +
      ' Duration over ' + timeoutTime);

    messager.send(err);
    messager.exit(exitStatus.error);
  }, timeoutTime);

  // Append data to output String
  proc.stdout.on('data', function (data) {
    var buff = new Buffer(data);
    var output = buff.toString('utf8');
    messager.send(output);
  });

  // Append error to output String
  proc.stderr.on('data', function (data) {
    var output = utils.ansiColorise('red', '\nERR: ' + data);
    messager.send(output);
  });

  // Return whatever we have
  proc.on('exit', function (code) {
    clearTimeout(timeout);
    messager.exit(code);
  });

  return messager;
};
