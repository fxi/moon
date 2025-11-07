import * as THREE from 'three';

export default class AstronomicalCalculations {
    constructor() {
        // Constants for astronomical calculations
        this.EARTH_RADIUS = 6.371; // Earth radius in our scale
        this.MOON_RADIUS = 1.737; // Moon radius in our scale
        this.SUN_RADIUS = 109; // Sun radius in our scale (scaled down for visibility)
        
        // Orbital distances (scaled)
        this.EARTH_SUN_DISTANCE = 234.7; // 149.6M km scaled
        this.MOON_EARTH_DISTANCE = 60.27; // 384,400 km scaled
        
        // Orbital periods (in days)
        this.EARTH_ORBITAL_PERIOD = 365.25;
        this.MOON_ORBITAL_PERIOD = 27.32166;
        
        // Axial tilts and orientations
        this.EARTH_AXIAL_TILT = 23.44; // degrees
        this.MOON_ORBITAL_INCLINATION = 5.14; // degrees relative to ecliptic
        
        // Reference epoch (J2000.0)
        this.J2000 = new Date('2000-01-01T12:00:00Z');
        
        // Viewer position (configurable)
        this.viewerLatitude = 45.0; // degrees
        this.viewerLongitude = 45.0; // degrees (as red dot on Earth)
    }
    
    // Convert date to Julian Day Number
    dateToJulianDay(date) {
        const a = Math.floor((14 - (date.getUTCMonth() + 1)) / 12);
        const y = date.getUTCFullYear() + 4800 - a;
        const m = (date.getUTCMonth() + 1) + 12 * a - 3;
        
        return date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
               Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
               (date.getUTCHours() - 12) / 24 + date.getUTCMinutes() / 1440 + 
               date.getUTCSeconds() / 86400;
    }
    
    // Calculate days since J2000.0 epoch
    daysSinceJ2000(date) {
        const jd = this.dateToJulianDay(date);
        const j2000Jd = this.dateToJulianDay(this.J2000);
        return jd - j2000Jd;
    }
    
    // Calculate Earth's position in orbit around Sun
    calculateEarthPosition(date) {
        const days = this.daysSinceJ2000(date);
        
        // Mean anomaly of Earth
        const M = (357.5291 + 0.98560028 * days) * Math.PI / 180;
        
        // Equation of center (simplified)
        const C = (1.9148 * Math.sin(M) + 0.0200 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * Math.PI / 180;
        
        // True anomaly
        const nu = M + C;
        
        // Ecliptic longitude
        const lambda = (nu + 102.9373 * Math.PI / 180) % (2 * Math.PI);
        
        // Distance from Sun (simplified, assuming circular orbit)
        const r = this.EARTH_SUN_DISTANCE;
        
        // Convert to Cartesian coordinates (heliocentric)
        const x = r * Math.cos(lambda);
        const z = r * Math.sin(lambda);
        const y = 0; // Earth's orbital plane
        
        return new THREE.Vector3(x, y, z);
    }
    
    // Calculate Sun's apparent position from Earth's perspective
    calculateSunPosition(date, earthPosition) {
        // Sun appears opposite to Earth's orbital position
        return new THREE.Vector3(-earthPosition.x, -earthPosition.y, -earthPosition.z);
    }
    
    // Calculate Moon's position relative to Earth
    calculateMoonPosition(date, earthPosition) {
        const days = this.daysSinceJ2000(date);
        
        // Moon's mean longitude
        const L = (218.3164477 + 13.17639648 * days) * Math.PI / 180;
        
        // Moon's mean anomaly
        const M = (134.9633964 + 13.06499295 * days) * Math.PI / 180;
        
        // Sun's mean anomaly (for perturbations)
        const Ms = (357.5291 + 0.98560028 * days) * Math.PI / 180;
        
        // Moon's argument of latitude
        const F = (93.2720950 + 13.22935397 * days) * Math.PI / 180;
        
        // Longitude perturbations (simplified)
        const deltaL = (6.289 * Math.sin(M) - 
                       1.274 * Math.sin(M - 2 * (L - Ms)) +
                       0.658 * Math.sin(2 * (L - Ms)) -
                       0.186 * Math.sin(Ms) -
                       0.059 * Math.sin(2 * M - 2 * (L - Ms)) -
                       0.057 * Math.sin(M - 2 * (L - Ms) + Ms)) * Math.PI / 180;
        
        // Latitude perturbations (simplified)
        const deltaB = (5.128 * Math.sin(F) +
                       0.281 * Math.sin(M + F) +
                       0.278 * Math.sin(M - F) +
                       0.173 * Math.sin(2 * (L - Ms) - F)) * Math.PI / 180;
        
        // Distance perturbations (simplified, in Earth radii)
        const deltaR = (-20905 * Math.cos(M) -
                       3699 * Math.cos(2 * (L - Ms) - M) -
                       2956 * Math.cos(2 * (L - Ms)) -
                       570 * Math.cos(2 * M)) / 1000;
        
        // True longitude and latitude
        const lambdaM = L + deltaL;
        const betaM = deltaB;
        
        // Distance from Earth (in our scale)
        const r = this.MOON_EARTH_DISTANCE + deltaR * 0.01; // Scale factor for distance variations
        
        // Convert to Cartesian coordinates (geocentric)
        const x = r * Math.cos(betaM) * Math.cos(lambdaM);
        const y = r * Math.sin(betaM);
        const z = r * Math.cos(betaM) * Math.sin(lambdaM);
        
        // Add Earth's position to get heliocentric coordinates
        return new THREE.Vector3(
            earthPosition.x + x,
            earthPosition.y + y,
            earthPosition.z + z
        );
    }
    
    // Calculate Earth's rotation for given time
    calculateEarthRotation(date) {
        const days = this.daysSinceJ2000(date);
        
        // Greenwich Mean Sidereal Time
        const gmst = (18.697374558 + 24.06570982441908 * days) % 24;
        
        // Convert to radians and account for Earth's rotation
        const rotation = (gmst * 15) * Math.PI / 180; // 15 degrees per hour
        
        return rotation;
    }
    
    // Calculate viewer position on Earth (red dot at longitude 45°)
    calculateViewerPosition(date, earthPosition, earthRotation) {
        // Account for Earth's rotation
        const localRotation = earthRotation + (this.viewerLongitude * Math.PI / 180);
        
        // Convert latitude to radians
        const lat = this.viewerLatitude * Math.PI / 180;
        
        // Position on Earth's surface
        const x = this.EARTH_RADIUS * Math.cos(lat) * Math.cos(localRotation);
        const y = this.EARTH_RADIUS * Math.sin(lat);
        const z = this.EARTH_RADIUS * Math.cos(lat) * Math.sin(localRotation);
        
        // Add Earth's position
        return new THREE.Vector3(
            earthPosition.x + x,
            earthPosition.y + y,
            earthPosition.z + z
        );
    }
    
    // Calculate solar elevation and azimuth for viewer
    calculateSolarAngles(date, sunPosition, viewerPosition) {
        // Vector from viewer to Sun
        const toSun = new THREE.Vector3().subVectors(sunPosition, viewerPosition);
        toSun.normalize();
        
        // Calculate elevation (altitude) angle
        const elevation = Math.asin(toSun.y) * 180 / Math.PI;
        
        // Calculate azimuth angle
        const azimuth = Math.atan2(toSun.x, toSun.z) * 180 / Math.PI;
        
        return { elevation, azimuth };
    }
    
    // Calculate Moon phase based on Sun-Earth-Moon geometry
    calculateMoonPhase(sunPosition, earthPosition, moonPosition) {
        // Vectors from Earth
        const earthToSun = new THREE.Vector3().subVectors(sunPosition, earthPosition);
        const earthToMoon = new THREE.Vector3().subVectors(moonPosition, earthPosition);
        
        earthToSun.normalize();
        earthToMoon.normalize();
        
        // Phase angle (angle between Sun and Moon as seen from Earth)
        const phaseAngle = Math.acos(earthToSun.dot(earthToMoon));
        const phaseAngleDegrees = phaseAngle * 180 / Math.PI;
        
        // Illumination percentage
        const illumination = (1 + Math.cos(phaseAngle)) / 2;
        
        // Determine phase name
        let phaseName;
        if (phaseAngleDegrees < 22.5) phaseName = 'New Moon';
        else if (phaseAngleDegrees < 67.5) phaseName = 'Waxing Crescent';
        else if (phaseAngleDegrees < 112.5) phaseName = 'First Quarter';
        else if (phaseAngleDegrees < 157.5) phaseName = 'Waxing Gibbous';
        else if (phaseAngleDegrees < 202.5) phaseName = 'Full Moon';
        else if (phaseAngleDegrees < 247.5) phaseName = 'Waning Gibbous';
        else if (phaseAngleDegrees < 292.5) phaseName = 'Third Quarter';
        else if (phaseAngleDegrees < 337.5) phaseName = 'Waning Crescent';
        else phaseName = 'New Moon';
        
        return {
            name: phaseName,
            illumination: illumination,
            angle: phaseAngleDegrees
        };
    }
    
    // Check for eclipse conditions
    checkEclipses(sunPosition, earthPosition, moonPosition) {
        const earthToSun = new THREE.Vector3().subVectors(sunPosition, earthPosition);
        const earthToMoon = new THREE.Vector3().subVectors(moonPosition, earthPosition);
        const moonToSun = new THREE.Vector3().subVectors(sunPosition, moonPosition);
        const moonToEarth = new THREE.Vector3().subVectors(earthPosition, moonPosition);
        
        earthToSun.normalize();
        earthToMoon.normalize();
        moonToSun.normalize();
        moonToEarth.normalize();
        
        // Solar eclipse: Moon between Sun and Earth
        const solarEclipseDot = earthToSun.dot(earthToMoon);
        const solarEclipse = solarEclipseDot > 0.99; // Very close alignment
        
        // Lunar eclipse: Earth between Sun and Moon
        const lunarEclipseDot = moonToSun.dot(moonToEarth);
        const lunarEclipse = lunarEclipseDot > 0.99; // Very close alignment
        
        return {
            solar: solarEclipse,
            lunar: lunarEclipse,
            solarAlignment: solarEclipseDot,
            lunarAlignment: lunarEclipseDot
        };
    }
    
    // Calculate complete astronomical state for given time
    calculateAstronomicalState(date) {
        // Calculate primary positions
        const earthPosition = this.calculateEarthPosition(date);
        const sunPosition = this.calculateSunPosition(date, earthPosition);
        const moonPosition = this.calculateMoonPosition(date, earthPosition);
        
        // Calculate Earth's rotation
        const earthRotation = this.calculateEarthRotation(date);
        
        // Calculate viewer position
        const viewerPosition = this.calculateViewerPosition(date, earthPosition, earthRotation);
        
        // Calculate solar angles for viewer
        const solarAngles = this.calculateSolarAngles(date, sunPosition, viewerPosition);
        
        // Calculate Moon phase
        const moonPhase = this.calculateMoonPhase(sunPosition, earthPosition, moonPosition);
        
        // Check for eclipses
        const eclipses = this.checkEclipses(sunPosition, earthPosition, moonPosition);
        
        return {
            date: date,
            positions: {
                earth: earthPosition,
                sun: sunPosition,
                moon: moonPosition,
                viewer: viewerPosition
            },
            rotations: {
                earth: earthRotation
            },
            solar: solarAngles,
            moonPhase: moonPhase,
            eclipses: eclipses,
            julianDay: this.dateToJulianDay(date),
            daysSinceJ2000: this.daysSinceJ2000(date)
        };
    }
    
    // Update viewer coordinates
    setViewerCoordinates(latitude, longitude) {
        this.viewerLatitude = latitude;
        this.viewerLongitude = longitude;
    }
    
    // Get viewer coordinates
    getViewerCoordinates() {
        return {
            latitude: this.viewerLatitude,
            longitude: this.viewerLongitude
        };
    }
}
