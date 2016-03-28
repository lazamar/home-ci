var Promise = require('promise');

/**
 * A messager object that emmits events 'message' and 'exit'
 * It also has a 'promise' property, which contains a promise
 * to be resolved at the same time the exit method is called
 * @class Messager
 */
module.exports = function Messager() {
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
    }

    listeners[event] = listeners[event] || [];
    listeners[event].push(callback);
  }

  function trigger(event) {
    if (listeners[event]) {
      var args = [].slice.call(arguments, 1);
      listeners[event].forEach(function (callback) {
        callback.apply(listeners[event], args);
      });
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

  this.promise = new Promise(function (resolve) {
    on('exit', function (exitStatus) {
      var res = { exitStatus: exitStatus, output: output };
      resolve(res);
    });
  });

  this.send = send;
  this.on = on;
  this.exit = exit;
  // messager.on('message', function (msg) {});
  // messager.on('exit', function (fullOutput, exitStatus) {});
  return this;
};
