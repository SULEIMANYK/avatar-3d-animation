import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import Stats from "three/examples/jsm/libs/stats.module";
import TfWebcam from "./tfwebcam";

// Centralized configuration object for easy adjustments
const CONFIG = {
  camera: {
    fov: 45, // Field of View (determines how much of the scene is visible)
    near: 0.25, // Near clipping plane (closer objects are not rendered)
    far: 200, // Far clipping plane (objects beyond this distance are not rendered)
    position: new THREE.Vector3(-5, 3, 10), // Initial camera position in the scene
    lookAt: new THREE.Vector3(0, 2, 0), // Point where the camera initially looks
  },
  scene: {
    background: 0xe0e0e0, // Background color of the scene
    fog: {
      color: 0xe0e0e0, // Fog color, matching background to blend smoothly
      near: 20, // Distance at which fog starts appearing
      far: 100, // Distance at which fog completely obscures objects
    },
  },
  lights: {
    hemiLight: {
      color: 0xffffff, // Sky light color
      groundColor: 0x8d8d8d, // Ground light reflection color
      intensity: 3, // Brightness of the light
      position: new THREE.Vector3(0, 20, 0), // Position of the hemisphere light in the scene
    },
    dirLight: {
      color: 0xffffff, // Directional light color
      intensity: 3, // Brightness of the directional light
      position: new THREE.Vector3(0, 20, 10), // Position of the directional light
    },
  },
  ground: {
    size: { width: 2000, height: 2000 }, // Dimensions of the ground plane
    material: { color: 0xcbcbcb, depthWrite: false }, // Ground material properties
  },
  grid: {
    size: 200, // Total size of the grid helper
    divisions: 40, // Number of divisions in the grid
    color: 0x000000, // Grid line color
    opacity: 0.2, // Transparency level of the grid lines
  },
  model: {
    url: "/models/RobotExpressive.glb", // Path to the 3D model file relative to the public folder
  },
  animations: {
    states: [
      "Idle",
      "Walking",
      "Running",
      "Dance",
      "Death",
      "Sitting",
      "Standing",
    ], // List of primary animation states for the character
    emotes: ["Jump", "Yes", "No", "Wave", "Punch", "ThumbsUp"], // List of emote animations
  },
  cursorFollow: {
    sensitivity: 0.05, // Controls how smoothly the model follows the cursor
  },
  keyboard: {
    moveSpeed: 0.1, // Speed of movement when using arrow keys
    jumpHeight: 2, // Height of the jump when spacebar is pressed
    rotationSpeed: 0.05, // Speed of rotation when moving left/right
  },
};

const ThreeJSScene = () => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [movementData, setMovementData] = useState({
    thumbPose: null,
    handPose: null,
    headPose: null,
  });

  const handleMovementUpdate = (newMovementData) => {
    setMovementData(newMovementData);
  };

  useEffect(() => {
    console.log("Movement data updated:", movementData);
  }, [movementData]);

  useEffect(() => {
    let camera, scene, renderer, mixer, actions, activeAction, previousAction;
    let clock = new THREE.Clock();
    let stats;
    const api = { state: "Idle", mode: "Default", speed: 1, emote: "Jump" };
    const cursor = new THREE.Vector2();
    let model;
    const keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
    };
    let isJumping = false;

    // Initialize the camera
    const initCamera = () => {
      camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
      );
      camera.position.copy(CONFIG.camera.position);
      camera.lookAt(CONFIG.camera.lookAt);
    };

    // Initialize the scene
    const initScene = () => {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(CONFIG.scene.background);
      scene.fog = new THREE.Fog(
        CONFIG.scene.fog.color,
        CONFIG.scene.fog.near,
        CONFIG.scene.fog.far
      );
    };

    // Initialize the lights
    const initLights = () => {
      const hemiLight = new THREE.HemisphereLight(
        CONFIG.lights.hemiLight.color,
        CONFIG.lights.hemiLight.groundColor,
        CONFIG.lights.hemiLight.intensity
      );
      hemiLight.position.copy(CONFIG.lights.hemiLight.position);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(
        CONFIG.lights.dirLight.color,
        CONFIG.lights.dirLight.intensity
      );
      dirLight.position.copy(CONFIG.lights.dirLight.position);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      scene.add(dirLight);
    };

    // Initialize the ground and grid
    const initGround = () => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(
          CONFIG.ground.size.width,
          CONFIG.ground.size.height
        ),
        new THREE.MeshPhongMaterial(CONFIG.ground.material)
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const grid = new THREE.GridHelper(
        CONFIG.grid.size,
        CONFIG.grid.divisions,
        CONFIG.grid.color,
        CONFIG.grid.color
      );
      grid.material.opacity = CONFIG.grid.opacity;
      grid.material.transparent = true;
      scene.add(grid);
    };

    // Initialize the renderer
    const initRenderer = () => {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
    };

    // Initialize Stats.js for performance monitoring
    const initStats = () => {
      stats = new Stats();
      mountRef.current.appendChild(stats.dom);
    };

    // Load the 3D model
    const loadModel = async () => {
      const loader = new GLTFLoader();
      await loader.load(
        window.location.origin + CONFIG.model.url,
        (gltf) => {
          console.log("Model loaded successfully");
          model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);
          createGUI(model, gltf.animations);
          setLoading(false);
        },
        (xhr) => {
          const percent = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading: ${percent}%`);
          setProgress(percent);
        },
        (error) => {
          console.error("Error loading model:", error);
          setLoading(false);
        }
      );
    };

    // Create the GUI for controlling animations and modes
    const createGUI = (model, animations) => {
      const gui = new GUI();
      mixer = new THREE.AnimationMixer(model);
      actions = {};

      // Add animations to the mixer
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        actions[clip.name] = action;
        if (
          CONFIG.animations.emotes.includes(clip.name) ||
          CONFIG.animations.states.indexOf(clip.name) >= 4
        ) {
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
        }
      });

      // Add state control to the GUI
      gui
        .add(api, "state")
        .options(CONFIG.animations.states)
        .onChange(() => fadeToAction(api.state, 0.5));

      // Add mode control to the GUI
      gui.add(api, "mode").options(["Default", "Follow Cursor"]);

      // Add speed control to the GUI
      gui.add(api, "speed", 0.1, 2).onChange((value) => {
        mixer.timeScale = value;
      });

      // Add emote control to the GUI
      gui
        .add(api, "emote")
        .options(CONFIG.animations.emotes)
        .onChange(() => playEmote(api.emote));

      // Set the default animation
      activeAction = actions["Idle"];
      activeAction.play();
    };

    // Fade from the current animation to a new one
    const fadeToAction = (name, duration) => {
      previousAction = activeAction;
      activeAction = actions[name];
      if (previousAction !== activeAction) {
        previousAction.fadeOut(duration);
      }
      activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
    };

    // Play an emote animation
    const playEmote = (name) => {
      const emoteAction = actions[name];
      if (emoteAction) {
        emoteAction.reset().play();
        emoteAction.clampWhenFinished = true;
        emoteAction.loop = THREE.LoopOnce;
      }
    };

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Track mouse movement
    const onMouseMove = (event) => {
      cursor.x = (event.clientX / window.innerWidth) * 2 - 1;
      cursor.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    // Convert cursor position to world coordinates
    const getCursorWorldPosition = () => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(cursor, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      return intersection;
    };

    // Handle keydown events
    const onKeyDown = (event) => {
      if (event.code in keys) {
        keys[event.code] = true;
      }
    };

    // Handle keyup events
    const onKeyUp = (event) => {
      if (event.code in keys) {
        keys[event.code] = false;
        fadeToAction("Idle", 0.2); // Smoothly transition to "Idle"
        api.state = "Idle"; // Update the state
      }
    };

    // Make the model jump using the "Jump" emote
    const jump = () => {
      if (!isJumping && model) {
        isJumping = true;
        playEmote("Jump"); // Play the "Jump" emote
        setTimeout(() => {
          isJumping = false;
        }, 1000); // Reset jumping state after 1 second
      }
    };

    // Handle left-click for an emote (e.g., "Wave")
    const onMouseDown = (event) => {
      if (event.button === 0) {
        // Left-click
        playEmote("Wave"); // Play the "Wave" emote
      }
    };

    // Handle right-click for an emote (e.g., "ThumbsUp")
    const onContextMenu = (event) => {
      event.preventDefault(); // Prevent the default context menu
      playEmote("ThumbsUp"); // Play the "ThumbsUp" emote
    };

    // Animate the scene
    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Update model based on movement data
      if (model) {
        if (movementData.thumbPose === "Thumb Movement Detected") {
          fadeToAction("Wave", 0.2); // Example: Wave animation
        }

        if (movementData.handPose === "Hand Pose Detected") {
          model.position.x += 0.1; // Example: Move model to the right
        }

        if (movementData.headPose === "Head Pose Detected") {
          model.rotation.y += 0.05; // Example: Rotate model
        }
      }

      // Existing animation logic
      if (api.mode === "Follow Cursor" && model) {
        const targetPosition = getCursorWorldPosition();
        model.position.lerp(targetPosition, CONFIG.cursorFollow.sensitivity);
        model.lookAt(targetPosition);
      }

      if (model) {
        const moveSpeed = CONFIG.keyboard.moveSpeed;
        const isMoving =
          keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;

        if (isMoving) {
          if (api.state !== "Walking" && api.state !== "Running") {
            fadeToAction("Walking", 0.2);
            api.state = "Walking";
          }

          if (keys.ArrowUp) {
            model.position.z -= moveSpeed;
            model.rotation.y = Math.PI;
          }
          if (keys.ArrowDown) {
            model.position.z += moveSpeed;
            model.rotation.y = 0;
          }
          if (keys.ArrowLeft) {
            model.position.x -= moveSpeed;
            model.rotation.y = -Math.PI / 2;
          }
          if (keys.ArrowRight) {
            model.position.x += moveSpeed;
            model.rotation.y = Math.PI / 2;
          }
        } else {
          if (api.state === "Walking") {
            fadeToAction("Idle", 0.2);
            api.state = "Idle";
          }
        }

        if (keys.Space) jump();
      }

      if (mixer) mixer.update(dt);
      renderer.render(scene, camera);
      stats.update();
    };

    // Initialize the scene and all components
    const init = () => {
      initCamera();
      initScene();
      initLights();
      initGround();
      initRenderer();
      initStats();
      loadModel();
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("mousedown", onMouseDown); // Add left-click listener
      window.addEventListener("contextmenu", onContextMenu); // Add right-click listener
    };

    init();
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown); // Remove left-click listener
      window.removeEventListener("contextmenu", onContextMenu); // Remove right-click listener
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [movementData]); // Add movementData as a dependency

  return (
    <div
      ref={mountRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#1e1e1e", // Dark background for better contrast
      }}
    >
      {/* TfWebcam positioned at the bottom-left and made smaller */}
      <TfWebcam
        onMovementUpdate={handleMovementUpdate}
        style={{
          position: "absolute",
          bottom: "20px", // Distance from the bottom
          left: "20px", // Distance from the left
          width: "200px", // Smaller width
          height: "150px", // Smaller height
          borderRadius: "10px", // Rounded corners
          border: "2px solid #00ff88", // Border for better visibility
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)", // Subtle shadow
          objectFit: "cover", // Ensure the webcam feed covers the area
        }}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
            backgroundColor: "rgba(0, 0, 0, 0.7)", // Semi-transparent background
            padding: "20px 40px",
            borderRadius: "10px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)", // Subtle shadow for depth
          }}
        >
          Loading... {Math.round(progress)}%
          <div
            style={{
              marginTop: "10px",
              width: "200px",
              height: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#00ff88", // Vibrant progress bar color
                transition: "width 0.3s ease", // Smooth transition for progress
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeJSScene;