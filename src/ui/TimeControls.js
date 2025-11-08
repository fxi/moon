import SmartTimeJoystick from './SmartTimeJoystick.js';
import CameraControls from './CameraControls.js';

export default class TimeControls {
    constructor(onTimeChange, scene, urlParams = {}) {
        this.onTimeChange = onTimeChange;
        this.scene = scene; // Reference to Scene for camera control
        
        // Set initial time (from URL parameter or current time)
        this.currentTime = urlParams.date ? new Date(urlParams.date.getTime()) : new Date();
        this.baseTime = new Date();
        
        // Store URL parameters for camera controls
        this.urlParams = urlParams;
        
        // Time joystick and camera controls
        this.timeJoystick = null;
        this.cameraControls = null;
        
        this.elements = {};
        this.isUpdating = false;
        
        this.create();
        this.setupEventListeners();
        
        // If we have an initial date from URL, set the scene time
        if (urlParams.date && this.onTimeChange) {
            this.onTimeChange(this.currentTime);
        }
    }
    
    create() {
        // Use datetime input element
        this.elements.datetimeInput = document.getElementById('datetime-input');
        
        // Create the time control joystick (uses existing DOM elements)
        this.timeJoystick = new SmartTimeJoystick((timeIncrement, action) => {
            this.handleJoystickTimeChange(timeIncrement, action);
        });
        
        // Create the new camera controls (Tweakpane-based) with URL parameters
        this.cameraControls = new CameraControls((cameraState) => {
            this.handleCameraChange(cameraState);
        }, this.scene, this.urlParams);
        
        // Setup datetime input event listener
        this.setupDateTimeInput();
        
        // Initial update
        this.updateDisplay();
    }
    
    handleCameraChange(cameraState) {
        // Camera updates are handled directly by CameraControls
        // This method kept for compatibility
        console.log('Camera changed:', cameraState);
    }
    
    setupDateTimeInput() {
        if (!this.elements.datetimeInput) return;
        
        // Add event listener for datetime input changes
        this.elements.datetimeInput.addEventListener('change', (event) => {
            this.handleDateTimeInputChange(event.target.value);
        });
    }
    
    setupEventListeners() {
        // No longer needed - joystick handles its own events
    }
    
    handleDateTimeInputChange(inputValue) {
        if (this.isUpdating || !inputValue) return;
        
        // Parse the datetime-local input value to Date object
        this.currentTime = new Date(inputValue);
        
        // Notify listeners
        if (this.onTimeChange) {
            this.onTimeChange(this.currentTime);
        }
        
        console.log('Date/time changed via input:', this.currentTime);
    }
    
    handleJoystickTimeChange(timeIncrement, action) {
        if (action === 'reset') {
            // Handle reset action from joystick
            this.resetToNow();
            return;
        }
        
        if (timeIncrement !== null && timeIncrement !== 0) {
            // Apply time increment from joystick
            this.currentTime = new Date(this.currentTime.getTime() + timeIncrement);
            this.updateDisplay();
            
            // Notify listeners
            if (this.onTimeChange) {
                this.onTimeChange(this.currentTime);
            }
        }
    }
    
    updateDisplay() {
        if (!this.elements.datetimeInput) return;
        
        // Prevent circular updates
        this.isUpdating = true;
        
        // Format current time for datetime-local input (YYYY-MM-DDTHH:mm)
        const formattedDateTime = this.formatDateTimeForInput(this.currentTime);
        this.elements.datetimeInput.value = formattedDateTime;
        
        this.isUpdating = false;
    }
    
    formatDateTimeForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    resetToNow() {
        this.isUpdating = true;
        
        // Reset to current time
        this.baseTime = new Date();
        this.currentTime = new Date();
        
        this.isUpdating = false;
        
        // Update display and notify
        this.updateDisplay();
        if (this.onTimeChange) {
            this.onTimeChange(this.currentTime);
        }
    }
    
    // Get current time for external use
    getCurrentTime() {
        return this.currentTime;
    }
    
    // Set time externally
    setTime(newTime) {
        this.currentTime = new Date(newTime.getTime());
        this.baseTime = new Date();
        
        // Calculate offsets
        const timeDiff = this.currentTime.getTime() - this.baseTime.getTime();
        const totalHours = timeDiff / (60 * 60 * 1000);
        
        this.weekOffset = Math.floor(totalHours / (7 * 24));
        this.hourOffset = Math.floor(totalHours % (7 * 24));
        
        // Clamp to valid ranges
        this.weekOffset = Math.max(-25, Math.min(25, this.weekOffset));
        this.hourOffset = Math.max(0, Math.min(167, this.hourOffset));
        
        // Update sliders
        this.isUpdating = true;
        this.elements.weekSlider.value = this.weekOffset;
        this.elements.hourSlider.value = this.hourOffset;
        this.elements.weekValue.textContent = this.weekOffset;
        this.elements.hourValue.textContent = this.hourOffset;
        this.isUpdating = false;
        
        this.updateDisplay();
    }
    
    // Get formatted time info
    getTimeInfo() {
        return {
            date: this.currentTime,
            weekOffset: this.weekOffset,
            hourOffset: this.hourOffset,
            dayOfYear: Math.floor((this.currentTime - new Date(this.currentTime.getFullYear(), 0, 0)) / 86400000),
            hour: this.currentTime.getHours(),
            minute: this.currentTime.getMinutes()
        };
    }
    
    // Cleanup
    dispose() {
        // Clean up time joystick
        if (this.timeJoystick) {
            this.timeJoystick.dispose();
            this.timeJoystick = null;
        }
        
        // Clean up camera controls
        if (this.cameraControls) {
            this.cameraControls.dispose();
            this.cameraControls = null;
        }
        
        // Clean up any other resources
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
