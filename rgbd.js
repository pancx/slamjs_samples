let videoWidth, videoHeight;

let qvga = {width: {exact: 320}, height: {exact: 240}};

let vga = {width: {exact: 640}, height: {exact: 480}};

let resolution = window.innerWidth < 640 ? qvga : vga;

// whether streaming video from the camera.
let streaming = false;

let video = document.getElementById('video');
let videoD = document.getElementById('videoD');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOutputCtx = canvasOutput.getContext('2d');
let stream = null;

let slam = null;

let trStatus = -2;

let info = document.getElementById('info');

// video.oncanplay = function() {
//     if (!streaming) {
//       videoWidth = video.videoWidth;
//       videoHeight = video.videoHeight;
//       video.setAttribute("width", videoWidth);
//       video.setAttribute("height", videoHeight);
//       canvasOutput.width = videoWidth;
//       canvasOutput.height = videoHeight;
//       streaming = true;
//     }
//     startVideoProcessing();
// };

function startVideo() {

  // if(video.readyState !== 4)
  //       video.load();
  // if(videoD.readyState !== 4)
  //       videoD.load();
  if (!streaming) {
      videoWidth = resolution.width.exact;// video.videoWidth;
      videoHeight = resolution.height.exact;// video.videoHeight;
      video.setAttribute("width", videoWidth);
      video.setAttribute("height", videoHeight);
      videoD.setAttribute("width", videoWidth);
      videoD.setAttribute("height", videoHeight);
      canvasOutput.width = videoWidth;
      canvasOutput.height = videoHeight;
      streaming = true;
  }
  // video.play();
  // videoD.play();
  startVideoProcessing();
}

let srcMat = null;
let srcD = null;

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
  srcD = new Module.Mat(videoHeight, videoWidth, Module.CV_8UC4);
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
  canvasInputCtx.drawImage(videoD, 0, 0, videoWidth, videoHeight);
  let imageD = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
  srcD.data.set(imageD.data);

  let pose = slam.TrackRGBD(srcMat, srcD, performance.now());
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
  //canvasOutputCtx.drawImage(canvasInput, 0, 0, videoWidth, videoHeight);
  currentFrame.delete();
  stats.end();
  requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
  if (srcMat != null && !srcMat.isDeleted()) srcMat.delete();
  if (srcD != null && !srcD.isDeleted()) srcD.delete();
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
  info.innerHTML = '';
  initUI();
  slam = new Module.SLAM('ORBvoc.bin', 'TUM2.yaml', Module.RGBD, false);
  console.log('SLAM is ready');
  videoD.oncanplay = startVideo();
  video.load();
  videoD.load();
  video.play();
  videoD.play();
}