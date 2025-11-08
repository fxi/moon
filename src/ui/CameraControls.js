import { Pane } from 'tweakpane';

export default class CameraControls {
    constructor(onCameraChange, scene) {
        this.onCameraChange = onCameraChange;
        this.scene = scene;
        
        // Tweakpane PARAMS object - this holds the actual values
        this.PARAMS = {
            coordinateSystem: 'geocentric',
            preset: 'Nadir',
            pitch: 90,
            bearing: 0,
            distance: 80,
            background: '#000005',
            viewerPosition: { x: 6.5, y: 46.1 }
        };
        
        // Generic camera presets - work universally across all coordinate systems
        this.presets = {
            'Nadir': { pitch: 90, bearing: 0, description: 'Top-down view' },
            'Oblique': { pitch: 45, bearing: 0, description: 'Angled view' },
            'Horizon': { pitch: 15, bearing: 0, description: 'Low angle view' },
            'North': { pitch: 45, bearing: 0, description: 'Northern perspective' },
            'East': { pitch: 45, bearing: 90, description: 'Eastern perspective' },
            'South': { pitch: 45, bearing: 180, description: 'Southern perspective' },
            'West': { pitch: 45, bearing: 270, description: 'Western perspective' }
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
        
        this.setupPresetControls();
        this.setupViewerControls();
        this.setupManualControls();
        this.setupEnvironmentControls();
        this.setupActionButtons();
        
        // Set initial preset
        this.applyPreset('Nadir');
    }
    
    setupPresetControls() {
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
        
        // Camera presets folder
        this.folders.presets = this.pane.addFolder({
            title: 'View Presets',
            expanded: true,
        });
        
        // Preset dropdown (generic presets for all coordinate systems)
        const presetOptions = Object.keys(this.presets).reduce((acc, key) => {
            acc[key] = key;
            return acc;
        }, {});
        
        this.presetBinding = this.folders.presets.addBinding(this.PARAMS, 'preset', {
            options: presetOptions,
        });
        
        this.presetBinding.on('change', (ev) => {
            this.applyPreset(ev.value);
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
        // Quick action buttons
        this.pane.addButton({
            title: 'Reset View',
        }).on('click', () => {
            this.applyPreset('Nadir');
            this.PARAMS.preset = 'Nadir';
            this.pane.refresh();
        });
    }
    
    changeCoordinateSystem(system) {
        this.PARAMS.coordinateSystem = system;
        
        // Update scene coordinate system
        if (this.scene && this.scene.setCoordinateSystem) {
            this.scene.setCoordinateSystem(system);
        }
        
        // Keep current preset (generic presets work for all systems)
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
    
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        // Update PARAMS object
        this.PARAMS.pitch = preset.pitch;
        this.PARAMS.bearing = preset.bearing;
        this.PARAMS.preset = presetName;
        
        // Update the controls to reflect new values
        this.pane.refresh();
        
        // Apply camera changes
        this.updateCamera();
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
        this.PARAMS.preset = 'Custom';
        
        this.pane.refresh();
        this.updateCamera();
    }
    
    // Get current camera state
    getCameraState() {
        return {
            pitch: this.PARAMS.pitch,
            bearing: this.PARAMS.bearing,
            distance: this.PARAMS.distance,
            preset: this.PARAMS.preset
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
    
    // Cleanup
    dispose() {
        if (this.pane) {
            this.pane.dispose();
            this.pane = null;
        }
    }
}
