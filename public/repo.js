// // This will be sent by the server
// var STATUS = {
//   success: true,
//
//   // Possible values: ['cloning', 'installing', 'pulling', 'testing', 'free'],
//   state: 'cloning',
// };

function debounce(FuncDelay, callback) {
  var delay = FuncDelay;
  var params;
  var context = this;
  var timeoutObj;

  function timeoutFunc() {
    if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    callback.apply(context, params); // Call function with latest parameters
  }
  return function () {
    params = arguments;
    if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    timeoutObj = setTimeout(timeoutFunc, delay);

    // Now we return a function that allows the user to call the
    // method immediately and cancel any timeouts.
    // use it like myDebouncedFunc(arg1, arg2)("now!");
    return function (now) {
      if (now) {
        timeoutFunc();
      }
    };
  };
}

(function (pageStatus) {
  'use strict'; // eslint-disable-line strict

  var MIN_WAIT = 5000;
  function updateStatus(updateUrl) {
    console.log('Updating status...');
    fetch(updateUrl)
    .then(function (res) {
      return res.json();
    })
    .then(function (res) {
      if (!res || !res.state) {
        throw new Error('updateStatus(): ' +
          'Invalid update object returned from the server: ' + res);
      }

      processStatus(res); // eslint-disable-line no-use-before-define
    })
    .catch(function (err) {
      console.error('Error in updateStatus()');
      console.error(err);
    });
  }

  var updateStatusDebounced = debounce(MIN_WAIT, updateStatus);

  function setSuccess() {
    document.body.className = 'success';
  }

  function setFailure() {
    document.body.className = 'failure';
  }

  function setStateMessage(message) {
    if (typeof message !== 'string') {
      throw new Error('setLoadingMessage: No message provided.');
    }

    var stateMessageContainer = document.querySelector('.status-message');
    stateMessageContainer.innerText = message;
  }

  function setWorking(statusObj) {
    document.body.className = 'working';

    var hostUrl = location.origin;
    var userAndRepo = location.pathname;
    var updateUrl = hostUrl + '/u' + userAndRepo;

    if (statusObj) { setStateMessage(statusObj.state); }
    updateStatusDebounced(updateUrl);
  }

  function processStatus(statusObj) {
    if (!statusObj || statusObj.state !== 'free') {
      setWorking(statusObj);
    } else if (statusObj.success) {
      setSuccess();
    } else {
      setFailure();
    }
  }


  processStatus(pageStatus);
}(STATUS)); // eslint-disable-line no-undef
