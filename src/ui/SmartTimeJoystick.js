import nipplejs from 'nipplejs';

export default class SmartTimeJoystick {
    constructor(onTimeSpeedChange) {
        this.onTimeSpeedChange = onTimeSpeedChange;
        
        // Animation and time control properties
        this.currentSpeed = 0; // Current time speed multiplier
        this.targetSpeed = 0; // Target speed for smooth interpolation
        this.direction = 1; // 1 for forward, -1 for backward
        this.isPlaying = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        
        // Enhanced logarithmic scale configuration - from seconds to months per second
        this.minSpeed = 0.01; // Minimum speed (0.01 seconds per second)
        this.maxSpeed = 2592000; // Maximum speed (~1 month per second: 30 days * 24 hours * 3600 seconds)
        this.speedSmoothness = 0.92; // Smoothing factor for speed transitions (slightly more responsive)
        
        // Joystick instance
        this.manager = null;
        
        this.create();
        this.setupEventListeners();
    }
    
    create() {
        // Use existing DOM elements from HTML
        const joystickZone = document.getElementById('time-joystick-zone');
        
        if (!joystickZone) {
            throw new Error('Time joystick zone element not found. Make sure the HTML structure is correct.');
        }
        
        // Initialize nipplejs on existing element
        this.manager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#ffffff',
            size: 80,
            threshold: 0.1,
            restJoystick: true,
            restOpacity: 0.7,
            catchDistance: 200
        });
        
        // Store DOM elements (they already exist in HTML)
        this.elements = {
            speedValue: document.getElementById('speed-value')
        };
        
        if (!this.elements.speedValue) {
            throw new Error('Speed value element not found. Make sure the HTML structure is correct.');
        }
    }
    
    setupEventListeners() {
        // Joystick events
        this.manager.on('start', () => {
            this.startAnimation();
        });
        
        this.manager.on('move', (evt, data) => {
            this.handleJoystickMove(data);
        });
        
        this.manager.on('end', () => {
            this.handleJoystickEnd();
        });
    }
    
    handleJoystickMove(data) {
        const { angle, distance } = data;
        
        // Normalize distance (0 to 1)
        const normalizedDistance = Math.min(distance / 40, 1); // 40px is our effective radius
        
        // Calculate direction based on angle
        // nipplejs angle: 0° = right, 90° = up, 180° = left, 270° = down
        const radians = angle.radian;
        const verticalComponent = -Math.sin(radians); // Negative because up should be positive
        
        // Determine direction (forward/backward based on vertical component)
        this.direction = verticalComponent >= 0 ? 1 : -1;
        
        // Calculate speed using logarithmic scale
        const speedIntensity = Math.abs(verticalComponent) * normalizedDistance;
        this.targetSpeed = this.calculateLogarithmicSpeed(speedIntensity);
        
        // Update display
        this.updateDisplay();
    }
    
    handleJoystickEnd() {
        // Stop animation and reset to neutral
        this.targetSpeed = 0;
        this.direction = 1;
        this.updateDisplay();
    }
    
    calculateLogarithmicSpeed(intensity) {
        if (intensity <= 0) return 0;
        
        // Enhanced logarithmic scale with quick drop-off for lower speeds
        // and months/second at maximum
        
        // Create multiple logarithmic zones for different time scales
        const logIntensity = Math.log10(1 + intensity * 99); // Maps 0-1 to 0-2 logarithmically
        const normalizedLog = logIntensity / 2; // Normalize back to 0-1
        
        // Apply power curve for even more dramatic scaling at low end
        const exponentialFactor = Math.pow(normalizedLog, 3.5); // Higher exponent for quicker drop-off
        
        return this.minSpeed * Math.pow(this.maxSpeed / this.minSpeed, exponentialFactor);
    }
    
    formatSpeed(speed) {
        if (speed === 0) return 'Paused';
        
        const absSpeed = Math.abs(speed);
        
        // Enhanced formatting with months, weeks, days, hours, minutes, seconds
        if (absSpeed < 1) {
            // Less than 1 second per second - show as fractions
            if (absSpeed < 0.1) {
                return `${(absSpeed * 100).toFixed(1)}cs/s`; // Centiseconds per second
            }
            return `${absSpeed.toFixed(2)}s/s`;
        } else if (absSpeed < 60) {
            return `${absSpeed.toFixed(1)}s/s`;
        } else if (absSpeed < 3600) {
            const minutes = absSpeed / 60;
            return `${minutes.toFixed(1)}min/s`;
        } else if (absSpeed < 86400) {
            const hours = absSpeed / 3600;
            return `${hours.toFixed(1)}h/s`;
        } else if (absSpeed < 604800) { // Less than 1 week per second
            const days = absSpeed / 86400;
            return `${days.toFixed(1)}d/s`;
        } else if (absSpeed < 2592000) { // Less than 1 month per second
            const weeks = absSpeed / 604800;
            return `${weeks.toFixed(1)}w/s`;
        } else {
            const months = absSpeed / 2592000;
            return `${months.toFixed(1)}mo/s`;
        }
    }
    
    updateDisplay() {
        // Format speed display with direction indicator
        const formattedSpeed = this.formatSpeed(Math.abs(this.currentSpeed));
        const directionIndicator = this.currentSpeed > 0 ? (this.direction > 0 ? '▶' : '◀') : '';
        
        this.elements.speedValue.textContent = `${directionIndicator} ${formattedSpeed}`.trim();
        
        // Color coding for direction
        if (this.direction > 0 && this.currentSpeed > 0) {
            this.elements.speedValue.style.color = '#4CAF50'; // Green for forward
        } else if (this.direction < 0 && this.currentSpeed > 0) {
            this.elements.speedValue.style.color = '#f44336'; // Red for backward
        } else {
            this.elements.speedValue.style.color = '#ffffff'; // Neutral white
        }
    }
    
    startAnimation() {
        if (this.animationFrameId) return; // Already running
        
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Smooth speed interpolation
        const speedDiff = this.targetSpeed - this.currentSpeed;
        this.currentSpeed += speedDiff * (1 - this.speedSmoothness);
        
        // Threshold to prevent tiny oscillations
        if (Math.abs(speedDiff) < 0.001) {
            this.currentSpeed = this.targetSpeed;
        }
        
        // Update display
        this.updateDisplay();
        
        // Calculate effective speed with direction
        const effectiveSpeed = this.currentSpeed * this.direction;
        
        // Notify time change callback with speed-based time increment
        if (this.onTimeSpeedChange && effectiveSpeed !== 0) {
            const timeIncrement = effectiveSpeed * deltaTime * 1000; // Convert to milliseconds
            this.onTimeSpeedChange(timeIncrement);
        }
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
    
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isPlaying = false;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.updateDisplay();
    }
    
    centerJoystick() {
        // Reset joystick to center and stop animation
        this.stopAnimation();
        if (this.manager && this.manager.get(0)) {
            this.manager.get(0).setPosition(null, { x: 0, y: 0 });
        }
    }
    
    resetTime() {
        // Stop animation and reset joystick
        this.centerJoystick();
        
        // This will be called by the parent TimeControls to reset the actual time
        if (this.onTimeSpeedChange) {
            this.onTimeSpeedChange(null, 'reset');
        }
    }
    
    // Get current state for external use
    getState() {
        return {
            speed: this.currentSpeed,
            direction: this.direction,
            isPlaying: this.isPlaying,
            effectiveSpeed: this.currentSpeed * this.direction
        };
    }
    
    // Cleanup
    dispose() {
        this.stopAnimation();
        
        if (this.manager) {
            this.manager.destroy();
            this.manager = null;
        }
        
        // Remove joystick elements
        const joystickZone = document.getElementById('joystick-zone');
        if (joystickZone) joystickZone.remove();
        
        const joystickInfo = document.querySelector('.joystick-info');
        if (joystickInfo) joystickInfo.remove();
    }
}
