import * as THREE from 'three';

export default class Sun {
    constructor() {
        this.mesh = null;
        this.light = null;
        this.radius = 15; // Scaled Sun radius for visibility in top-down view
        this.texture = null;
        
        // Solar properties
        this.luminosity = 1.0;
        this.temperature = 5778; // Kelvin (surface temperature)
        this.minDistance = 200; // Minimum distance from Earth for visibility
        this.maxDistance = 800; // Maximum distance from Earth
        
        // Orbital properties (Earth around Sun)
        this.earthOrbitalDistance = 234.7; // Scaled Earth orbital distance (149.6M km scaled)
    }
    
    async load() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                `${import.meta.env.BASE_URL}sun_texture.jpg`,
                (texture) => {
                    this.texture = texture;
                    this.create();
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.error('Failed to load Sun texture:', error);
                    // Create Sun without texture as fallback
                    this.create();
                    resolve();
                }
            );
        });
    }
    
    create() {
        // Create Sun geometry
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        
        // Create Sun material with emissive properties
        const material = new THREE.MeshBasicMaterial({
            map: this.texture, // Use texture if loaded
            color: 0xffdd44,
            transparent: false,
            // Make the Sun glow
            emissive: 0xffaa00,
            emissiveIntensity: 0.8
        });
        
        // Create Sun mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = false; // Sun doesn't cast shadow, it creates light
        this.mesh.receiveShadow = false; // Sun doesn't receive shadows
        
        // Create directional light from the Sun
        this.light = new THREE.DirectionalLight(0xffffff, 1.2);
        this.light.castShadow = true;
        
        // Configure shadow properties for quality
        this.light.shadow.mapSize.width = 2048;
        this.light.shadow.mapSize.height = 2048;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = 1000;
        this.light.shadow.camera.left = -200;
        this.light.shadow.camera.right = 200;
        this.light.shadow.camera.top = 200;
        this.light.shadow.camera.bottom = -200;
        this.light.shadow.bias = -0.0005;
        
        // Initial position
        this.mesh.position.set(this.earthOrbitalDistance, 0, 0);
        this.light.position.copy(this.mesh.position);
        
        // Make light look at Earth (0,0,0)
        this.light.target.position.set(0, 0, 0);
    }
    
    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
        if (this.light) {
            this.light.position.set(x, y, z);
        }
    }
    
    setTarget(targetPosition) {
        if (this.light) {
            this.light.target.position.copy(targetPosition);
        }
    }
    
    update(deltaTime) {
        // Sun doesn't rotate visibly due to distance and time scale
        // Could add subtle solar activity effects here if needed
    }
    
    // Calculate Sun's position relative to Earth based on time
    calculatePosition(time, earthPosition = new THREE.Vector3(0, 0, 0)) {
        // Earth orbital period: 365.25 days
        const orbitalPeriod = 365.25 * 24 * 60 * 60 * 1000; // in milliseconds
        const timeInOrbit = time.getTime() % orbitalPeriod;
        const orbitalAngle = (timeInOrbit / orbitalPeriod) * 2 * Math.PI;
        
        // Calculate position in Earth's orbit around Sun
        // From Earth's perspective, Sun appears to move around Earth
        const x = earthPosition.x + Math.cos(orbitalAngle) * this.earthOrbitalDistance;
        const z = earthPosition.z + Math.sin(orbitalAngle) * this.earthOrbitalDistance;
        const y = earthPosition.y; // Sun's ecliptic plane
        
        return { x, y, z, rotation: orbitalAngle };
    }
    
    // Calculate Sun's position based on date and time of day
    calculateSolarPosition(date, latitude = 45, longitude = 45) {
        // Day of year
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        
        // Solar declination (angle of Sun relative to Earth's equator)
        const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
        
        // Hour angle (Earth's rotation)
        const hours = date.getHours() + date.getMinutes() / 60;
        const hourAngle = 15 * (hours - 12); // 15 degrees per hour
        
        // Solar elevation angle
        const elevation = Math.asin(
            Math.sin(declination * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) +
            Math.cos(declination * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
        );
        
        // Solar azimuth angle
        const azimuth = Math.atan2(
            Math.sin(hourAngle * Math.PI / 180),
            Math.cos(hourAngle * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) - Math.tan(declination * Math.PI / 180) * Math.cos(latitude * Math.PI / 180)
        );
        
        // Convert to 3D position
        const distance = this.earthOrbitalDistance;
        const x = distance * Math.cos(elevation) * Math.sin(azimuth);
        const y = distance * Math.sin(elevation);
        const z = distance * Math.cos(elevation) * Math.cos(azimuth);
        
        return {
            x, y, z,
            elevation: elevation * 180 / Math.PI,
            azimuth: azimuth * 180 / Math.PI,
            declination
        };
    }
    
    // Get distance to Earth
    getDistanceToEarth(earthPosition = new THREE.Vector3(0, 0, 0)) {
        if (!this.mesh) return this.earthOrbitalDistance;
        
        const distance = this.mesh.position.distanceTo(earthPosition);
        return distance;
    }
    
    // Check if Sun is visible from Earth position
    isVisible(earthPosition = new THREE.Vector3(0, 0, 0)) {
        if (!this.mesh) return false;
        
        const distance = this.getDistanceToEarth(earthPosition);
        return distance >= this.minDistance && distance <= this.maxDistance;
    }
    
    // Calculate solar intensity based on distance
    calculateIntensity(earthPosition = new THREE.Vector3(0, 0, 0)) {
        const distance = this.getDistanceToEarth(earthPosition);
        const normalizedDistance = distance / this.earthOrbitalDistance;
        
        // Inverse square law for light intensity
        const intensity = this.luminosity / (normalizedDistance * normalizedDistance);
        
        return Math.max(0.1, Math.min(2.0, intensity)); // Clamp between 0.1 and 2.0
    }
    
    // Update light intensity based on position
    updateLightIntensity(earthPosition = new THREE.Vector3(0, 0, 0)) {
        if (!this.light) return;
        
        const intensity = this.calculateIntensity(earthPosition);
        this.light.intensity = intensity;
    }
    
    // Check if causing solar eclipse (Sun-Moon-Earth alignment)
    isCausingSolarEclipse(moonPosition, earthPosition = new THREE.Vector3(0, 0, 0)) {
        if (!this.mesh) return false;
        
        const sunPosition = this.mesh.position;
        
        // Vectors from Sun
        const sunToMoon = new THREE.Vector3().subVectors(moonPosition, sunPosition);
        const sunToEarth = new THREE.Vector3().subVectors(earthPosition, sunPosition);
        
        // Check if Moon is roughly between Sun and Earth
        sunToMoon.normalize();
        sunToEarth.normalize();
        
        const dotProduct = sunToMoon.dot(sunToEarth);
        
        // If dot product is close to 1, Moon is between Sun and Earth
        return dotProduct > 0.98;
    }
    
    // Get solar color based on elevation (atmospheric effects simulation)
    getSolarColor(elevation) {
        // Simulate atmospheric scattering
        if (elevation < 0) {
            // Sun below horizon - very dim red
            return new THREE.Color(0x440000);
        } else if (elevation < 10) {
            // Low sun - orange/red
            return new THREE.Color(0xff4400);
        } else if (elevation < 30) {
            // Rising/setting sun - yellow/orange
            return new THREE.Color(0xffaa00);
        } else {
            // High sun - white/yellow
            return new THREE.Color(0xffffee);
        }
    }
    
    // Update Sun appearance based on atmospheric conditions
    updateAppearance(elevation) {
        if (!this.mesh || !this.light) return;
        
        const solarColor = this.getSolarColor(elevation);
        
        // Update mesh color
        this.mesh.material.color.copy(solarColor);
        this.mesh.material.emissive.copy(solarColor);
        this.mesh.material.emissiveIntensity = elevation > 0 ? 0.8 : 0.2;
        
        // Update light color
        this.light.color.copy(solarColor);
    }
    
    // Add solar flare effect (optional visual enhancement)
    addSolarFlare(scene) {
        // Could add particle effects or lens flares here
        // For now, just increase emissive intensity briefly
        if (this.mesh) {
            const originalIntensity = this.mesh.material.emissiveIntensity;
            this.mesh.material.emissiveIntensity = Math.min(1.5, originalIntensity * 1.3);
            
            // Reset after brief time
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.material.emissiveIntensity = originalIntensity;
                }
            }, 100);
        }
    }
    
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        if (this.light) {
            this.light.dispose();
        }
    }
}
