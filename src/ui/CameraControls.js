import { Pane } from 'tweakpane';

export default class CameraControls {
    constructor(onCameraChange, scene, urlParams = {}) {
        this.onCameraChange = onCameraChange;
        this.scene = scene;
        this.urlParams = urlParams;
        
        // Tweakpane PARAMS object - this holds the actual values
        this.PARAMS = {
            coordinateSystem: urlParams.coord || 'geocentric',
            pitch: urlParams.pitch !== null ? urlParams.pitch : 90,
            bearing: urlParams.bearing !== null ? urlParams.bearing : 0,
            distance: urlParams.distance !== null ? urlParams.distance : 80,
            background: '#000005',
            viewerPosition: { 
                x: urlParams.lng !== null ? urlParams.lng : 6.5, 
                y: urlParams.lat !== null ? urlParams.lat : 46.1 
            }
        };
        
        this.pane = null;
        this.folders = {};
        
        this.create();
    }
    
    create() {
        // Create Tweakpane instance
        this.pane = new Pane({
            title: 'Camera Controls',
            expanded: false, // Start collapsed for cleaner UI
        });
        
        // Position the pane
        this.pane.element.style.position = 'fixed';
        this.pane.element.style.top = '20px';
        this.pane.element.style.right = '20px';
        this.pane.element.style.zIndex = '1000';
        this.pane.element.style.width = '280px';
        
        this.setupCoordinateControls();
        this.setupViewerControls();
        this.setupManualControls();
        this.setupEnvironmentControls();
        this.setupActionButtons();
        
        // Apply initial state from URL parameters or defaults
        this.applyInitialState();
    }
    
    setupCoordinateControls() {
        // Coordinate system folder
        this.folders.coordinate = this.pane.addFolder({
            title: 'Coordinate System',
            expanded: true,
        });
        
        // Coordinate system selector
        const coordinateOptions = {
            'Geocentric (Earth-centered)': 'geocentric',
            'Heliocentric (Sun-centered)': 'heliocentric',
            'Selenocentric (Moon-centered)': 'selenocentric'
        };
        
        const coordinateBinding = this.folders.coordinate.addBinding(this.PARAMS, 'coordinateSystem', {
            options: coordinateOptions,
        });
        
        coordinateBinding.on('change', (ev) => {
            this.changeCoordinateSystem(ev.value);
        });
    }
    
    setupViewerControls() {
        // Viewer coordinates folder
        this.folders.viewer = this.pane.addFolder({
            title: 'Viewer Coordinates',
            expanded: true,
        });
        
        // Viewer coordinates binding (x = longitude, y = latitude)
        const viewerBinding = this.folders.viewer.addBinding(this.PARAMS, 'viewerPosition', {
            x: { min: -180, max: 180, step: 0.1 },
            y: { min: -90, max: 90, step: 0.1 }
        });
        
        viewerBinding.on('change', (ev) => {
            this.updateViewerCoordinates();
        });
    }
    
    setupManualControls() {
        // Manual controls folder
        this.folders.manual = this.pane.addFolder({
            title: 'Manual Controls',
            expanded: false,
        });
        
        // Pitch control (elevation angle)
        const pitchBinding = this.folders.manual.addBinding(this.PARAMS, 'pitch', {
            min: 0,
            max: 90,
            step: 1,
        });
        
        pitchBinding.on('change', (ev) => {
            this.updateCamera();
        });
        
        // Bearing control (azimuth angle)
        const bearingBinding = this.folders.manual.addBinding(this.PARAMS, 'bearing', {
            min: 0,
            max: 359,
            step: 1,
        });
        
        bearingBinding.on('change', (ev) => {
            this.updateCamera();
        });
        
        // Distance control (zoom) - will be created by updateDistanceRange
        this.distanceBinding = null;
        this.updateDistanceRange(this.PARAMS.coordinateSystem);
    }
    
    setupEnvironmentControls() {
        // Environment controls folder
        this.folders.environment = this.pane.addFolder({
            title: 'Environment',
            expanded: false,
        });
        
        // Background color control
        const backgroundBinding = this.folders.environment.addBinding(this.PARAMS, 'background');
        
        backgroundBinding.on('change', (ev) => {
            this.updateBackground();
        });
    }
    
    setupActionButtons() {
        // URL state management folder
        this.folders.urlState = this.pane.addFolder({
            title: 'URL State Management',
            expanded: true,
        });
        
        // Save Current View button
        this.folders.urlState.addButton({
            title: 'Save Current View',
        }).on('click', () => {
            this.saveCurrentView();
        });
        
        // Copy URL button
        this.folders.urlState.addButton({
            title: 'Copy URL',
        }).on('click', () => {
            this.copyCurrentURL();
        });
        
        // Reset View button
        this.pane.addButton({
            title: 'Reset View',
        }).on('click', () => {
            this.resetToDefaults();
        });
    }
    
    changeCoordinateSystem(system) {
        this.PARAMS.coordinateSystem = system;
        
        // Update scene coordinate system
        if (this.scene && this.scene.setCoordinateSystem) {
            this.scene.setCoordinateSystem(system);
        }
        
        // Update distance ranges based on coordinate system
        this.updateDistanceRange(system);
        
        console.log(`Coordinate system changed to: ${system}`);
    }
    
    updateDistanceRange(system) {
        // Update distance control with appropriate ranges for each coordinate system
        if (this.distanceBinding) {
            this.distanceBinding.dispose();
        }
        
        const ranges = {
            'geocentric': { min: 20, max: 200, step: 5 },
            'heliocentric': { min: 30, max: 300, step: 10 },
            'selenocentric': { min: 15, max: 150, step: 5 }
        };
        
        const range = ranges[system] || ranges.geocentric;
        
        this.distanceBinding = this.folders.manual.addBinding(this.PARAMS, 'distance', range);
        this.distanceBinding.on('change', (ev) => {
            this.updateDistance();
        });
    }
    
    // Reset to default values (top-down view)
    resetToDefaults() {
        // Reset camera to default values
        this.PARAMS.pitch = 90;
        this.PARAMS.bearing = 0;
        this.PARAMS.distance = 80;
        this.PARAMS.coordinateSystem = 'geocentric';
        this.PARAMS.viewerPosition = { x: 6.5, y: 46.1 };
        
        // Update the controls to reflect new values
        this.pane.refresh();
        
        // Apply changes
        this.updateCamera();
        this.updateDistance();
        this.updateViewerCoordinates();
        this.changeCoordinateSystem('geocentric');
        
        console.log('🔄 Reset to default camera settings');
    }
    
    updateCamera() {
        // Update scene camera
        if (this.scene && this.scene.setCameraAngles) {
            this.scene.setCameraAngles(this.PARAMS.pitch, this.PARAMS.bearing);
        }
        
        // Notify external handlers
        if (this.onCameraChange) {
            this.onCameraChange({
                pitch: this.PARAMS.pitch,
                bearing: this.PARAMS.bearing,
                distance: this.PARAMS.distance
            });
        }
    }
    
    updateDistance() {
        // Update scene camera distance
        if (this.scene && this.scene.camera) {
            this.scene.cameraDistance = this.PARAMS.distance;
            this.scene.updateCameraPosition();
        }
    }
    
    updateBackground() {
        // Update scene background color
        if (this.scene && this.scene.scene) {
            this.scene.scene.background.set(this.PARAMS.background);
        }
    }
    
    updateViewerCoordinates() {
        // Convert x/y to longitude/latitude (x = longitude, y = latitude)
        const longitude = this.PARAMS.viewerPosition.x;
        const latitude = this.PARAMS.viewerPosition.y;
        
        // Update Earth's viewer dot position
        if (this.scene && this.scene.earth && this.scene.earth.setViewerCoordinates) {
            this.scene.earth.setViewerCoordinates(latitude, longitude);
        }
        
        // Also update the scene's viewer coordinates for astronomical calculations
        if (this.scene && this.scene.setViewerCoordinates) {
            this.scene.setViewerCoordinates(latitude, longitude);
        }
        
        console.log(`Viewer coordinates updated to: ${latitude}°N, ${longitude}°E`);
    }
    
    // Set camera state externally (for compatibility)
    setCameraState(pitch, bearing) {
        this.PARAMS.pitch = Math.max(0, Math.min(90, pitch));
        this.PARAMS.bearing = ((bearing % 360) + 360) % 360;
        
        this.pane.refresh();
        this.updateCamera();
    }
    
    // Get current camera state
    getCameraState() {
        return {
            pitch: this.PARAMS.pitch,
            bearing: this.PARAMS.bearing,
            distance: this.PARAMS.distance
        };
    }
    
    // Show/hide the controls
    setVisible(visible) {
        this.pane.element.style.display = visible ? 'block' : 'none';
    }
    
    // Toggle expanded state
    toggleExpanded() {
        this.pane.expanded = !this.pane.expanded;
    }
    
    // Apply initial state from URL parameters or defaults
    applyInitialState() {
        // Update the controls to reflect current values
        this.pane.refresh();
        
        // Apply camera settings
        this.updateCamera();
        this.updateDistance();
        this.updateViewerCoordinates();
        
        console.log('🎥 Applied initial camera state:', {
            pitch: this.PARAMS.pitch,
            bearing: this.PARAMS.bearing,
            distance: this.PARAMS.distance,
            coordinateSystem: this.PARAMS.coordinateSystem,
            viewerPosition: this.PARAMS.viewerPosition
        });
    }
    
    // Generate URL with current state
    generateStateURL() {
        const params = new URLSearchParams();
        
        // Get current time from the global app or scene
        let currentTime = new Date();
        if (window.moonApp && window.moonApp.timeControls && window.moonApp.timeControls.getCurrentTime) {
            currentTime = window.moonApp.timeControls.getCurrentTime();
        } else if (this.scene && this.scene.currentTime) {
            currentTime = this.scene.currentTime;
        }
        
        params.set('date', currentTime.getTime().toString());
        
        // Add camera parameters
        params.set('pitch', this.PARAMS.pitch.toString());
        params.set('bearing', this.PARAMS.bearing.toString());
        params.set('distance', this.PARAMS.distance.toString());
        
        // Add viewer coordinates
        params.set('lat', this.PARAMS.viewerPosition.y.toString());
        params.set('lng', this.PARAMS.viewerPosition.x.toString());
        
        // Add coordinate system
        params.set('coord', this.PARAMS.coordinateSystem);
        
        // Generate full URL
        const baseURL = window.location.origin + window.location.pathname;
        return `${baseURL}?${params.toString()}`;
    }
    
    // Save current view to URL (updates browser address bar)
    saveCurrentView() {
        try {
            const stateURL = this.generateStateURL();
            
            // Update browser address bar without reload
            window.history.pushState(
                { moonAppState: true }, 
                'Moon App - Saved View', 
                stateURL
            );
            
            console.log('💾 Current view saved to URL:', stateURL);
            
        } catch (error) {
            console.error('❌ Failed to save current view:', error);
        }
    }
    
    // Copy current URL to clipboard
    async copyCurrentURL() {
        try {
            const urlToCopy = window.location.href;
            
            // Use the modern Clipboard API if available
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(urlToCopy);
                console.log('📋 URL copied to clipboard:', urlToCopy);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = urlToCopy;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                console.log('📋 URL copied to clipboard (fallback):', urlToCopy);
            }
            
        } catch (error) {
            console.error('❌ Failed to copy URL to clipboard:', error);
        }
    }
    
    // Cleanup
    dispose() {
        if (this.pane) {
            this.pane.dispose();
            this.pane = null;
        }
    }
}
