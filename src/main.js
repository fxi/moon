import '../styles/main.css';
import Scene from './scene/Scene.js';
import TimeControls from './ui/TimeControls.js';

class MoonEarthSunApp {
    constructor() {
        this.scene = null;
        this.timeControls = null;
        
        // Animation
        this.animationId = null;
        this.lastTime = 0;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🌍 Initializing Moon Earth Sun Model...');
            
            // Initialize the 3D scene
            this.scene = new Scene();
            
            // Wait for scene to be fully loaded
            await this.waitForSceneLoad();
            
            // Initialize time controls UI
            this.timeControls = new TimeControls((time) => {
                this.onTimeChange(time);
            });
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('🌍 Moon Earth Sun Model initialized successfully!');
            console.log('✨ Use the time controls to navigate through time!');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showErrorMessage(error);
        }
    }
    
    async waitForSceneLoad() {
        // Wait a moment for the scene to initialize
        return new Promise((resolve) => {
            const checkScene = () => {
                if (this.scene && this.scene.earth && this.scene.moon && this.scene.sun) {
                    resolve();
                } else {
                    setTimeout(checkScene, 100);
                }
            };
            checkScene();
        });
    }
    
    onTimeChange(time) {
        if (this.scene) {
            this.scene.setTime(time);
        }
    }
    
    setupEventListeners() {
        // Prevent zoom on mobile
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
        
        // Prevent context menu on long touch
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle visibility change to pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause animations when tab is not visible
                this.pause();
            } else {
                // Resume when tab becomes visible
                this.resume();
            }
        });
        
        // Add keyboard shortcuts for debugging (development only)
        if (import.meta.env.DEV) {
            document.addEventListener('keydown', (e) => {
                switch(e.key) {
                    case 'r':
                    case 'R':
                        // Reset to current time
                        if (this.timeControls) {
                            this.timeControls.resetToNow();
                        }
                        break;
                    case 'd':
                    case 'D':
                        // Debug info
                        this.showDebugInfo();
                        break;
                    case 'h':
                    case 'H':
                        // Help
                        this.showHelp();
                        break;
                }
            });
        }
    }
    
    pause() {
        if (this.timeControls) {
            this.timeControls.stopPlayback();
        }
    }
    
    resume() {
        // Scene continues automatically, no action needed
    }
    
    showDebugInfo() {
        if (this.scene && this.scene.getCurrentState()) {
            const state = this.scene.getCurrentState();
            const viewer = this.scene.getViewerCoordinates();
            
            console.group('🔍 Debug Information');
            console.log('Current Time:', state.date.toLocaleString());
            console.log('Julian Day:', state.julianDay.toFixed(2));
            console.log('Days since J2000:', state.daysSinceJ2000.toFixed(2));
            console.log('Earth Position:', state.positions.earth);
            console.log('Moon Position:', state.positions.moon);
            console.log('Sun Position:', state.positions.sun);
            console.log('Moon Phase:', state.moonPhase.name, `(${(state.moonPhase.illumination * 100).toFixed(1)}% lit)`);
            console.log('Solar Elevation:', state.solar.elevation.toFixed(1), '°');
            console.log('Solar Azimuth:', state.solar.azimuth.toFixed(1), '°');
            console.log('Viewer Position:', `${viewer.latitude}°N, ${viewer.longitude}°E`);
            console.log('Eclipse Status:', state.eclipses);
            console.groupEnd();
        }
    }
    
    showHelp() {
        console.group('📖 Help - Keyboard Shortcuts (Dev Mode)');
        console.log('R - Reset time to current moment');
        console.log('D - Show debug information');
        console.log('H - Show this help');
        console.groupEnd();
        
        console.group('🎮 Controls');
        console.log('Mouse/Touch: Rotate view around Earth-Moon system');
        console.log('Mouse wheel/Pinch: Zoom in/out');
        console.log('Time sliders: Navigate through time');
        console.log('Week slider: ±25 weeks from current time');
        console.log('Hour slider: 0-167 hours within the week');
        console.log('Reset button: Return to current time');
        console.log('Play button: Auto-advance time');
        console.groupEnd();
    }
    
    showErrorMessage(error) {
        // Create error display overlay
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 80%;
            text-align: center;
            z-index: 1000;
            font-family: monospace;
        `;
        
        errorDiv.innerHTML = `
            <h2>❌ Initialization Error</h2>
            <p>The application failed to start properly.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please refresh the page and try again.</p>
            <button onclick="window.location.reload()" style="
                background: white;
                color: red;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">Refresh Page</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    // Get current astronomical state for external use
    getState() {
        return this.scene ? this.scene.getCurrentState() : null;
    }
    
    // Set viewer coordinates (for future configuration)
    setViewerPosition(latitude, longitude) {
        if (this.scene) {
            this.scene.setViewerCoordinates(latitude, longitude);
        }
    }
    
    destroy() {
        // Clean up resources
        if (this.scene) {
            this.scene.dispose();
        }
        
        if (this.timeControls) {
            this.timeControls.dispose();
        }
        
        // Remove event listeners
        document.removeEventListener('gesturestart', (e) => e.preventDefault());
        document.removeEventListener('gesturechange', (e) => e.preventDefault());
        document.removeEventListener('gestureend', (e) => e.preventDefault());
        document.removeEventListener('contextmenu', (e) => e.preventDefault());
        document.removeEventListener('visibilitychange', this.pause);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance for debugging
    window.moonApp = new MoonEarthSunApp();
    
    // Expose some useful functions globally for console debugging
    if (import.meta.env.DEV) {
        window.debugMoon = () => window.moonApp.showDebugInfo();
        window.helpMoon = () => window.moonApp.showHelp();
        window.getMoonState = () => window.moonApp.getState();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.moonApp) {
        window.moonApp.destroy();
    }
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('🚨 Global Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unhandled Promise Rejection:', e.reason);
});

console.log('🚀 Moon Earth Sun application loading...');
