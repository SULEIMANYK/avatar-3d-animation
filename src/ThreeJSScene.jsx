import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Posehand from "./posehand";

// Configuration object
const CONFIG = {
  camera: {
    fov: 45,
    near: 0.25,
    far: 200,
    position: new THREE.Vector3(-5, 3, 10),
    lookAt: new THREE.Vector3(0, 2, 0)
  },
  scene: {
    background: 0xe0e0e0,
    fog: { color: 0xe0e0e0, near: 20, far: 100 }
  },
  lights: {
    hemiLight: {
      color: 0xffffff,
      groundColor: 0x8d8d8d,
      intensity: 3,
      position: new THREE.Vector3(0, 20, 0)
    },
    dirLight: {
      color: 0xffffff,
      intensity: 3,
      position: new THREE.Vector3(0, 20, 10)
    }
  },
  ground: {
    size: { width: 2000, height: 2000 },
    material: { color: 0xcbcbcb, depthWrite: false }
  },
  grid: {
    size: 200,
    divisions: 40,
    color: 0x000000,
    opacity: 0.2
  },
  model: {
    url: "/models/Human.glb",
    scale: 1
  },
  animations: {
    states: ["Idle", "Walking", "Running", "Attacking_Idle", "Dagger_Attack", "Death", "PickUp", "Roll", "Run", "Walk"],
    emotes: ["Jump", "Yes", "No", "Wave", "Punch", "ThumbsUp"]
  },
  controls: {
    maxDistance: 20,
    minDistance: 2,
    maxPolarAngle: Math.PI / 2
  },
  movement: {
    walkingSpeed: 5,
    rotationSpeed: 5
  },
  performance: {
    shadows: true,
    antiAlias: true
  }
};

// Custom hooks
const useAnimationMixer = (model, animations) => {
  const mixer = useMemo(() => (model ? new THREE.AnimationMixer(model) : null), [model]);
  const actions = useMemo(() => {
    if (!mixer || !animations) return {};
    
    const actionsMap = {};
    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actionsMap[clip.name] = action;
      if (CONFIG.animations.emotes.includes(clip.name) || CONFIG.animations.states.indexOf(clip.name) >= 4) {
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
      }
    });
    return actionsMap;
  }, [mixer, animations]);

  return { mixer, actions };
};

const useThreeJSSetup = () => {
  const renderer = useMemo(() => {
    const renderer = new THREE.WebGLRenderer({
      antialias: CONFIG.performance.antiAlias,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = CONFIG.performance.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }, []);

  const camera = useMemo(() => {
    const camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.near,
      CONFIG.camera.far
    );
    camera.position.copy(CONFIG.camera.position);
    camera.lookAt(CONFIG.camera.lookAt);
    return camera;
  }, []);

  const scene = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.scene.background);
    scene.fog = new THREE.Fog(
      CONFIG.scene.fog.color,
      CONFIG.scene.fog.near,
      CONFIG.scene.fog.far
    );
    return scene;
  }, []);

  return { renderer, camera, scene };
};

// Main component
const ThreeJSScene = () => {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState(null);
  const [animations, setAnimations] = useState(null);
  const [isWalking, setIsWalking] = useState(false);
  const [movementData, setMovementData] = useState({
    thumbPose: null,
    handPose: null,
    headPose: null
  });

  const { renderer, camera, scene } = useThreeJSSetup();
  const { mixer, actions } = useAnimationMixer(model, animations);
  
  const activeActionRef = useRef(null);
  const previousActionRef = useRef(null);
  const walkingDirectionRef = useRef(new THREE.Vector3());
  const targetRotationRef = useRef(0);

  const handleMovementUpdate = useCallback((newMovementData) => {
    setMovementData(newMovementData);
    setIsWalking(newMovementData.handPose === "Hand Pose Detected");
  }, []);

  // Model loading
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      window.location.origin + CONFIG.model.url,
      (gltf) => {
        const loadedModel = gltf.scene;
        loadedModel.scale.setScalar(CONFIG.model.scale);
        loadedModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = true;
          }
        });
        setModel(loadedModel);
        setAnimations(gltf.animations);
        scene.add(loadedModel);
        setLoading(false);
      },
      (progressEvent) => {
        const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
        setProgress(percentComplete);
      },
      (error) => {
        console.error("Error loading model:", error);
        setLoading(false);
      }
    );
  }, [scene]);

  // Scene setup
  useEffect(() => {
    const { current: container } = mountRef;
    if (!container) return;

    // Setup renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxDistance = CONFIG.controls.maxDistance;
    controls.minDistance = CONFIG.controls.minDistance;
    controls.maxPolarAngle = CONFIG.controls.maxPolarAngle;
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Setup lights
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
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.far = 50;
    scene.add(dirLight);

    // Setup ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.ground.size.width, CONFIG.ground.size.height),
      new THREE.MeshPhongMaterial({
        ...CONFIG.ground.material,
        dithering: true
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(
      CONFIG.grid.size,
      CONFIG.grid.divisions,
      CONFIG.grid.color,
      CONFIG.grid.color
    );
    grid.material.opacity = CONFIG.grid.opacity;
    grid.material.transparent = true;
    scene.add(grid);

    // Setup stats
    const stats = new Stats();
    container.appendChild(stats.dom);

    // Animation loop
    const clock = new THREE.Clock();
    let frameId;

    const fadeToAction = (name, duration) => {
      previousActionRef.current = activeActionRef.current;
      activeActionRef.current = actions[name];

      if (previousActionRef.current !== activeActionRef.current) {
        previousActionRef.current?.fadeOut(duration);
      }

      activeActionRef.current
        ?.reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
    };

    const handleModelMovement = (delta) => {
      if (!model) return;

      if (isWalking) {
        // Get camera's forward direction
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        // Update walking direction
        walkingDirectionRef.current.copy(cameraDirection);

        // Calculate target rotation
        targetRotationRef.current = Math.atan2(cameraDirection.x, cameraDirection.z);

        // Smooth rotation
        const currentRotation = model.rotation.y;
        const rotationDiff = targetRotationRef.current - currentRotation;
        const normalizedDiff = ((rotationDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        model.rotation.y += normalizedDiff * CONFIG.movement.rotationSpeed * delta;

        // Move model
        const moveSpeed = CONFIG.movement.walkingSpeed * delta;
        model.position.add(walkingDirectionRef.current.multiplyScalar(moveSpeed));

        if (activeActionRef.current?.getClip().name !== "Walking") {
          fadeToAction("Walking", 0.2);
        }
      } else {
        if (activeActionRef.current?.getClip().name !== "Idle") {
          fadeToAction("Idle", 0.2);
        }
      }

      // Handle other poses
      if (movementData.thumbPose === "Thumb Movement Detected") {
        fadeToAction("Wave", 0.2);
      }
      if (movementData.headPose === "Head Pose Detected") {
        fadeToAction("Jump", 0.2);
      }
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      controls.update();

      if (mixer) {
        mixer.update(delta);
      }

      handleModelMovement(delta);

      renderer.render(scene, camera);
      stats.update();
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      container.removeChild(renderer.domElement);
      container.removeChild(stats.dom);
      renderer.dispose();
      controls.dispose();
    };
  }, [renderer, scene, camera, model, mixer, actions, isWalking, movementData]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, renderer]);

  return (
    <div ref={mountRef} style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <Posehand
        onMovementUpdate={handleMovementUpdate}
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          width: "200px",
          height: "150px"
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
            textAlign: "center"
          }}
        >
          Loading... {Math.round(progress)}%
          <div
            style={{
              marginTop: "10px",
              width: "200px",
              height: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "5px"
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#00ff88",
                borderRadius: "5px",
                transition: "width 0.3s ease"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeJSScene;