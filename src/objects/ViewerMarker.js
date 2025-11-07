import * as THREE from 'three';

export default class ViewerMarker {
    constructor() {
        this.mesh = null;
        this.earthPosition = new THREE.Vector3(0, 0, 0);
        this.earthRotation = 0;
        this.radius =2; // Small red dot

        
        // Viewer coordinates (configurable)
        this.latitude = 46.2; // degrees
        this.longitude = 6.15; // degrees
        this.earthRadius = 6.371; // Match Earth's radius
        
        this.create();
    }
    
    create() {
        // Create small sphere for viewer position
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        
        // Create red material that stands out
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: false,
            // Make it glow slightly
            emissive: 0x220000,
            emissiveIntensity: 0.3
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = false; // Small object, no need for shadows
        this.mesh.receiveShadow = false;
        
        // Initial position calculation
        this.updatePosition();
    }
    
    // Update position based on Earth's position and rotation
    updatePosition() {
        if (!this.mesh) return;
        
        // Account for Earth's rotation
        const localRotation = - this.earthRotation + (this.longitude * Math.PI / 180);
        
        // Convert latitude to radians
        const lat = this.latitude * Math.PI / 180;
        
        // Calculate position on Earth's surface (slightly above surface)
        const surfaceOffset = 0.2; // Lift slightly above Earth's surface
        const effectiveRadius = this.earthRadius + surfaceOffset;
        
        const x = effectiveRadius * Math.cos(lat) * Math.cos(localRotation);
        const y = effectiveRadius * Math.sin(lat);
        const z = effectiveRadius * Math.cos(lat) * Math.sin(localRotation);
        
        // Add Earth's position to get world coordinates
        this.mesh.position.set(
            this.earthPosition.x + x,
            this.earthPosition.y + y,
            this.earthPosition.z + z
        );
    }
    
    // Update Earth reference data
    setEarthData(earthPosition, earthRotation) {
        this.earthPosition.copy(earthPosition);
        this.earthRotation = earthRotation;
        this.updatePosition();
    }
    
    // Set viewer coordinates
    setCoordinates(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.updatePosition();
    }
    
    // Get current coordinates
    getCoordinates() {
        return {
            latitude: this.latitude,
            longitude: this.longitude
        };
    }
    
    // Get world position
    getWorldPosition() {
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    }
    
    // Calculate local solar angles for this viewer position
    calculateSolarAngles(sunPosition) {
        if (!this.mesh) return { elevation: 0, azimuth: 0 };
        
        const viewerPosition = this.mesh.position;
        
        // Vector from viewer to Sun
        const toSun = new THREE.Vector3().subVectors(sunPosition, viewerPosition);
        toSun.normalize();
        
        // Calculate elevation (altitude) angle
        const elevation = Math.asin(toSun.y) * 180 / Math.PI;
        
        // Calculate azimuth angle (from North, clockwise)
        const azimuth = Math.atan2(toSun.x, toSun.z) * 180 / Math.PI;
        
        return { 
            elevation: elevation,
            azimuth: (azimuth + 360) % 360 // Normalize to 0-360 degrees
        };
    }
    
    // Check if Sun is visible from this position (above horizon)
    isSunVisible(sunPosition) {
        const angles = this.calculateSolarAngles(sunPosition);
        return angles.elevation > 0;
    }
    
    // Calculate local time zone offset effect (simplified)
    getLocalSolarTime(date, sunPosition) {
        const angles = this.calculateSolarAngles(sunPosition);
        
        // Solar noon occurs when Sun is due south (azimuth ≈ 180°) and at highest elevation
        const solarNoonOffset = (angles.azimuth - 180) / 15; // degrees to hours
        
        const localSolarTime = new Date(date.getTime() + solarNoonOffset * 60 * 60 * 1000);
        
        return {
            localTime: localSolarTime,
            solarNoonOffset: solarNoonOffset,
            isDaytime: this.isSunVisible(sunPosition),
            solarElevation: angles.elevation,
            solarAzimuth: angles.azimuth
        };
    }
    
    // Animate viewer marker (subtle pulsing effect)
    update(deltaTime) {
        if (!this.mesh) return;
        
        // Subtle pulsing effect to make it more visible
        const time = Date.now() * 0.003; // Slow pulsing
        const scale = 1 + Math.sin(time) * 0.1; // ±10% size variation
        this.mesh.scale.setScalar(scale);
    }
    
    // Set visibility
    setVisible(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }
    
    // Get distance to other celestial bodies
    getDistanceTo(otherPosition) {
        if (!this.mesh) return 0;
        return this.mesh.position.distanceTo(otherPosition);
    }
    
    // Check if Moon is visible from this position
    isMoonVisible(moonPosition, earthPosition) {
        if (!this.mesh) return false;
        
        const viewerPosition = this.mesh.position;
        
        // Vector from viewer to Moon
        const toMoon = new THREE.Vector3().subVectors(moonPosition, viewerPosition);
        
        // Vector from viewer to Earth center (should be below horizon)
        const toEarthCenter = new THREE.Vector3().subVectors(earthPosition, viewerPosition);
        
        // Normalize both vectors
        toMoon.normalize();
        toEarthCenter.normalize();
        
        // If angle between them is > 90°, Moon is above horizon
        const dotProduct = toMoon.dot(toEarthCenter);
        return dotProduct < 0; // Negative dot product means > 90° angle
    }
    
    // Calculate Moon elevation angle
    calculateMoonElevation(moonPosition) {
        if (!this.mesh) return 0;
        
        const viewerPosition = this.mesh.position;
        const toMoon = new THREE.Vector3().subVectors(moonPosition, viewerPosition);
        toMoon.normalize();
        
        // Moon elevation angle
        const elevation = Math.asin(toMoon.y) * 180 / Math.PI;
        return elevation;
    }
    
    // Get info string for debugging/display
    getInfoString(sunPosition, moonPosition) {
        if (!this.mesh) return 'Viewer: Not initialized';
        
        const solarAngles = this.calculateSolarAngles(sunPosition);
        const moonElevation = this.calculateMoonElevation(moonPosition);
        const sunVisible = this.isSunVisible(sunPosition);
        const moonVisible = this.isMoonVisible(moonPosition, this.earthPosition);
        
        return `Viewer (${this.latitude.toFixed(1)}°, ${this.longitude.toFixed(1)}°)\n` +
               `Sun: ${solarAngles.elevation.toFixed(1)}° elevation, ${solarAngles.azimuth.toFixed(1)}° azimuth ${sunVisible ? '☀️' : '🌙'}\n` +
               `Moon: ${moonElevation.toFixed(1)}° elevation ${moonVisible ? '🌙' : '🌑'}`;
    }
    
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
