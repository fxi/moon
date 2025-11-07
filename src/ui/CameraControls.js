import { Pane } from 'tweakpane';

export default class CameraControls {
    constructor(onCameraChange, scene) {
        this.onCameraChange = onCameraChange;
        this.scene = scene;
        
        // Tweakpane PARAMS object - this holds the actual values
        this.PARAMS = {
            preset: 'Nadir',
            pitch: 90,
            bearing: 0,
            distance: 80,
            background: '#000005'
        };
        
        // Scientific camera presets
        this.presets = {
            'Nadir': { pitch: 90, bearing: 0, description: 'Top-down view' },
            'Zenith': { pitch: 0, bearing: 0, description: 'Bottom-up view' },
            'North Polar': { pitch: 45, bearing: 0, description: 'Northern perspective' },
            'South Polar': { pitch: 45, bearing: 180, description: 'Southern perspective' },
            'Equatorial East': { pitch: 45, bearing: 90, description: 'Eastern horizon view' },
            'Equatorial West': { pitch: 45, bearing: 270, description: 'Western horizon view' },
            'Ecliptic Plane': { pitch: 15, bearing: 0, description: 'Low angle, orbital plane' },
            'Lunar Orbital': { pitch: 60, bearing: 45, description: 'Optimal moon observation' },
            'Solar Transit': { pitch: 30, bearing: 90, description: 'Sun-Earth-Moon alignment' }
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
        this.setupManualControls();
        this.setupEnvironmentControls();
        this.setupActionButtons();
        
        // Set initial preset
        this.applyPreset('Nadir');
    }
    
    setupPresetControls() {
        // Camera presets folder
        this.folders.presets = this.pane.addFolder({
            title: 'Scientific Views',
            expanded: true,
        });
        
        // Preset dropdown with descriptions
        const presetOptions = Object.keys(this.presets).reduce((acc, key) => {
            acc[key] = key;
            return acc;
        }, {});
        
        const presetBinding = this.folders.presets.addBinding(this.PARAMS, 'preset', {
            options: presetOptions,
        });
        
        presetBinding.on('change', (ev) => {
            this.applyPreset(ev.value);
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
        
        // Distance control (zoom)
        const distanceBinding = this.folders.manual.addBinding(this.PARAMS, 'distance', {
            min: 20,
            max: 200,
            step: 5,
        });
        
        distanceBinding.on('change', (ev) => {
            this.updateDistance();
        });
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
            title: 'Reset to Nadir',
        }).on('click', () => {
            this.applyPreset('Nadir');
            this.PARAMS.preset = 'Nadir';
            this.pane.refresh();
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
