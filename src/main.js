import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// --- State & Variables ---
let scene, camera, renderer;
let handLandmarker;
let video, pipCanvas, pipCtx;
let objects = [];
let activeIndex = 0;
let isPinching = false;
let isFist = false;
let isPalm = false;
let isPeace = false;
let lastSwitchTime = 0;

// Animation Recorder State
let isRecording = false;
let isPlaying = false;
let keyframes = [];
let recordStartTime = 0;
let playStartTime = 0;

let prevHandPos = null;
let fpsCounter, gestureLabel, recDot, recStatus, activeMeshName;

// --- 1. Three.js 3D Scene Initialization ---
function initThree() {
  const canvas = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090e, 0.035);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 6);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const purpleLight = new THREE.PointLight(0xff007f, 3, 20);
  purpleLight.position.set(-5, 3, -2);
  scene.add(purpleLight);

  // Futuristic Ground Grid
  const grid = new THREE.GridHelper(30, 30, 0x00f0ff, 0x162438);
  grid.position.y = -1.8;
  scene.add(grid);

  // Create 3D Meshes
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
  const prismMat = new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.2, metalness: 0.8 });
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.1, metalness: 0.9, wireframe: false });

  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), cubeMat);
  cube.position.set(-2.2, 0, 0);

  const prism = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 4), prismMat);
  prism.position.set(0, 0, 0);

  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), orbMat);
  orb.position.set(2.2, 0, 0);

  objects = [
    { name: "NEON CUBE", mesh: cube, baseColor: 0x00f0ff },
    { name: "CRYSTAL PRISM", mesh: prism, baseColor: 0xff007f },
    { name: "ENERGY ORB", mesh: orb, baseColor: 0x00ff88 }
  ];

  objects.forEach(obj => scene.add(obj.mesh));
  updateSelectionHighlight();

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateSelectionHighlight() {
  objects.forEach((obj, idx) => {
    if (idx === activeIndex) {
      obj.mesh.material.emissive = new THREE.Color(isRecording ? 0xff0033 : 0xffaa00);
      obj.mesh.material.emissiveIntensity = 0.5;
    } else {
      obj.mesh.material.emissive = new THREE.Color(0x000000);
      obj.mesh.material.emissiveIntensity = 0;
    }
  });
  if (activeMeshName) {
    activeMeshName.innerText = `SELECTED: ${objects[activeIndex].name}`;
  }
}

// --- 2. MediaPipe Hand Tracking Setup ---
async function initTracker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
  console.log("HandLandmarker Initialized.");
}

async function startCamera() {
  video = document.getElementById('webcam');
  pipCanvas = document.getElementById('pip-canvas');
  pipCtx = pipCanvas.getContext('2d');

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" }
  });
  video.srcObject = stream;
  await new Promise(resolve => video.onloadedmetadata = resolve);

  pipCanvas.width = video.videoWidth;
  pipCanvas.height = video.videoHeight;
}

// --- 3. Gesture Classification & Interaction ---
function processHands(results) {
  pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);

  if (!results.landmarks || results.landmarks.length === 0) {
    gestureLabel.innerText = "NO HAND DETECTED";
    prevHandPos = null;
    return;
  }

  const landmarks = results.landmarks[0];
  drawSkeleton(landmarks);

  // Key Landmarks
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  // Distances
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  isPinching = pinchDist < 0.07;

  const isExt = (tip, pip) => Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > Math.hypot(pip.x - wrist.x, pip.y - wrist.y) * 1.15;
  const indexExt = isExt(indexTip, indexPip);
  const middleExt = isExt(middleTip, middlePip);
  const ringExt = isExt(ringTip, ringPip);
  const pinkyExt = isExt(pinkyTip, pinkyPip);

  isFist = !indexExt && !middleExt && !ringExt && !pinkyExt;
  isPalm = indexExt && middleExt && ringExt && pinkyExt;
  isPeace = indexExt && middleExt && !ringExt && !pinkyExt;

  // Coordinate Mapping (Normalized -> 3D units)
  const palmCenterX = (wrist.x + landmarks[5].x + landmarks[17].x) / 3;
  const palmCenterY = (wrist.y + landmarks[5].y + landmarks[17].y) / 3;

  const handScale = Math.hypot(landmarks[9].x - wrist.x, landmarks[9].y - wrist.y);
  const handX = (palmCenterX - 0.5) * 8.0; // mirror flipped by CSS
  const handY = -(palmCenterY - 0.5) * 6.0;
  const handZ = (handScale - 0.18) * 12.0;

  const currentPos = new THREE.Vector3(handX, handY, handZ);
  const now = performance.now();

  const activeObj = objects[activeIndex].mesh;

  // --- Gesture Actions ---
  if (isPeace && (now - lastSwitchTime > 900)) {
    activeIndex = (activeIndex + 1) % objects.length;
    lastSwitchTime = now;
    gestureLabel.innerText = "PEACE: SWITCH OBJECT";
    updateSelectionHighlight();
  } else if (isPinching) {
    gestureLabel.innerText = "PINCH: MOVING OBJECT";
    if (prevHandPos) {
      const delta = new THREE.Vector3().subVectors(currentPos, prevHandPos);
      activeObj.position.add(delta.multiplyScalar(1.2));
      activeObj.rotation.y += delta.x * 2.0;
      activeObj.rotation.x -= delta.y * 2.0;
    }
    // Record motion
    if (isRecording) {
      keyframes.push({
        time: (now - recordStartTime) / 1000,
        pos: activeObj.position.clone(),
        rot: activeObj.rotation.clone()
      });
    }
  } else if (isFist) {
    gestureLabel.innerText = "FIST: RECORDING 3D MOTION";
    if (!isRecording) {
      isRecording = true;
      isPlaying = false;
      keyframes = [];
      recordStartTime = now;
      recDot.classList.add('active');
      recStatus.innerText = "RECORDING KEYFRAMES";
      updateSelectionHighlight();
    }
  } else if (isPalm) {
    gestureLabel.innerText = "OPEN PALM: ORBIT CAMERA";
    if (isRecording) {
      isRecording = false;
      isPlaying = keyframes.length > 2;
      playStartTime = now;
      recDot.classList.remove('active');
      recStatus.innerText = isPlaying ? "LOOPING ANIMATION" : "STANDBY";
      updateSelectionHighlight();
    }
    // Camera orbit
    if (prevHandPos && !isPinching) {
      const delta = new THREE.Vector3().subVectors(currentPos, prevHandPos);
      camera.position.x -= delta.x * 0.8;
      camera.position.y += delta.y * 0.8;
      camera.lookAt(0, 0, 0);
    }
  } else {
    gestureLabel.innerText = "HAND ACTIVE";
  }

  // Two Hands Zoom
  if (results.landmarks.length > 1) {
    const h1 = results.landmarks[0][0];
    const h2 = results.landmarks[1][0];
    const dist = Math.hypot(h1.x - h2.x, h1.y - h2.y);
    camera.position.z = THREE.MathUtils.clamp(14 - dist * 12, 3.5, 12);
  }

  prevHandPos = currentPos;
}

// --- 4. Animation Playback Loop ---
function updateObjectAnimation() {
  if (!isPlaying || keyframes.length < 2) return;
  const duration = keyframes[keyframes.length - 1].time;
  if (duration <= 0.01) return;

  const elapsed = ((performance.now() - playStartTime) / 1000) % duration;
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (elapsed >= k1.time && elapsed <= k2.time) {
      const alpha = (elapsed - k1.time) / (k2.time - k1.time);
      const activeMesh = objects[activeIndex].mesh;
      activeMesh.position.lerpVectors(k1.pos, k2.pos, alpha);
      activeMesh.rotation.x = THREE.MathUtils.lerp(k1.rot.x, k2.rot.x, alpha);
      activeMesh.rotation.y = THREE.MathUtils.lerp(k1.rot.y, k2.rot.y, alpha);
      break;
    }
  }
}

// --- 5. Skeleton HUD Drawing ---
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

function drawSkeleton(lms) {
  const w = pipCanvas.width;
  const h = pipCanvas.height;

  pipCtx.lineWidth = 3;
  pipCtx.strokeStyle = "#00f0ff";
  CONNECTIONS.forEach(([i, j]) => {
    pipCtx.beginPath();
    pipCtx.moveTo(lms[i].x * w, lms[i].y * h);
    pipCtx.lineTo(lms[j].x * w, lms[j].y * h);
    pipCtx.stroke();
  });

  lms.forEach((lm, idx) => {
    pipCtx.beginPath();
    pipCtx.arc(lm.x * w, lm.y * h, (idx === 4 || idx === 8) ? 6 : 4, 0, Math.PI * 2);
    pipCtx.fillStyle = (idx === 4 || idx === 8) && isPinching ? "#ff007f" : "#00ff88";
    pipCtx.fill();
  });
}

// --- 6. Main Application Loop ---
let lastTime = performance.now();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    fpsCounter.innerText = `FPS: ${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }

  // Run Hand Tracking
  if (handLandmarker && video && video.readyState >= 2) {
    const results = handLandmarker.detectForVideo(video, now);
    processHands(results);
  }

  // Rotate inactive shapes gently
  objects.forEach((obj, idx) => {
    if (idx !== activeIndex || (!isPinching && !isPlaying)) {
      obj.mesh.rotation.y += 0.008;
    }
  });

  updateObjectAnimation();
  renderer.render(scene, camera);
}

// --- 7. Bootstrap on DOM Ready ---
window.addEventListener('DOMContentLoaded', () => {
  fpsCounter = document.getElementById('fps-counter');
  gestureLabel = document.getElementById('gesture-label');
  recDot = document.getElementById('rec-dot');
  recStatus = document.getElementById('rec-status');
  activeMeshName = document.getElementById('active-mesh-name');

  const startBtn = document.getElementById('start-btn');
  const startModal = document.getElementById('start-modal');

  startBtn.addEventListener('click', async () => {
    startBtn.innerText = "INITIALIZING COMPUTER VISION...";
    startBtn.disabled = true;
    try {
      initThree();
      await initTracker();
      await startCamera();
      startModal.style.display = 'none';
      animate();
    } catch (err) {
      alert("Error starting camera or WebGL: " + err.message);
      startBtn.innerText = "RETRY";
      startBtn.disabled = false;
    }
  });
});
