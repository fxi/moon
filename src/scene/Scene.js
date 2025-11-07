import * as THREE from "three";
import Earth from "../objects/Earth.js";
import Moon from "../objects/Moon.js";
import Sun from "../objects/Sun.js";
import ViewerMarker from "../objects/ViewerMarker.js";
import AstronomicalCalculations from "../astronomy/AstronomicalCalculations.js";

export default class Scene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.lights = [];

    // Astronomical objects
    this.earth = null;
    this.moon = null;
    this.sun = null;
    this.viewerMarker = null;

    // Astronomical calculations
    this.astronomy = new AstronomicalCalculations();

    // Animation properties
    this.clock = new THREE.Clock();
    this.isRunning = true;

    // Current astronomical state
    this.currentTime = new Date();
    this.astronomicalState = null;

    this.init();
  }

  async init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupBackground();

    // Load astronomical objects
    await this.loadAstronomicalObjects();

    // Initial astronomical calculation
    this.updateAstronomicalState(this.currentTime);

    // Start animation loop
    this.animate();
  }

  setupRenderer() {
    // Create WebGL renderer
    const canvas = document.querySelector("#scene");
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      canvas,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable shadows for realistic lighting
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Tone mapping for better lighting
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    // Handle window resize
    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupCamera() {
    // Create orthographic camera for top-down view
    const frustumSize = 100; // Smaller frustum to better see Earth and Moon
    const aspect = window.innerWidth / window.innerHeight;

    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2, // left
      (frustumSize * aspect) / 2, // right
      frustumSize / 2, // top
      -frustumSize / 2, // bottom
      0.1, // near
      1000 // far
    );

    // Position camera directly above Earth for top-down view
    this.camera.position.set(0, 100, 0);
    this.camera.lookAt(0, 0, 0);

    // Set up zoom-only controls (no rotation)
    this.setupCameraControls();
  }

  setupCameraControls() {
    const canvas = this.renderer.domElement;

    // Zoom function for orthographic camera
    const zoom = (delta) => {
      const zoomSpeed = 10; // Zoom speed for orthographic camera
      const minZoom = 50; // Minimum zoom (closer view)
      const maxZoom = 400; // Maximum zoom (farther view)

      // Calculate new zoom level
      const currentZoom = this.camera.top * 2; // Current frustum height
      const newZoom = Math.max(
        minZoom,
        Math.min(maxZoom, currentZoom + delta * zoomSpeed)
      );

      // Update camera frustum
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.left = (-newZoom * aspect) / 2;
      this.camera.right = (newZoom * aspect) / 2;
      this.camera.top = newZoom / 2;
      this.camera.bottom = -newZoom / 2;
      this.camera.updateProjectionMatrix();
    };

    // Mouse wheel zoom
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1 : -1);
    });

    // Touch pinch zoom
    let initialPinchDistance = 0;
    let isPinching = false;

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    });

    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentPinchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const deltaDistance = currentPinchDistance - initialPinchDistance;
        zoom(-deltaDistance * 0.2); // Negative for intuitive pinch direction
        initialPinchDistance = currentPinchDistance;
      }
    });

    canvas.addEventListener("touchend", (e) => {
      if (e.touches.length < 2) {
        isPinching = false;
      }
    });

    // Prevent default touch behaviors
    canvas.addEventListener("touchstart", (e) => e.preventDefault(), {
      passive: false,
    });
    canvas.addEventListener("touchmove", (e) => e.preventDefault(), {
      passive: false,
    });
    canvas.addEventListener("touchend", (e) => e.preventDefault(), {
      passive: false,
    });
  }

  setupLights() {
    // Ambient light for basic illumination
    const ambientLight = new THREE.AmbientLight(0x111111, 0.1);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // The sun will act as the main directional light
    // This will be updated when the sun position changes
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(0, 0, 0); // Will be updated by sun position
    sunLight.castShadow = true;

    // Configure shadow map - optimized for Earth-Moon eclipse system
    sunLight.shadow.mapSize.width = 4096; // Higher resolution for crisp eclipse shadows
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200; // Shorter range focused on our system
    // Tighter bounds focused on Earth-Moon system (Earth radius ~6, Moon distance ~30)
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0005; // Adjusted bias for better shadow visibility
    sunLight.shadow.normalBias = 0.02; // Add normal bias to reduce shadow acne

    this.scene.add(sunLight);
    this.lights.push(sunLight);

    // Store reference to sun light for updates
    this.sunLight = sunLight;
  }

  setupBackground() {
    // Create starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      sizeAttenuation: false,
    });

    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
      // Random points on a sphere
      const radius = 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);

    // Set scene background to deep space color
    this.scene.background = new THREE.Color(0x000005);
  }

  async loadAstronomicalObjects() {
    try {
      // Create and load Earth
      this.earth = new Earth();
      await this.earth.load();
      this.scene.add(this.earth.mesh);

      // Create and load Moon
      this.moon = new Moon();
      await this.moon.load();
      this.scene.add(this.moon.mesh);

      // Create and load Sun
      this.sun = new Sun();
      await this.sun.load();
      this.scene.add(this.sun.mesh);
      this.scene.add(this.sun.light);

      // Create viewer marker
      this.viewerMarker = new ViewerMarker();
      this.scene.add(this.viewerMarker.mesh);

      console.log("All astronomical objects loaded successfully");
    } catch (error) {
      console.error("Error loading astronomical objects:", error);

      // Create fallback objects without textures
      this.createFallbackObjects();
    }
  }

  createFallbackObjects() {
    // Create simple colored spheres as fallbacks

    // Earth fallback
    const earthGeometry = new THREE.SphereGeometry(6.371, 32, 16);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x2233aa });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    this.scene.add(earthMesh);

    this.earth = {
      mesh: earthMesh,
      setPosition: (x, y, z) => earthMesh.position.set(x, y, z),
      setRotation: (r) => (earthMesh.rotation.y = r),
    };

    // Moon fallback
    const moonGeometry = new THREE.SphereGeometry(1.737, 16, 12);
    const moonMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    this.scene.add(moonMesh);

    this.moon = {
      mesh: moonMesh,
      setPosition: (x, y, z) => moonMesh.position.set(x, y, z),
    };

    // Sun fallback
    const sunGeometry = new THREE.SphereGeometry(20, 32, 16); // Smaller for visibility
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      emissive: 0xffaa00,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(sunMesh);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    this.sun = {
      mesh: sunMesh,
      light: sunLight,
      setPosition: (x, y, z) => {
        sunMesh.position.set(x, y, z);
        sunLight.position.set(x, y, z);
      },
    };

    // Viewer marker fallback
    const viewerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const viewerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0x220000,
    });
    const viewerMesh = new THREE.Mesh(viewerGeometry, viewerMaterial);
    this.scene.add(viewerMesh);

    this.viewerMarker = {
      mesh: viewerMesh,
      setEarthData: () => {},
      update: () => {},
    };
  }

  updateAstronomicalState(time) {
    // Calculate astronomical positions
    this.astronomicalState = this.astronomy.calculateAstronomicalState(time);

    const state = this.astronomicalState;

    // Always keep Earth centered at origin for top-down view
    const earthPos = new THREE.Vector3(0, 0, 0);

    // Calculate Moon position relative to Earth (scaled for visibility)
    const moonDistance = 30; // Scaled distance for visibility
    const earthToMoon = new THREE.Vector3().subVectors(
      state.positions.moon,
      state.positions.earth
    );
    earthToMoon.normalize().multiplyScalar(moonDistance);
    const moonPos = earthPos.clone().add(earthToMoon);

    // Calculate Sun position (much farther but still visible)
    const sunDistance = 80; // Scaled distance for visibility
    const earthToSun = new THREE.Vector3().subVectors(
      state.positions.sun,
      state.positions.earth
    );
    earthToSun.normalize().multiplyScalar(sunDistance);
    const sunPos = earthPos.clone().add(earthToSun);

    // Update Earth position and rotation (always at center)
    if (this.earth) {
      this.earth.setPosition(earthPos.x, earthPos.y, earthPos.z);
      this.earth.setRotation(state.rotations.earth);
    }

    // Update Moon position
    if (this.moon) {
      this.moon.setPosition(moonPos.x, moonPos.y, moonPos.z);
      if (this.moon.setEarthPosition) {
        this.moon.setEarthPosition(earthPos);
      }
    }

    // Update Sun position
    if (this.sun) {
      this.sun.setPosition(sunPos.x, sunPos.y, sunPos.z);
      if (this.sun.setTarget) {
        this.sun.setTarget(earthPos);
      }
    }

    // Update viewer marker
    if (this.viewerMarker) {
      this.viewerMarker.setEarthData(earthPos, state.rotations.earth);
    }

    // Update sun lighting
    this.updateSunLight(sunPos);

    // Store current time
    this.currentTime = time;
  }

  updateSunLight(sunPosition) {
    if (this.sunLight) {
      // Position the directional light at the sun's position
      this.sunLight.position.copy(sunPosition);
      this.sunLight.target.position.set(0, 0, 0); // Always point towards origin (Earth)
      this.sunLight.target.updateMatrixWorld();
      
      // Ensure shadow camera follows the light direction for optimal eclipse shadows
      // The shadow camera should be positioned along the light direction
      const lightDirection = new THREE.Vector3().subVectors(sunPosition, new THREE.Vector3(0, 0, 0)).normalize();
      
      // Position shadow camera closer to Earth-Moon system for tighter shadow focus
      const shadowCameraDistance = 60; // Distance from Earth center
      this.sunLight.shadow.camera.position.copy(lightDirection.multiplyScalar(shadowCameraDistance));
      this.sunLight.shadow.camera.lookAt(0, 0, 0); // Look at Earth
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }
  }

  animate() {
    if (!this.isRunning) return;

    const deltaTime = this.clock.getDelta();

    // Update objects
    if (this.earth && this.earth.update) {
      this.earth.update(deltaTime);
    }

    if (this.moon && this.moon.update) {
      this.moon.update(deltaTime);
    }

    if (this.sun && this.sun.update) {
      this.sun.update(deltaTime);
    }

    if (this.viewerMarker && this.viewerMarker.update) {
      this.viewerMarker.update(deltaTime);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Continue animation loop
    requestAnimationFrame(() => this.animate());
  }

  onWindowResize() {
    // Update orthographic camera frustum for new aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = this.camera.top * 2; // Current frustum height

    this.camera.left = (-frustumHeight * aspect) / 2;
    this.camera.right = (frustumHeight * aspect) / 2;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Public methods for external control
  setTime(time) {
    this.updateAstronomicalState(time);
  }

  getCurrentState() {
    return this.astronomicalState;
  }

  setViewerCoordinates(latitude, longitude) {
    this.astronomy.setViewerCoordinates(latitude, longitude);
    if (this.viewerMarker && this.viewerMarker.setCoordinates) {
      this.viewerMarker.setCoordinates(latitude, longitude);
    }
    // Recalculate with new viewer position
    this.updateAstronomicalState(this.currentTime);
  }

  getViewerCoordinates() {
    return this.astronomy.getViewerCoordinates();
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  dispose() {
    this.isRunning = false;

    // Dispose of astronomical objects
    if (this.earth && this.earth.dispose) this.earth.dispose();
    if (this.moon && this.moon.dispose) this.moon.dispose();
    if (this.sun && this.sun.dispose) this.sun.dispose();
    if (this.viewerMarker && this.viewerMarker.dispose)
      this.viewerMarker.dispose();

    // Clean up geometries, materials, textures
    this.scene.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => {
            if (material.map) material.map.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.roughnessMap) material.roughnessMap.dispose();
            material.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          if (child.material.normalMap) child.material.normalMap.dispose();
          if (child.material.roughnessMap)
            child.material.roughnessMap.dispose();
          child.material.dispose();
        }
      }
    });

    // Dispose renderer
    this.renderer.dispose();
  }
}
