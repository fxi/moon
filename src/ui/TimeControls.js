import SmartTimeJoystick from './SmartTimeJoystick.js';

export default class TimeControls {
    constructor(onTimeChange) {
        this.onTimeChange = onTimeChange;
        this.currentTime = new Date();
        this.baseTime = new Date();
        
        // Smart joystick for time control
        this.joystick = null;
        
        this.elements = {};
        this.isUpdating = false;
        
        this.create();
        this.setupEventListeners();
    }
    
    create() {
        // Use existing HTML elements for date/time display
        this.elements.currentDate = document.getElementById('date');
        this.elements.currentTime = document.getElementById('time');
        
        // Create the smart joystick with callback for time speed changes
        this.joystick = new SmartTimeJoystick((timeIncrement, action) => {
            this.handleJoystickTimeChange(timeIncrement, action);
        });
        
        // Initial update
        this.updateDisplay();
    }
    
    setupEventListeners() {
        // No longer needed - joystick handles its own events
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
        if (!this.elements.currentDate || !this.elements.currentTime) return;
        
        // Format date
        const dateOptions = { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        this.elements.currentDate.textContent = this.currentTime.toLocaleDateString('en-US', dateOptions);
        
        // Format time
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        this.elements.currentTime.textContent = this.currentTime.toLocaleTimeString('en-US', timeOptions);
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
        this.stopPlayback();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
