// This is under repo.tests.livelog
function LiveLog() {
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

  this.addLine = function _addLine(txt) {
    logArray.push(txt);
  };

  return this;
}
