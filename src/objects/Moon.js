import * as THREE from 'three';

export default class Moon {
    constructor() {
        this.mesh = null;
        this.radius = 3; // Larger Moon radius for better visibility in top-down view
        this.texture = null;
        this.earthPosition = new THREE.Vector3(0, 0, 0);
        
        // Orbital properties
        this.orbitalDistance = 60.27; // Scaled distance from Earth (384,400 km scaled)
        this.orbitalSpeed = 0; // Will be calculated
    }
    
    async load() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                `${import.meta.env.BASE_URL}moon_texture.jpg`,
                (texture) => {
                    this.texture = texture;
                    this.create();
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.error('Failed to load Moon texture:', error);
                    reject(error);
                }
            );
        });
    }
    
    create() {
        // Create Moon geometry
        const geometry = new THREE.SphereGeometry(this.radius, 32, 16);
        
        // Create Moon material
        const material = new THREE.MeshPhongMaterial({
            map: this.texture,
            shininess: 1,
            transparent: false
        });
        
        // Create Moon mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true; // Moon casts shadow
        this.mesh.receiveShadow = true; // Moon receives shadow from sun
        
        // Initial position (will be updated by astronomical calculations)
        this.mesh.position.set(this.orbitalDistance, 0, 0);
    }
    
    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }
    
    setRotation(rotationY) {
        if (this.mesh) {
            // Tidal locking: Moon always shows same face to Earth
            // Calculate the angle to always face Earth
            const moonPosition = this.mesh.position;
            const directionToEarth = new THREE.Vector3().subVectors(this.earthPosition, moonPosition);
            const angle = Math.atan2(directionToEarth.z, directionToEarth.x);
            
            // Apply tidal locking rotation
            this.mesh.rotation.y = angle + Math.PI; // +π to face the correct direction
        }
    }
    
    update(deltaTime) {
        // Update tidal locking if position has changed
        this.updateTidalLocking();
    }
    
    updateTidalLocking() {
        if (!this.mesh) return;
        
        // Calculate direction to Earth for tidal locking
        const moonPosition = this.mesh.position;
        const directionToEarth = new THREE.Vector3().subVectors(this.earthPosition, moonPosition);
        const angle = Math.atan2(directionToEarth.z, directionToEarth.x);
        
        // Apply tidal locking rotation smoothly
        this.mesh.rotation.y = angle + Math.PI;
    }
    
    // Set Earth position for tidal locking calculations
    setEarthPosition(earthPosition) {
        this.earthPosition.copy(earthPosition);
        this.updateTidalLocking();
    }
    
    // Calculate Moon's position based on orbital mechanics
    calculateOrbitalPosition(time, earthPosition) {
        // Moon orbital period: approximately 27.3 days
        const orbitalPeriod = 27.32166 * 24 * 60 * 60 * 1000; // in milliseconds
        const timeInOrbit = time.getTime() % orbitalPeriod;
        const orbitalAngle = (timeInOrbit / orbitalPeriod) * 2 * Math.PI;
        
        // Calculate position in orbit around Earth
        const x = earthPosition.x + Math.cos(orbitalAngle) * this.orbitalDistance;
        const z = earthPosition.z + Math.sin(orbitalAngle) * this.orbitalDistance;
        const y = earthPosition.y + Math.sin(orbitalAngle * 0.1) * 2; // Slight orbital inclination
        
        return { x, y, z, rotation: orbitalAngle };
    }
    
    // Get distance to Earth
    getDistanceToEarth() {
        if (!this.mesh) return this.orbitalDistance;
        
        const distance = this.mesh.position.distanceTo(this.earthPosition);
        return distance;
    }
    
    // Check if Moon is between Earth and Sun (lunar eclipse possibility)
    isEclipsingEarth(sunPosition) {
        if (!this.mesh) return false;
        
        const moonPosition = this.mesh.position;
        const earthToSun = new THREE.Vector3().subVectors(sunPosition, this.earthPosition);
        const earthToMoon = new THREE.Vector3().subVectors(moonPosition, this.earthPosition);
        
        // Check if Moon is roughly in line between Earth and Sun
        earthToSun.normalize();
        earthToMoon.normalize();
        
        const dotProduct = earthToSun.dot(earthToMoon);
        
        // If dot product is close to -1, Moon is between Earth and Sun
        return dotProduct < -0.95;
    }
    
    // Check if Earth is between Moon and Sun (solar eclipse possibility)
    isEclipsingSun(sunPosition) {
        if (!this.mesh) return false;
        
        const moonPosition = this.mesh.position;
        const moonToSun = new THREE.Vector3().subVectors(sunPosition, moonPosition);
        const moonToEarth = new THREE.Vector3().subVectors(this.earthPosition, moonPosition);
        
        // Check if Earth is roughly in line between Moon and Sun
        moonToSun.normalize();
        moonToEarth.normalize();
        
        const dotProduct = moonToSun.dot(moonToEarth);
        
        // If dot product is close to 1, Earth is between Moon and Sun
        return dotProduct > 0.95;
    }
    
    // Get Moon phase based on Sun-Earth-Moon angle
    getMoonPhase(sunPosition) {
        if (!this.mesh) return 'Unknown';
        
        const moonPosition = this.mesh.position;
        
        // Vectors from Earth
        const earthToSun = new THREE.Vector3().subVectors(sunPosition, this.earthPosition);
        const earthToMoon = new THREE.Vector3().subVectors(moonPosition, this.earthPosition);
        
        // Calculate angle between Sun and Moon as seen from Earth
        earthToSun.normalize();
        earthToMoon.normalize();
        
        const angle = Math.acos(earthToSun.dot(earthToMoon));
        const angleDegrees = (angle * 180) / Math.PI;
        
        // Determine phase based on angle
        if (angleDegrees < 22.5) return 'New Moon';
        else if (angleDegrees < 67.5) return 'Waxing Crescent';
        else if (angleDegrees < 112.5) return 'First Quarter';
        else if (angleDegrees < 157.5) return 'Waxing Gibbous';
        else if (angleDegrees < 202.5) return 'Full Moon';
        else if (angleDegrees < 247.5) return 'Waning Gibbous';
        else if (angleDegrees < 292.5) return 'Third Quarter';
        else if (angleDegrees < 337.5) return 'Waning Crescent';
        else return 'New Moon';
    }
    
    dispose() {
        if (this.texture) {
            this.texture.dispose();
        }
        
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
