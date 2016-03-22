//This will be sent by the server
var STATUS = {
  success: false,

  //Possible values: ['cloning', 'installing', 'pulling', 'testing', 'free'],
  availability: 'cloning',
};

(function (stats) {
  'use strict';

  var statusIcon = document.querySelector('.status-icon');
  var dividingBar = document.querySelector('.dividing-bar');
  if (!statusIcon || !dividingBar) {
    console.error('No status icon or loading bar found.');
  } else if (stats.availability !== 'free') {
    statusIcon.classList.add('fa-cog');
    statusIcon.classList.add('spinning');
    statusIcon.classList.add('warning-yellow');
  } else if (stats.success) {
    statusIcon.classList.add('fa-check-square');
    statusIcon.classList.add('success-green');
    dividingBar.classList.add('success');
  } else {
    statusIcon.classList.add('fa-minus-square');
    statusIcon.classList.add('fail-red');
    dividingBar.classList.add('failure');
  }

}(STATUS));
