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
    
    setRotation(rotationY) {
        if (this.mesh) {
            this.mesh.rotation.y = rotationY;
        }
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
