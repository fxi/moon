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

    // Coordinate system ('geocentric', 'heliocentric', 'selenocentric')
    this.coordinateSystem = "geocentric";
    this.cameraTarget = new THREE.Vector3(0, 0, 0); // What the camera looks at

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
    // Create perspective camera for dynamic spherical view around Earth
    this.camera = new THREE.PerspectiveCamera(
      60, // field of view
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near
      1000 // far
    );

    // Camera control properties for spherical coordinates
    this.cameraDistance = 80; // Distance from Earth center
    this.minCameraDistance = 20; // Minimum zoom distance
    this.maxCameraDistance = 200; // Maximum zoom distance
    this.cameraPitch = 90; // Current pitch (elevation angle)
    this.cameraBearing = 0; // Current bearing (azimuth angle)

    // Position camera initially in top-down view
    this.updateCameraPosition();

    // Set up controls (zoom and joystick integration)
    this.setupCameraControls();
  }

  setupCameraControls() {
    const canvas = this.renderer.domElement;

    // Zoom function for perspective camera (distance-based)
    const zoom = (delta) => {
      const zoomSpeed = 5; // Zoom speed for distance changes
      const newDistance = Math.max(
        this.minCameraDistance,
        Math.min(
          this.maxCameraDistance,
          this.cameraDistance + delta * zoomSpeed
        )
      );

      this.cameraDistance = newDistance;
      this.updateCameraPosition();
    };

    // Mouse wheel zoom
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1 : -1);
    });

 
  }

  // Update camera position based on spherical coordinates around target
  updateCameraPosition() {
    // Convert spherical coordinates to Cartesian coordinates
    const pitchRadians = THREE.MathUtils.degToRad(this.cameraPitch);
    const bearingRadians = THREE.MathUtils.degToRad(this.cameraBearing);

    // Calculate position using spherical coordinates relative to camera target
    // Y is up, X/Z are horizontal plane
    const x =
      this.cameraDistance * Math.sin(pitchRadians) * Math.sin(bearingRadians);
    const y = this.cameraDistance * Math.cos(pitchRadians);
    const z =
      this.cameraDistance * Math.sin(pitchRadians) * Math.cos(bearingRadians);

    // Position camera relative to the current coordinate system center
    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget); // Look at the coordinate system center
  }

  // Set camera angles (called by CameraJoystick)
  setCameraAngles(pitch, bearing) {
    this.cameraPitch = pitch;
    this.cameraBearing = bearing;
    this.updateCameraPosition();
  }

  // Get current camera state
  getCameraState() {
    return {
      distance: this.cameraDistance,
      pitch: this.cameraPitch,
      bearing: this.cameraBearing,
    };
  }

  setupLights() {
    // Ambient light for basic illumination
    const ambientLight = new THREE.AmbientLight(0x111111, 0.1);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // The sun will act as a point light - like a big light bulb radiating in all directions
    // This is much more physically accurate than directional light
    // Using distance=0 for infinite range and higher intensity to compensate
    const sunLight = new THREE.PointLight(0xffffff, 10000, 0); // color, intensity, distance (0=infinite)
    sunLight.position.set(0, 0, 0); // Will be updated by sun position
    sunLight.castShadow = true;

    // Configure shadow map for point light
    sunLight.shadow.mapSize.width = 2048; // Good balance of quality vs performance
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1; // Point light shadow camera settings
    sunLight.shadow.camera.far = 300; // Cover our entire system
    sunLight.shadow.bias = -0.0005; // Reduce shadow acne

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
    }
  }
 
  updateAstronomicalState(time) {
    // Calculate astronomical positions
    this.astronomicalState = this.astronomy.calculateAstronomicalState(time);

    const state = this.astronomicalState;

    // Calculate positions based on coordinate system
    const positions = this.calculateCoordinateSystemPositions(state);

    // Update object positions
    if (this.earth) {
      this.earth.setPosition(
        positions.earth.x,
        positions.earth.y,
        positions.earth.z
      );
      // Pass the full astronomical state for seasonal tilt calculation
      this.earth.setRotation(state.rotations.earth, state);
    }

    if (this.moon) {
      this.moon.setPosition(
        positions.moon.x,
        positions.moon.y,
        positions.moon.z
      );
      if (this.moon.setEarthPosition) {
        this.moon.setEarthPosition(positions.earth);
      }
    }

    if (this.sun) {
      this.sun.setPosition(positions.sun.x, positions.sun.y, positions.sun.z);
      if (this.sun.setTarget) {
        this.sun.setTarget(positions.earth);
      }
    }

    // Update viewer marker (always relative to Earth)
    if (this.viewerMarker) {
      this.viewerMarker.setEarthData(positions.earth, state.rotations.earth);
    }

    // Update sun lighting
    this.updateSunLight(positions.sun);

    // Update camera target
    this.updateCameraTarget(positions);

    // Store current time
    this.currentTime = time;
  }

  updateSunLight(sunPosition) {
    if (this.sunLight) {
      // PointLight is simple - just position it at the sun's location
      // It automatically radiates light in all directions like a real star
      this.sunLight.position.copy(sunPosition);
      
      // No target needed for PointLight - it illuminates everything around it naturally!
      // This works perfectly in all coordinate systems without any special logic
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
    // Update perspective camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Calculate positions based on coordinate system
  calculateCoordinateSystemPositions(state) {
    const positions = {};

    switch (this.coordinateSystem) {
      case "geocentric":
        // Earth at center
        positions.earth = new THREE.Vector3(0, 0, 0);

        // Moon relative to Earth (scaled)
        const earthToMoon = new THREE.Vector3().subVectors(
          state.positions.moon,
          state.positions.earth
        );
        earthToMoon.normalize().multiplyScalar(30); // Scaled distance
        positions.moon = positions.earth.clone().add(earthToMoon);

        // Sun relative to Earth (scaled)
        const earthToSun = new THREE.Vector3().subVectors(
          state.positions.sun,
          state.positions.earth
        );
        earthToSun.normalize().multiplyScalar(80); // Scaled distance
        positions.sun = positions.earth.clone().add(earthToSun);
        break;

      case "heliocentric":
        // Sun at center
        positions.sun = new THREE.Vector3(0, 0, 0);

        // Earth relative to Sun (scaled)
        const sunToEarth = new THREE.Vector3().subVectors(
          state.positions.earth,
          state.positions.sun
        );
        sunToEarth.normalize().multiplyScalar(60); // Scaled distance for visibility
        positions.earth = positions.sun.clone().add(sunToEarth);

        // Moon orbits around Earth, not independently around Sun
        const earthToMoonHelio = new THREE.Vector3().subVectors(
          state.positions.moon,
          state.positions.earth
        );
        earthToMoonHelio.normalize().multiplyScalar(15); // Proper Earth-Moon distance (scaled for visibility)
        
        // Apply orbital inclination (5.14° relative to ecliptic plane)
        const inclination = THREE.MathUtils.degToRad(5.14);
        const moonOrbitRotation = new THREE.Matrix4().makeRotationX(inclination);
        earthToMoonHelio.applyMatrix4(moonOrbitRotation);
        
        positions.moon = positions.earth.clone().add(earthToMoonHelio);
        break;

      case "selenocentric":
        // Moon at center (selenocentric = Moon-centered)
        positions.moon = new THREE.Vector3(0, 0, 0);

        // Earth relative to Moon (scaled)
        const moonToEarth = new THREE.Vector3().subVectors(
          state.positions.earth,
          state.positions.moon
        );
        moonToEarth.normalize().multiplyScalar(25); // Scaled distance
        positions.earth = positions.moon.clone().add(moonToEarth);

        // Sun relative to Moon (scaled)
        const moonToSun = new THREE.Vector3().subVectors(
          state.positions.sun,
          state.positions.moon
        );
        moonToSun.normalize().multiplyScalar(80); // Scaled distance
        positions.sun = positions.moon.clone().add(moonToSun);
        break;

      default:
        console.warn(`Unknown coordinate system: ${this.coordinateSystem}`);
        // Fallback to geocentric
        return this.calculateCoordinateSystemPositions({
          ...state,
          coordinateSystem: "geocentric",
        });
    }

    return positions;
  }

  // Update camera target based on coordinate system
  updateCameraTarget(positions) {
    switch (this.coordinateSystem) {
      case "geocentric":
        this.cameraTarget.copy(positions.earth);
        break;
      case "heliocentric":
        this.cameraTarget.copy(positions.sun);
        break;
      case "selenocentric":
        this.cameraTarget.copy(positions.moon);
        break;
    }

    // Update camera position to reflect new target
    this.updateCameraPosition();
  }

  // Set coordinate system
  setCoordinateSystem(system) {
    if (["geocentric", "heliocentric", "selenocentric"].includes(system)) {
      this.coordinateSystem = system;

      // Adjust camera distances for different coordinate systems
      switch (system) {
        case "geocentric":
          this.minCameraDistance = 20;
          this.maxCameraDistance = 200;
          this.cameraDistance = Math.min(this.cameraDistance, 150);
          break;
        case "heliocentric":
          this.minCameraDistance = 30;
          this.maxCameraDistance = 300;
          this.cameraDistance = Math.max(this.cameraDistance, 120);
          break;
        case "selenocentric":
          this.minCameraDistance = 15;
          this.maxCameraDistance = 150;
          this.cameraDistance = Math.min(this.cameraDistance, 80);
          break;
      }

      // Recalculate positions
      this.updateAstronomicalState(this.currentTime);

      console.log(`Coordinate system changed to: ${system}`);
    } else {
      console.warn(`Invalid coordinate system: ${system}`);
    }
  }

  // Get current coordinate system
  getCoordinateSystem() {
    return this.coordinateSystem;
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
