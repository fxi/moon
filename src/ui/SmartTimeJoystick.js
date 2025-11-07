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
        
        // Logarithmic scale configuration
        this.minSpeed = 0.001; // Minimum speed (very slow)
        this.maxSpeed = 86400; // Maximum speed (1 day per second)
        this.speedSmoothness = 0.95; // Smoothing factor for speed transitions
        
        // Joystick instance
        this.manager = null;
        
        this.create();
        this.setupEventListeners();
    }
    
    create() {
        // Create joystick container
        const controlsContainer = document.getElementById('controls');
        
        // Replace existing control groups with joystick zone
        const existingGroups = controlsContainer.querySelectorAll('.control-group');
        existingGroups.forEach(group => group.remove());
        
        // Create joystick zone
        const joystickZone = document.createElement('div');
        joystickZone.id = 'joystick-zone';
        joystickZone.className = 'joystick-zone';
        controlsContainer.appendChild(joystickZone);
        
        // Create info display
        const infoDisplay = document.createElement('div');
        infoDisplay.className = 'joystick-info';
        infoDisplay.innerHTML = `
            <div class="speed-display">
                <span class="label">Speed:</span>
                <span id="speed-value">Paused</span>
            </div>
            <div class="direction-display">
                <span class="label">Direction:</span>
                <span id="direction-value">Neutral</span>
            </div>
            <div class="instruction">
                Move joystick: Up/Down = Forward/Backward, Distance = Speed
            </div>
        `;
        controlsContainer.appendChild(infoDisplay);
        
        // Create control buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'control-buttons';
        buttonGroup.innerHTML = `
            <button id="resetTime" class="btn btn-reset">Reset to Now</button>
            <button id="centerJoystick" class="btn btn-center">Center Joystick</button>
        `;
        controlsContainer.appendChild(buttonGroup);
        
        // Initialize nipplejs
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
        
        // Store DOM elements
        this.elements = {
            speedValue: document.getElementById('speed-value'),
            directionValue: document.getElementById('direction-value'),
            resetButton: document.getElementById('resetTime'),
            centerButton: document.getElementById('centerJoystick')
        };
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
        
        // Button events
        this.elements.resetButton.addEventListener('click', () => {
            this.resetTime();
        });
        
        this.elements.centerButton.addEventListener('click', () => {
            this.centerJoystick();
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
        
        // Logarithmic scale: slow at low intensities, fast at high intensities
        // Using exponential mapping for smooth feel
        const exponentialFactor = Math.pow(intensity, 2.5); // Curve the response
        return this.minSpeed + (this.maxSpeed - this.minSpeed) * exponentialFactor;
    }
    
    formatSpeed(speed) {
        if (speed === 0) return 'Paused';
        
        if (speed < 1) {
            // Less than 1 second per second - show as fractions
            const minutes = speed * 60;
            if (minutes < 1) {
                const seconds = minutes * 60;
                return `${seconds.toFixed(1)}s/s`;
            }
            return `${minutes.toFixed(1)}min/s`;
        } else if (speed < 60) {
            return `${speed.toFixed(1)}s/s`;
        } else if (speed < 3600) {
            const minutes = speed / 60;
            return `${minutes.toFixed(1)}min/s`;
        } else if (speed < 86400) {
            const hours = speed / 3600;
            return `${hours.toFixed(1)}h/s`;
        } else {
            const days = speed / 86400;
            return `${days.toFixed(1)}d/s`;
        }
    }
    
    updateDisplay() {
        const effectiveSpeed = this.currentSpeed * this.direction;
        
        this.elements.speedValue.textContent = this.formatSpeed(Math.abs(this.currentSpeed));
        
        if (this.currentSpeed === 0) {
            this.elements.directionValue.textContent = 'Neutral';
        } else {
            this.elements.directionValue.textContent = this.direction > 0 ? 'Forward' : 'Backward';
        }
        
        // Color coding for direction
        if (this.direction > 0 && this.currentSpeed > 0) {
            this.elements.directionValue.style.color = '#4CAF50'; // Green for forward
        } else if (this.direction < 0 && this.currentSpeed > 0) {
            this.elements.directionValue.style.color = '#f44336'; // Red for backward
        } else {
            this.elements.directionValue.style.color = '#cccccc'; // Neutral
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
