// This will be sent by the server
var STATUS = {
  success: true,

  // Possible values: ['cloning', 'installing', 'pulling', 'testing', 'free'],
  state: 'cloning',
};

(function (pageStatus) {
  'use strict'; // eslint-disable-line strict


  var MIN_WAIT = 5000;
  var lastUpdateTime = Date.now();
  function updateStatus(updateUrl) {
    console.log('Updating status...');
    var currTime = Date.now();
    var timeDiff = currTime - lastUpdateTime;

    // Wait at least MIN_WAIT time;
    var wait = Math.max(MIN_WAIT - timeDiff, 0);
    lastUpdateTime = currTime;
    setTimeout(function () {
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
    }, wait);
  }

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
    updateStatus(updateUrl);
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
