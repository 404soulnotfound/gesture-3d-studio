# 🌌 Spatial 3D Gesture Studio

An interactive **Computer Vision & 3D Spatial Puppetry Web Application**. Control 3D scene cameras, grab and move objects in 3D $(X, Y, Z)$ space, and record dynamic 3D keyframe animations using only hand gestures from a regular 2D webcam.

---

## 💡 Project Overview
Spatial 3D Gesture Studio bridges the gap between **Computer Vision (AI perception)** and **Interactive 3D Graphics (WebGL/Three.js)**. Unlike typical gesture projects that only recognize static alphabet letters or move a mouse cursor, this system allows full **spatial 3D manipulation** and **live digital puppetry/animation keyframing** directly in the browser with **zero server processing**.

---

## 🌟 Why This Project is Unique
1. **Three Paradigms in One App:**
   - **Spatial Control:** Orbit camera, navigate 3D space, and zoom via two-hand distance tracking.
   - **Depth & Manipulation:** 6-DOF style manipulation using monocular relative depth estimation (pushing your hand forward pushes the 3D object into the scene).
   - **Real-Time Keyframe Puppetry:** Record motion capture paths live using your hand as an animation rig, with automatic timeline interpolation and looping.
2. **100% Client-Side Edge Inference:**
   - Powered by WebAssembly (WASM) and WebGL. Camera frames never leave the user's computer, ensuring total privacy and near-instant responsiveness (60 FPS).
3. **Adaptive Kinematic Filtering:**
   - Employs distance thresholding and interpolation smoothing to eliminate webcam tracking jitter.

---

## 🛠️ Tech Stack Used

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Perception (CV/AI)** | **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) | Real-time 21-landmark 3D hand tracking via WebAssembly & GPU delegate |
| **3D Graphics Engine** | **Three.js** (WebGL) | Scene graph, camera perspective, lighting (PBR shaders), geometry rendering |
| **Frontend & HUD** | **HTML5, CSS3, Modern ES Modules** | Futuristic sci-fi cyberpunk HUD, picture-in-picture webcam canvas |
| **Build Tool** | **Vite** | Fast bundling, HMR, and production optimization |
| **Deployment Target**| **Vercel / Netlify / GitHub Pages** | Zero-cost global static CDN hosting |

---

## ⚡ Challenges Faced
1. **Monocular Z-Axis (Depth) from 2D Webcams:**
   - *Problem:* Standard webcams have no LiDAR or stereo depth sensors.
   - *Solution:* Estimated depth dynamically by measuring geometric hand scale (the Euclidean distance between the wrist and the middle MCP knuckle joint) calibrated against standard anatomical proportions.
2. **Tracking Jitter & Accidental Triggers:**
   - *Problem:* Hand tracking models flicker by a few pixels every frame, causing jittery 3D object movement.
   - *Solution:* Applied delta movement thresholds and interpolation (`lerp`) across positions and rotations.
3. **Gesture Ambiguity & State Debouncing:**
   - *Problem:* Transitioning between gestures (e.g. from an Open Palm to a Fist) momentarily passes through accidental peace or pinch signs.
   - *Solution:* Implemented gesture state cooldowns and priority checks (e.g., peace-sign switching has a 900ms debounce cooldown).

---

## ⚠️ Limitations & Future Work
- **Extreme Lighting Conditions:** Poor lighting or strong backlighting degrades landmark accuracy.
- **Occlusion:** If one finger hides behind another, the model infers landmark position, which can cause slight rotation inaccuracy.
- **Future Improvements:** Adding `.gltf` model drag-and-drop loading, physics gravity (Cannon.js / Rapier), and exporting recorded animations directly to `.gltf` / Blender format.

---

## 🚀 How to Run Locally

```bash
# 1. Clone repository or navigate to directory
cd gesture_3d_web

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in any modern web browser.

---

## 🌐 How to Deploy (Step-by-Step)

### Option A: Vercel (Recommended — Takes 1 minute)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Run in `gesture_3d_web` directory:
   ```bash
   vercel
   ```
   Follow the prompts (accept defaults). Your live URL is generated immediately!

### Option B: GitHub Pages / Netlify
1. Run `npm run build` to generate the `/dist` folder.
2. Drag and drop the `/dist` folder directly onto [Netlify Drop](https://app.netlify.com/drop), or push to GitHub and connect Netlify/Vercel.
