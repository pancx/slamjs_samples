let videoWidth, videoHeight;

let qvga = {width: {exact: 320}, height: {exact: 240}};

let vga = {width: {exact: 640}, height: {exact: 480}};

let resolution = window.innerWidth < 640 ? qvga : vga;

// whether streaming video from the camera.
let streaming = false;

let video = document.getElementById('video');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOutputCtx = canvasOutput.getContext('2d');
let stream = null;

let slam = null;

let trStatus = -2;

let info = document.getElementById('info');

function startCamera() {
  if (streaming) return;
  navigator.mediaDevices.getUserMedia({video: resolution, audio: false})
    .then(function(s) {
    stream = s;
    video.srcObject = s;
    video.play();
  })
    .catch(function(err) {
    console.log("An error occured! " + err);
  });

  video.addEventListener("canplay", function(ev){
    if (!streaming) {
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      video.setAttribute("width", videoWidth);
      video.setAttribute("height", videoHeight);
      canvasOutput.width = videoWidth;
      canvasOutput.height = videoHeight;
      streaming = true;
    }
    startVideoProcessing();
  }, false);
}

let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;

let canvasInput = null;
let canvasInputCtx = null;

let canvasBuffer = null;
let canvasBufferCtx = null;

function startVideoProcessing() {
  if (!streaming) { console.warn("Please startup your webcam"); return; }
  stopVideoProcessing();
  canvasInput = document.createElement('canvas');
  canvasInput.width = videoWidth;
  canvasInput.height = videoHeight;
  canvasInputCtx = canvasInput.getContext('2d');
  
  canvasBuffer = document.createElement('canvas');
  canvasBuffer.width = videoWidth;
  canvasBuffer.height = videoHeight;
  canvasBufferCtx = canvasBuffer.getContext('2d');
  
  srcMat = new Module.Mat(videoHeight, videoWidth, Module.CV_8UC4);  
  requestAnimationFrame(processVideo);
}

let count = 0;

function processVideo() {
  stats.begin();
  if(video.ended) {
    slam.Shutdown();
    return;
  }
  canvasInputCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
  let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
  srcMat.data.set(imageData.data);
  let pose = slam.TrackMonocular(srcMat, performance.now());
  ++count;
  let st = slam.GetTrackingState();
  if (trStatus != st) {
    console.log('No. ' + count);
    trStatus = st;
    switch (trStatus) {
      case -1: console.log('Tracking state: ' + 'system not ready'); break;
      case 0: console.log('Tracking state: ' + 'no images yet'); break;
      case 1: console.log('Tracking state: ' + 'not initialized'); break;
      case 2: console.log('Tracking state: ' + 'ok'); break;
      case 3: console.log('Tracking state: ' + 'lost'); break;
    }
  }
  if(st == 2) {
    console.log(pose.data32F);
    console.log("GetKeyFramesInMap: " + slam.GetKeyFramesInMap());
    console.log("GetMapPointsInMap: " + slam.GetMapPointsInMap());
  }
  pose.delete();
  let currentFrame = slam.GetCurrentFrame();
  Module.imshow(canvasOutput, currentFrame);
  currentFrame.delete();
  stats.end();
  requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function stopCamera() {
  if (!streaming) return;
  stopVideoProcessing();
  document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
  video.pause();
  video.srcObject=null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

function initUI() {
  stats = new Stats();
  stats.showPanel(0);
  document.getElementById('container').appendChild(stats.dom);
}

function opencvIsReady() {
  console.log('OpenCV.js is ready');
  if (!featuresReady) {
    console.log('Requred features are not ready.');
    return;
  }
  info.innerHTML = '';
  initUI();
  slam = new Module.SLAM('ORBvoc.bin', 'c270.yaml', Module.MONOCULAR, false);
  console.log('SLAM is ready');
  startCamera();
}