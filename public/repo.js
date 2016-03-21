//This will be sent by the server
var STATUS = {
  success: false,

  //Possible values: ['cloning', 'installing', 'pulling', 'testing', 'free'],
  availability: 'free',
};

(function (stats) {
  'use strict';

  var statusIcon = document.querySelector('.status-icon');
  if (!statusIcon) {
    console.error('No status icon found.');
  } else if (stats.availability !== 'free') {
    statusIcon.classList.add('fa-cog');
    statusIcon.classList.add('warning-yellow');
    var loadingBar = document.querySelector('.load-bar');
    loadingBar.classList.remove('hidden');
  } else if (stats.success) {
    statusIcon.classList.add('fa-check-square');
    statusIcon.classList.add('success-green');
  } else {
    statusIcon.classList.add('fa-minus-square');
    statusIcon.classList.add('fail-red');
  }

}(STATUS));
