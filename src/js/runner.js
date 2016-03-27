// ------------------------------------------------------------------------
//  Command runner
// ------------------------------------------------------------------------

var childProcess = require('child_process');
var spawn = childProcess.spawn;
var utils = require('./utils');

/**
 *
 * A messager object that listens to the events 'message' and 'exit'
 * @class Messager
 */
function Messager() {
  if (!(this instanceof Messager)) {
    return new Messager();
  }

  var listeners = {};
  var validEvents = ['message', 'exit'];
  var output = '';

  function isValidEvent(event) {
    if (validEvents.indexOf(event) < 0) {
      return false;
    }
    return true;
  }

  function on(event, callback) {
    if (!isValidEvent(event)) {
      throw new Error('runner Messsager(): ' + event + ' is not a valid Messager event.');
    } else if (typeof callback !== 'function') {
      throw new Error('runner Messsager(): The callback parameter is not a function.');
    } else {
      listeners[event] = callback;
    }
  }

  function trigger(event) {
    if (listeners[event]) {
      var args = [].slice.call(arguments, 1);
      listeners[event].apply(listeners[event], args);
    }
  }

  function send(txt) {
    // For now show in the console everything that is being sent
    // console.log(txt);

    output += txt;
    trigger('message', txt);
  }

  function exit(exitStatus) {
    trigger('exit', output, exitStatus);
  }

  this.send = send;
  this.on = on;
  this.exit = exit;
  // messager.on('message', function (msg) {});
  // messager.on('exit', function (fullOutput, exitStatus) {});
  return this;
}


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
