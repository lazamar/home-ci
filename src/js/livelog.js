// This is under repo.tests.livelog
module.exports = function LiveLog() {
  if (!(this instanceof LiveLog)) {
    return new LiveLog();
  }

  var logArray = [];

  this.get = function get(lineNum) {
    var beginning = lineNum || 0;
    var section = logArray.slice(beginning).join('');

    return {
      fromLine: beginning,
      toLine: logArray.length,
      content: section,
    };
  };

  this._clear = function _clear() {
    logArray = [];
  };

  this._addLine = function _addLine(txt) {
    console.log('line ' + logArray.length + ':' + txt);
    logArray.push(txt);
  };

  return this;
};
