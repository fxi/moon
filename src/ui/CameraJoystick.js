import nipplejs from 'nipplejs';

export default class CameraJoystick {
    constructor(onCameraChange) {
        this.onCameraChange = onCameraChange;
        
        // Camera control properties
        this.currentPitch = 90; // Start with top-down view (90 degrees)
        this.currentBearing = 0; // Start facing north
        this.targetPitch = 90;
        this.targetBearing = 0;
        
        // Movement constraints
        this.minPitch = 15; // Minimum elevation (almost horizontal)
        this.maxPitch = 90; // Maximum elevation (top-down)
        this.pitchSensitivity = 75; // Degrees range for full joystick travel
        this.bearingSensitivity = 180; // Degrees range for full joystick travel
        
        // Smoothing properties
        this.smoothness = 0.85; // Camera movement smoothness
        this.isActive = false;
        this.animationFrameId = null;
        
        // Joystick instance
        this.manager = null;
        
        this.create();
        this.setupEventListeners();
    }
    
    create() {
        // Use existing DOM element from HTML
        const cameraJoystickZone = document.getElementById('camera-joystick-zone');
        
        if (!cameraJoystickZone) {
            throw new Error('Camera joystick zone element not found. Make sure the HTML structure is correct.');
        }
        
        // Initialize nipplejs on existing element
        this.manager = nipplejs.create({
            zone: cameraJoystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#4CAF50', // Green for camera control
            size: 80,
            threshold: 0.1,
            restJoystick: true,
            restOpacity: 0.7,
            catchDistance: 200
        });
        
        // Store reference to the existing element
        this.element = cameraJoystickZone;
    }
    
    setupEventListeners() {
        // Joystick events
        this.manager.on('start', () => {
            this.isActive = true;
            this.startAnimation();
        });
        
        this.manager.on('move', (evt, data) => {
            this.handleJoystickMove(data);
        });
        
        this.manager.on('end', () => {
            this.isActive = false;
            // Camera stays at current position, no reset to center
        });
    }
    
    handleJoystickMove(data) {
        const { angle, distance } = data;
        
        // Normalize distance (0 to 1)
        const normalizedDistance = Math.min(distance / 40, 1); // 40px is our effective radius
        
        // Calculate movement components
        // nipplejs angle: 0° = right, 90° = up, 180° = left, 270° = down
        const radians = angle.radian;
        const horizontalComponent = Math.cos(radians); // Right/Left for bearing
        const verticalComponent = -Math.sin(radians); // Up/Down for pitch (negative for correct direction)
        
        // Calculate target bearing (horizontal rotation around Earth)
        const bearingDelta = horizontalComponent * normalizedDistance * this.bearingSensitivity;
        this.targetBearing = this.currentBearing + bearingDelta;
        
        // Normalize bearing to 0-360 degrees
        this.targetBearing = ((this.targetBearing % 360) + 360) % 360;
        
        // Calculate target pitch (vertical angle)
        const pitchDelta = verticalComponent * normalizedDistance * this.pitchSensitivity;
        this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.currentPitch + pitchDelta));
    }
    
    startAnimation() {
        if (this.animationFrameId) return; // Already running
        
        this.animate();
    }
    
    animate() {
        // Smooth interpolation to target values
        const pitchDiff = this.targetPitch - this.currentPitch;
        const bearingDiff = this.targetBearing - this.currentBearing;
        
        // Handle bearing wrap-around (shortest path)
        let normalizedBearingDiff = bearingDiff;
        if (Math.abs(bearingDiff) > 180) {
            normalizedBearingDiff = bearingDiff > 0 ? bearingDiff - 360 : bearingDiff + 360;
        }
        
        // Apply smoothing
        this.currentPitch += pitchDiff * (1 - this.smoothness);
        this.currentBearing += normalizedBearingDiff * (1 - this.smoothness);
        
        // Normalize bearing
        this.currentBearing = ((this.currentBearing % 360) + 360) % 360;
        
        // Threshold to prevent tiny oscillations
        if (Math.abs(pitchDiff) < 0.1 && Math.abs(normalizedBearingDiff) < 0.1 && !this.isActive) {
            this.currentPitch = this.targetPitch;
            this.currentBearing = this.targetBearing;
            this.animationFrameId = null;
            return;
        }
        
        // Notify camera change callback
        if (this.onCameraChange) {
            this.onCameraChange({
                pitch: this.currentPitch,
                bearing: this.currentBearing
            });
        }
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
    
    // Reset camera to default top-down view
    resetCamera() {
        this.targetPitch = 90; // Top-down
        this.targetBearing = 0; // North
        
        if (!this.animationFrameId) {
            this.startAnimation();
        }
    }
    
    // Get current camera state
    getCameraState() {
        return {
            pitch: this.currentPitch,
            bearing: this.currentBearing,
            isActive: this.isActive
        };
    }
    
    // Set camera state externally
    setCameraState(pitch, bearing) {
        this.currentPitch = Math.max(this.minPitch, Math.min(this.maxPitch, pitch));
        this.currentBearing = ((bearing % 360) + 360) % 360;
        this.targetPitch = this.currentPitch;
        this.targetBearing = this.currentBearing;
        
        if (this.onCameraChange) {
            this.onCameraChange({
                pitch: this.currentPitch,
                bearing: this.currentBearing
            });
        }
    }
    
    // Get the DOM element for parent to append
    getElement() {
        return this.element;
    }
    
    // Cleanup
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.manager) {
            this.manager.destroy();
            this.manager = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
