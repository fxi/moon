import * as THREE from 'three';

export default class Earth {
    constructor() {
        this.mesh = null;
        this.redDot = null;
        this.radius = 8; // Larger Earth radius for better visibility in top-down view
        this.rotationSpeed = 0; // Will be set based on time
        this.texture = null;
        
        // Viewer position (longitude 45°)
        this.viewerLongitude = 45; // degrees
    }
    
    async load() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                `${import.meta.env.BASE_URL}earth_texture.jpg`,
                (texture) => {
                    this.texture = texture;
                    this.create();
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.error('Failed to load Earth texture:', error);
                    reject(error);
                }
            );
        });
    }
    
    create() {
        // Create Earth geometry
        const geometry = new THREE.SphereGeometry(this.radius, 64, 32);
        
        // Create Earth material
        const material = new THREE.MeshPhongMaterial({
            map: this.texture,
            shininess: 5,
            transparent: false
        });
        
        // Create Earth mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = false; // Earth doesn't cast shadow on itself
        this.mesh.receiveShadow = true; // Earth receives shadow from sun
        
        // Create red dot for viewer position
        this.createViewerDot();
        
        // Set initial rotation (Greenwich meridian facing +X initially)
        this.mesh.rotation.y = 0;
    }
    
    createViewerDot() {
        // Create a small red sphere for the viewer position
        const dotGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: false
        });
        
        this.redDot = new THREE.Mesh(dotGeometry, dotMaterial);
        
        // Position the red dot at longitude 45°
        this.updateViewerDotPosition();
        
        // Add red dot to Earth mesh so it rotates with Earth
        this.mesh.add(this.redDot);
    }
    
    updateViewerDotPosition() {
        if (!this.redDot) return;
        
        // Convert longitude to radians
        const longitudeRad = (this.viewerLongitude * Math.PI) / 180;
        
        // Position on Earth's surface (slightly above to be visible)
        const dotRadius = this.radius + 0.15;
        const x = dotRadius * Math.cos(longitudeRad);
        const z = dotRadius * Math.sin(longitudeRad);
        const y = 0; // At equator for simplicity
        
        this.redDot.position.set(x, y, z);
    }
    
    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }
    
    setRotation(rotationY, astronomicalState = null) {
        if (this.mesh) {
            // Apply daily rotation (around Earth's tilted axis)
            this.mesh.rotation.y = rotationY;
            
            // Apply axial tilt for seasons if astronomical state is provided
            if (astronomicalState) {
                this.applyAxialTilt(astronomicalState);
            }
        }
    }
    
    applyAxialTilt(astronomicalState) {
        if (!this.mesh || !astronomicalState) return;
        
        // Earth's axial tilt: 23.44 degrees
        const axialTilt = THREE.MathUtils.degToRad(23.44);
        
        // Calculate the direction to the sun to determine seasonal orientation
        const earthPos = astronomicalState.positions.earth;
        const sunPos = astronomicalState.positions.sun;
        
        // Vector from Earth to Sun (for determining seasonal orientation)
        const earthToSun = new THREE.Vector3().subVectors(sunPos, earthPos);
        earthToSun.normalize();
        
        // Earth's orbital position (for seasonal calculation)
        const daysSinceJ2000 = astronomicalState.daysSinceJ2000;
        
        // Earth's orbital angle around the Sun (0 = March equinox)
        // Adding 80.5 days to align with seasons (March 21 = day 80.5 approximately)
        const orbitalAngle = ((daysSinceJ2000 + 80.5) / 365.25) * 2 * Math.PI;
        
        // The tilt axis direction in space remains fixed
        // Pointing towards the North Star (Polaris)
        // We'll simulate this by keeping the tilt axis fixed relative to the ecliptic
        const tiltAxisX = Math.sin(orbitalAngle) * Math.sin(axialTilt);
        const tiltAxisY = Math.cos(axialTilt);
        const tiltAxisZ = Math.cos(orbitalAngle) * Math.sin(axialTilt);
        
        // Create rotation matrix for axial tilt
        // The tilt direction changes as Earth orbits the Sun
        const tiltMatrix = new THREE.Matrix4();
        
        // Create a rotation around the axis perpendicular to Earth-Sun line
        // This simulates how Earth's axis points in the same direction in space
        const perpendicular = new THREE.Vector3(0, 1, 0).cross(earthToSun);
        if (perpendicular.length() > 0.001) { // Avoid division by zero
            perpendicular.normalize();
            tiltMatrix.makeRotationAxis(perpendicular, axialTilt * Math.cos(orbitalAngle));
        }
        
        // Apply the tilt matrix to the Earth's local transform
        const currentRotation = this.mesh.rotation.y;
        this.mesh.rotation.set(0, currentRotation, 0);
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), axialTilt * Math.sin(orbitalAngle));
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), axialTilt * Math.cos(orbitalAngle));
    }
    
    update(deltaTime) {
        // Smooth rotation animation if needed
        if (this.rotationSpeed !== 0 && this.mesh) {
            this.mesh.rotation.y += this.rotationSpeed * deltaTime * 0.001;
        }
    }
    
    // Get current rotation in radians
    getRotation() {
        return this.mesh ? this.mesh.rotation.y : 0;
    }
    
    // Set viewer longitude (for future configurability)
    setViewerLongitude(longitude) {
        this.viewerLongitude = longitude;
        this.updateViewerDotPosition();
    }
    
    // Calculate local solar time at viewer position
    getLocalSolarTime(earthRotation, sunDirection) {
        // Convert sun direction to longitude
        const sunLongitude = Math.atan2(sunDirection.z, sunDirection.x) * (180 / Math.PI);
        
        // Calculate local solar time based on Earth rotation and sun position
        const earthRotationDegrees = (earthRotation * 180) / Math.PI;
        const localLongitude = this.viewerLongitude + earthRotationDegrees;
        
        // Time difference from solar noon
        const timeDifference = (localLongitude - sunLongitude) / 15; // 15 degrees per hour
        const localSolarHour = 12 - timeDifference; // Solar noon is at 12:00
        
        return ((localSolarHour % 24) + 24) % 24; // Ensure 0-24 range
    }
    
    dispose() {
        if (this.texture) {
            this.texture.dispose();
        }
        
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            
            if (this.redDot) {
                this.redDot.geometry.dispose();
                this.redDot.material.dispose();
            }
        }
    }
}
