export class GPXProcessor {
  constructor(logCallback) {
    this.logCallback = logCallback;
  }

  log(message) {
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Calculate route statistics (distance, elevation gain/loss)
  calculateRouteStats(points) {
    if (!points || points.length < 2) {
      return {
        totalDistance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        minElevation: null,
        maxElevation: null,
        totalPoints: points ? points.length : 0
      };
    }

    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let minElevation = null;
    let maxElevation = null;
    
    // Track valid elevation points
    const elevationPoints = points.filter(p => p.ele !== undefined && !isNaN(p.ele));
    
    if (elevationPoints.length > 0) {
      minElevation = Math.min(...elevationPoints.map(p => p.ele));
      maxElevation = Math.max(...elevationPoints.map(p => p.ele));
    }

    // Calculate distance and elevation changes
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Calculate distance
      const distance = this.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      totalDistance += distance;
      
      // Calculate elevation changes
      if (prev.ele !== undefined && curr.ele !== undefined && 
          !isNaN(prev.ele) && !isNaN(curr.ele)) {
        const elevationChange = curr.ele - prev.ele;
        if (elevationChange > 0) {
          elevationGain += elevationChange;
        } else {
          elevationLoss += Math.abs(elevationChange);
        }
      }
    }

    return {
      totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      minElevation: minElevation ? Math.round(minElevation) : null,
      maxElevation: maxElevation ? Math.round(maxElevation) : null,
      totalPoints: points.length
    };
  }

  normalizeGPXData(xmlContent, fileName) {
    const points = [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      
      // Check for XML parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
      }

      const gpx = doc.documentElement;
      if (gpx.tagName !== 'gpx') {
        throw new Error('Invalid GPX file: root element is not <gpx>');
      }
      
      this.log(`  Analyzing ${fileName}:`);
      
      const tracks = gpx.querySelectorAll('trk');
      const waypoints = gpx.querySelectorAll('wpt');
      const routes = gpx.querySelectorAll('rte');
      
      this.log(`    Has tracks: ${tracks.length > 0}`);
      this.log(`    Has waypoints: ${waypoints.length > 0}`);
      this.log(`    Has routes: ${routes.length > 0}`);
      
      // Only extract track points to maintain proper route continuity
      if (tracks.length > 0) {
        this.log(`    Number of tracks: ${tracks.length}`);
        
        tracks.forEach(track => {
          const segments = track.querySelectorAll('trkseg');
          this.log(`    Number of track segments: ${segments.length}`);
          
          segments.forEach(segment => {
            const trackpoints = segment.querySelectorAll('trkpt');
            
            trackpoints.forEach(trkpt => {
              // Normalize data - ensure all required fields exist and are valid
              const latStr = trkpt.getAttribute('lat');
              const lonStr = trkpt.getAttribute('lon');
              
              if (!latStr || !lonStr) {
                this.log(`    Skipping point without coordinates`);
                return;
              }
              
              const lat = parseFloat(latStr);
              const lon = parseFloat(lonStr);
              
              // Skip invalid coordinates
              if (isNaN(lat) || isNaN(lon)) {
                this.log(`    Skipping invalid coordinates: lat=${latStr}, lon=${lonStr}`);
                return;
              }
              
              const eleElement = trkpt.querySelector('ele');
              const timeElement = trkpt.querySelector('time');
              
              points.push({
                lat: lat,
                lon: lon,
                ele: eleElement ? parseFloat(eleElement.textContent || '0') : undefined,
                time: timeElement ? timeElement.textContent || undefined : undefined,
                sourceFile: fileName
              });
            });
          });
        });
      }
      
      this.log(`    Extracted ${points.length} valid track points`);
    } catch (error) {
      this.log(`  Error parsing ${fileName}: ${error}`);
      throw error;
    }
    
    return points;
  }

  generateGPX(points) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Merger" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Transdolomiti Complete Tour</name>
    <desc>Complete 6-day Transdolomiti tour - all days combined</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

    // Group points by source file and sort files by day number
    const fileGroups = new Map();
    for (const point of points) {
      const file = point.sourceFile || 'unknown';
      if (!fileGroups.has(file)) {
        fileGroups.set(file, []);
      }
      fileGroups.get(file).push(point);
    }

    // Sort files by day number (Day_1, Day_2, etc.)
    const sortedFiles = Array.from(fileGroups.entries()).sort(([a], [b]) => {
      const dayA = parseInt(a.match(/Day_?(\d+)/)?.[1] || '0');
      const dayB = parseInt(b.match(/Day_?(\d+)/)?.[1] || '0');
      return dayA - dayB;
    });

    // Create one track with a single segment containing all points chronologically
    const allFilePoints = sortedFiles.flatMap(([fileName, filePoints]) => filePoints);
    
    // Sort all points chronologically across all days
    allFilePoints.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
    
    const trackPoints = allFilePoints.map(point => {
      let trkpt = `      <trkpt lat="${point.lat}" lon="${point.lon}">`;
      if (point.ele !== undefined) trkpt += `\n        <ele>${point.ele}</ele>`;
      if (point.time) trkpt += `\n        <time>${point.time}</time>`;
      trkpt += `\n      </trkpt>`;
      return trkpt;
    }).join('\n');

    const track = `  <trk>
    <name>Transdolomiti Complete Tour</name>
    <type>cycling</type>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>`;

    return `${header}\n${track}\n</gpx>`;
  }

  generateSingleTrackGPX(points, fileName) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Normalizer" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Normalized: ${fileName}</name>
    <desc>Normalized GPX file from ${fileName}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

    // Sort points by time within the file
    points.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    const trackPoints = points.map(point => {
      let trkpt = `    <trkpt lat="${point.lat}" lon="${point.lon}">`;
      if (point.ele !== undefined) trkpt += `\n      <ele>${point.ele}</ele>`;
      if (point.time) trkpt += `\n      <time>${point.time}</time>`;
      trkpt += `\n    </trkpt>`;
      return trkpt;
    }).join('\n');

    const track = `  <trk>
    <name>${fileName}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>`;

    return `${header}\n${track}\n</gpx>`;
  }

  async processFiles(files, mode, specificFiles = [], progressCallback) {
    const results = [];
    const outputs = [];
    const allPoints = [];

    this.log(`Processing ${files.length} files in ${mode} mode`);
    if (specificFiles.length > 0) {
      this.log(`Filtering for files: ${specificFiles.join(', ')}`);
    }

    // Filter files if specific files are requested
    const filesToProcess = specificFiles.length > 0 
      ? files.filter(file => {
          return specificFiles.some(f => file.name.includes(f));
        })
      : files;

    this.log(`Files to process: ${filesToProcess.length}`);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const progress = ((i + 1) / filesToProcess.length) * 100;
      
      if (progressCallback) {
        progressCallback(progress, `Processing ${file.name}...`);
      }

      this.log(`\nProcessing: ${file.name}`);
      
      try {
        const content = await this.readFileAsText(file);
        const points = this.normalizeGPXData(content, file.name);
        
        results.push({
          success: true,
          fileName: file.name,
          pointCount: points.length
        });

        if (mode === 'normalize') {
          // Output individual normalized file
          const normalizedOutput = file.name.replace('.gpx', '_normalized.gpx');
          const normalizedGPX = this.generateSingleTrackGPX(points, file.name);
          outputs.push({
            name: normalizedOutput,
            content: normalizedGPX
          });
          this.log(`  Normalized file prepared: ${normalizedOutput}`);
        } else {
          allPoints.push(...points);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`Error processing ${file.name}: ${errorMessage}`);
        results.push({
          success: false,
          fileName: file.name,
          pointCount: 0,
          error: errorMessage
        });
      }
    }

    if (mode === 'merge') {
      if (allPoints.length === 0) {
        throw new Error("No points found in any GPX files!");
      }

      this.log(`\nTotal files processed: ${filesToProcess.length}`);
      this.log(`Total points found: ${allPoints.length}`);

      const mergedGPX = this.generateGPX(allPoints);
      outputs.push({
        name: 'merged.gpx',
        content: mergedGPX
      });
      
      this.log(`\nMerged GPX prepared: merged.gpx`);
    } else {
      this.log(`\nNormalized ${filesToProcess.length} files individually`);
    }

    // For merge mode, also return coordinates for mapping and calculate statistics
    const coordinates = mode === 'merge' && allPoints.length > 0 
      ? allPoints.map(point => [point.lat, point.lon])
      : [];
    
    // Calculate route statistics
    const stats = mode === 'merge' && allPoints.length > 0 
      ? this.calculateRouteStats(allPoints)
      : null;


    if (stats) {
      this.log(`\nRoute Statistics:`);
      this.log(`  Total Distance: ${stats.totalDistance} km`);
      this.log(`  Elevation Gain: ${stats.elevationGain} m`);
      this.log(`  Elevation Loss: ${stats.elevationLoss} m`);
      if (stats.minElevation !== null && stats.maxElevation !== null) {
        this.log(`  Elevation Range: ${stats.minElevation}m - ${stats.maxElevation}m`);
      }
      this.log(`  Total Points: ${stats.totalPoints}`);
    }

    return { results, outputs, coordinates, stats };
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  }
}