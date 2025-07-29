#!/usr/bin/env -S deno run --allow-read --allow-write
import { parse } from "jsr:@libs/xml@7/parse";
import { walkSync } from "https://deno.land/std@0.224.0/fs/walk.ts";

interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  name?: string;
  desc?: string;
  sourceFile?: string;
}

function normalizeGPXData(xmlContent: string, fileName: string): GPXPoint[] {
  const points: GPXPoint[] = [];
  
  try {
    const doc = parse(xmlContent);
    const gpx = doc.gpx as any;
    
    console.log(`  Analyzing ${fileName}:`);
    console.log(`    Has tracks: ${!!gpx.trk}`);
    console.log(`    Has waypoints: ${!!gpx.wpt}`);
    console.log(`    Has routes: ${!!gpx.rte}`);
    
    // Only extract track points to maintain proper route continuity
    if (gpx.trk) {
      const tracks = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk];
      console.log(`    Number of tracks: ${tracks.length}`);
      
      for (const track of tracks) {
        if (track.trkseg) {
          const segments = Array.isArray(track.trkseg) ? track.trkseg : [track.trkseg];
          console.log(`    Number of track segments: ${segments.length}`);
          
          for (const segment of segments) {
            if (segment.trkpt) {
              const trackpoints = Array.isArray(segment.trkpt) ? segment.trkpt : [segment.trkpt];
              
              for (const trkpt of trackpoints) {
                // Normalize data - ensure all required fields exist and are valid
                const lat = parseFloat(trkpt["@lat"]);
                const lon = parseFloat(trkpt["@lon"]);
                
                // Skip invalid coordinates
                if (isNaN(lat) || isNaN(lon)) {
                  console.warn(`    Skipping invalid coordinates: lat=${trkpt["@lat"]}, lon=${trkpt["@lon"]}`);
                  continue;
                }
                
                points.push({
                  lat: lat,
                  lon: lon,
                  ele: trkpt.ele ? parseFloat(trkpt.ele) : undefined,
                  time: trkpt.time ? String(trkpt.time) : undefined,
                  sourceFile: fileName
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`    Extracted ${points.length} valid track points`);
  } catch (error) {
    console.error(`  Error parsing ${fileName}:`, error);
  }
  
  return points;
}

function generateGPX(points: GPXPoint[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Merger" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Transdolomiti Complete Tour</name>
    <desc>Complete 6-day Transdolomiti tour - all days combined</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

  // Group points by source file and sort files by day number
  const fileGroups = new Map<string, GPXPoint[]>();
  for (const point of points) {
    const file = point.sourceFile || 'unknown';
    if (!fileGroups.has(file)) {
      fileGroups.set(file, []);
    }
    fileGroups.get(file)!.push(point);
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

function generateSingleTrackGPX(points: GPXPoint[], fileName: string): string {
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

async function processGPXFiles(folderPath: string, outputFile: string, normalizeOnly = false, specificFiles: string[] = []) {
  const allPoints: GPXPoint[] = [];
  let fileCount = 0;

  console.log(`Scanning folder: ${folderPath}`);
  console.log(`Mode: ${normalizeOnly ? 'Normalize individual files' : 'Merge files'}`);
  
  const entries = Array.from(walkSync(folderPath, { 
    exts: [".gpx"], 
    includeDirs: false 
  }));

  // Filter files if specific files are requested
  const filesToProcess = specificFiles.length > 0 
    ? entries.filter(entry => {
        const fileName = entry.path.split('/').pop() || entry.path;
        return specificFiles.some(f => fileName.includes(f));
      })
    : entries;

  for (const entry of filesToProcess) {
    console.log(`\nProcessing: ${entry.path}`);
    
    try {
      const content = await Deno.readTextFile(entry.path);
      const fileName = entry.path.split('/').pop() || entry.path;
      const points = normalizeGPXData(content, fileName);
      
      if (normalizeOnly) {
        // Output individual normalized file
        const normalizedOutput = fileName.replace('.gpx', '_normalized.gpx');
        const normalizedGPX = generateSingleTrackGPX(points, fileName);
        await Deno.writeTextFile(normalizedOutput, normalizedGPX);
        console.log(`  Normalized file saved: ${normalizedOutput}`);
      } else {
        allPoints.push(...points);
      }
      
      fileCount++;
    } catch (error) {
      console.error(`Error reading ${entry.path}:`, error);
    }
  }

  if (!normalizeOnly) {
    if (allPoints.length === 0) {
      console.error("No points found in any GPX files!");
      return;
    }

    console.log(`\nTotal files processed: ${fileCount}`);
    console.log(`Total points found: ${allPoints.length}`);

    const mergedGPX = generateGPX(allPoints);
    await Deno.writeTextFile(outputFile, mergedGPX);
    
    console.log(`\nMerged GPX saved to: ${outputFile}`);
  } else {
    console.log(`\nNormalized ${fileCount} files individually`);
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  
  if (args.length < 1) {
    console.log("Usage:");
    console.log("  Merge files: deno run -A main.ts <folder_path> [output_file]");
    console.log("  Normalize individual files: deno run -A main.ts <folder_path> --normalize");
    console.log("  Merge specific files: deno run -A main.ts <folder_path> <output_file> --files Day_1,Day_2");
    console.log("");
    console.log("Examples:");
    console.log("  deno run -A main.ts ./data merged.gpx");
    console.log("  deno run -A main.ts ./data --normalize");
    console.log("  deno run -A main.ts ./data day1_day2.gpx --files Day_1,Day_2");
    Deno.exit(1);
  }

  const folderPath = args[0];
  const normalizeOnly = args.includes('--normalize');
  const outputFile = normalizeOnly ? "normalized" : (args[1] || "merged.gpx");
  
  let specificFiles: string[] = [];
  const filesIndex = args.indexOf('--files');
  if (filesIndex !== -1 && filesIndex + 1 < args.length) {
    specificFiles = args[filesIndex + 1].split(',');
  }

  try {
    await processGPXFiles(folderPath, outputFile, normalizeOnly, specificFiles);
  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  }
}