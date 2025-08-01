import { GPXProcessor } from './gpx-processor.js';

class GPXMonsterApp {
    constructor() {
        this.files = [];
        this.processor = null;
        this.isImperial = false;
        this.currentStats = null;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeProcessor();
        this.initializeMap();
        this.loadUnitPreference();
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.emptyState = document.getElementById('emptyState');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.downloadButtons = document.getElementById('downloadButtons');
        this.resultsSection = document.getElementById('resultsSection');
        this.statsSection = document.getElementById('statsSection');
        this.unitToggle = document.getElementById('unitToggle');
        this.mapOverlay = document.getElementById('mapOverlay');
        this.mapContainer = document.querySelector('.map-container');
        this.browseLink = document.getElementById('browseLink');
        this.clearBtn = document.getElementById('clearBtn');
        this.controlsPanel = document.getElementById('controlsPanel');
        this.leftPanel = document.querySelector('.left-panel');
        this.map = null;
        this.trackSourceId = 'gpx-track';
        this.trackLayerId = 'gpx-track-layer';
        this.startMarkerId = 'start-marker';
        this.endMarkerId = 'end-marker';
    }

    setupEventListeners() {
        // File upload events
        this.browseLink.addEventListener('click', () => this.fileInput.click());
        this.mapOverlay.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop events for left panel only
        this.leftPanel.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.leftPanel.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.leftPanel.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Control buttons
        this.clearBtn.addEventListener('click', () => this.clearFiles());
        
        // Unit toggle
        this.unitToggle.addEventListener('change', () => this.handleUnitToggle());
        
        // Prevent default drag behaviors on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    initializeProcessor() {
        this.processor = new GPXProcessor((_message) => {
            // Minimal UI - no logging
        });
    }

    initializeMap() {
        // Initialize MapLibre GL map with a simplified version of MapTiler Basic style
        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                name: "Basic",
                sources: {
                    "osm": {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }
                },
                layers: [
                    {
                        id: "osm",
                        type: "raster",
                        source: "osm"
                    }
                ]
            },
            center: [11.5, 46.5], // Center on Dolomites region [lng, lat]
            zoom: 8
        });

        // Show overlay initially
        this.mapOverlay.style.display = 'flex';
    }

    // Unit conversion functions
    convertDistance(km, toImperial = false) {
        if (toImperial) {
            return Math.round(km * 0.621371 * 100) / 100; // km to miles
        }
        return km;
    }

    convertElevation(meters, toImperial = false) {
        if (toImperial) {
            return Math.round(meters * 3.28084); // meters to feet
        }
        return meters;
    }

    getDistanceUnit(imperial = false) {
        return imperial ? 'mi' : 'km';
    }

    getElevationUnit(imperial = false) {
        return imperial ? 'ft' : 'm';
    }

    // Number formatting function
    formatNumber(number) {
        return new Intl.NumberFormat().format(number);
    }

    // localStorage functions
    loadUnitPreference() {
        const saved = localStorage.getItem('gpx-monster-units');
        this.isImperial = saved === 'imperial';
        this.unitToggle.checked = this.isImperial;
    }

    saveUnitPreference() {
        localStorage.setItem('gpx-monster-units', this.isImperial ? 'imperial' : 'metric');
    }

    handleUnitToggle() {
        this.isImperial = this.unitToggle.checked;
        this.saveUnitPreference();
        
        // Update displayed stats if they exist
        if (this.currentStats) {
            this.showStats(this.currentStats);
        }
    }



    handleDrop(e) {
        e.preventDefault();
        this.mapContainer.classList.remove('map-dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.name.toLowerCase().endsWith('.gpx')
        );
        this.handleFileSelect(files);
    }

    handleFileSelect(fileList) {
        const files = Array.from(fileList).filter(file => 
            file.name.toLowerCase().endsWith('.gpx')
        );
        
        if (files.length === 0) {
            alert('Please select GPX files only.');
            return;
        }

        // Add new files, avoid duplicates
        files.forEach(file => {
            if (!this.files.some(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });

        this.updateFileList();
        this.autoProcessFiles();
    }

    updateFileList() {
        // Clear existing file items (but keep empty state)
        const existingItems = this.fileList.querySelectorAll('.file-item');
        existingItems.forEach(item => item.remove());
        
        // Show/hide empty state and controls
        if (this.files.length === 0) {
            this.emptyState.style.display = 'flex';
            this.controlsPanel.style.display = 'none';
            return;
        } else {
            this.emptyState.style.display = 'none';
            this.controlsPanel.style.display = 'block';
        }

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="file-remove">×</button>
            `;
            
            // Add event listener to remove button
            const removeBtn = fileItem.querySelector('.file-remove');
            removeBtn.addEventListener('click', () => this.removeFile(index));
            
            this.fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
        
        if (this.files.length === 0) {
            this.hideResults();
        } else {
            this.autoProcessFiles();
        }
    }

    clearFiles() {
        this.files = [];
        this.fileInput.value = '';
        this.updateFileList();
        this.hideResults();
        this.clearMapLayers();
        this.mapOverlay.style.display = 'flex';
    }

    handleDragOver(e) {
        e.preventDefault();
        this.leftPanel.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!this.leftPanel.contains(e.relatedTarget)) {
            this.leftPanel.classList.remove('drag-over');
        }
    }

    async autoProcessFiles() {
        if (this.files.length === 0) {
            this.hideResults();
            return;
        }
        
        this.showProgress();
        this.hideResults();

        try {
            const { results, outputs, coordinates, stats } = await this.processor.processFiles(
                this.files,
                'merge',
                [],
                (progress, status) => {
                    this.updateProgress(progress, status);
                }
            );

            this.hideProgress();
            this.showResults(results, outputs, coordinates, stats);

        } catch (error) {
            this.hideProgress();
            alert(`Processing failed: ${error.message}`);
        }
    }


    showProgress() {
        this.progressSection.style.display = 'block';
        this.updateProgress(0, 'Starting...');
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    updateProgress(progress, status) {
        this.progressFill.style.width = `${progress}%`;
        if (this.progressText) {
            this.progressText.textContent = status || `${Math.round(progress)}% complete`;
        }
    }

    showResults(_results, outputs, coordinates = [], stats = null) {
        // Show statistics if available
        if (stats) {
            this.currentStats = stats; // Store stats for unit conversion
            this.showStats(stats);
        }
        
        // Create download buttons
        this.downloadButtons.innerHTML = '';
        outputs.forEach(output => {
            const button = document.createElement('a');
            button.className = 'download-btn';
            button.textContent = `Download`;
            button.href = this.createDownloadUrl(output.content);
            button.download = output.name;
            this.downloadButtons.appendChild(button);
        });
        
        this.resultsSection.style.display = 'block';

        // Show map with route
        if (coordinates && coordinates.length > 0) {
            this.showMap(coordinates);
        }
    }

    showStats(stats) {
        const distance = this.convertDistance(stats.totalDistance, this.isImperial);
        const elevationGain = this.convertElevation(stats.elevationGain, this.isImperial);
        const elevationLoss = this.convertElevation(stats.elevationLoss, this.isImperial);
        
        const distanceUnit = this.getDistanceUnit(this.isImperial);
        const elevationUnit = this.getElevationUnit(this.isImperial);
        
        document.getElementById('statDistance').textContent = `${this.formatNumber(distance)} ${distanceUnit}`;
        document.getElementById('statElevationGain').textContent = `${this.formatNumber(elevationGain)} ${elevationUnit}`;
        document.getElementById('statElevationLoss').textContent = `${this.formatNumber(elevationLoss)} ${elevationUnit}`;
        
        if (stats.minElevation !== null && stats.maxElevation !== null) {
            const minElevation = this.convertElevation(stats.minElevation, this.isImperial);
            const maxElevation = this.convertElevation(stats.maxElevation, this.isImperial);
            document.getElementById('statElevationRange').textContent = `${this.formatNumber(minElevation)}–${this.formatNumber(maxElevation)} ${elevationUnit}`;
        } else {
            document.getElementById('statElevationRange').textContent = 'N/A';
        }
        
        this.statsSection.style.display = 'block';
    }

    showMap(coordinates) {
        // Hide the overlay
        this.mapOverlay.style.display = 'none';
        
        // Clear existing layers
        this.clearMapLayers();

        if (coordinates.length === 0) return;

        // Convert coordinates to GeoJSON LineString format [lng, lat]
        const lineCoordinates = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Add track source and layer
        this.map.addSource(this.trackSourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: lineCoordinates
                }
            }
        });

        this.map.addLayer({
            id: this.trackLayerId,
            type: 'line',
            source: this.trackSourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#e91e63',
                'line-width': 4,
                'line-opacity': 0.9
            }
        });

        // Add start and end markers
        if (coordinates.length > 0) {
            const startPoint = coordinates[0];
            const endPoint = coordinates[coordinates.length - 1];
            
            // Start marker
            const startMarker = new maplibregl.Marker({ color: '#22c55e' })
                .setLngLat([startPoint[1], startPoint[0]])
                .setPopup(new maplibregl.Popup().setText('Start'))
                .addTo(this.map);
                
            // End marker (if different from start)
            if (coordinates.length > 1) {
                const endMarker = new maplibregl.Marker({ color: '#ef4444' })
                    .setLngLat([endPoint[1], endPoint[0]])
                    .setPopup(new maplibregl.Popup().setText('End'))
                    .addTo(this.map);
            }
        }

        // Fit map to show entire route
        const bounds = new maplibregl.LngLatBounds();
        lineCoordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 20 });
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.statsSection.style.display = 'none';
        this.currentStats = null; // Clear stored stats
        this.mapOverlay.style.display = 'flex';
        
        // Clear map layers but keep the map
        this.clearMapLayers();
    }

    clearMapLayers() {
        if (this.map) {
            // Remove track layer and source if they exist
            if (this.map.getLayer(this.trackLayerId)) {
                this.map.removeLayer(this.trackLayerId);
            }
            if (this.map.getSource(this.trackSourceId)) {
                this.map.removeSource(this.trackSourceId);
            }
            
            // Remove all markers
            const markers = document.querySelectorAll('.maplibregl-marker');
            markers.forEach(marker => marker.remove());
        }
    }


    createDownloadUrl(content) {
        const blob = new Blob([content], { type: 'application/gpx+xml' });
        return URL.createObjectURL(blob);
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GPXMonsterApp();
    // Make app globally available for button onclick handlers
    globalThis.app = app;
});