/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const audioElement = document.querySelector('audio');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const selectors = [audioInputSelect, audioOutputSelect];
let hasMic = false;
let hasCamera = false;
let openMic = undefined;
let openCamera = undefined;
let hasPermission = false;

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);

function getDevices() {
  navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
}

function gotDevices(deviceInfos) {
  console.log('gotDevices', deviceInfos);
  hasMic = false;
  hasCamera = false;
  hasPermission = false;
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.deviceId == '') {
      continue;
    }
    // If we get at least one deviceId, that means user has granted user
    // media permissions.
    hasPermission = true;
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      hasMic = true;
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
  start();
}

// Attach audio output device to audio element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        })
        .catch(error => {
          let errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          audioOutputSelect.selectedIndex = 0;
        });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(audioElement, audioDestination);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  audioElement.srcObject = stream;
  if (stream.getAudioTracks()[0]) {
    openMic = stream.getAudioTracks()[0].getSettings().deviceId;
  }
  // Refresh list in case labels have become available
  return getDevices();
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  const audioSource = audioInputSelect.value || undefined;
  // Don't open the same devices again.
  if (hasPermission && openMic == audioSource) {
    return;
  }
  // Close existng streams.
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
    openCamera = undefined;
    openMic = undefined;
  }
  const constraints = {
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    },
  };
  console.log('start', constraints);
  if (!hasPermission || hasCamera || hasMic) {
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
  }
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;
navigator.mediaDevices.ondevicechange = getDevices;

getDevices();
