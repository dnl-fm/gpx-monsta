import { assertEquals, assertExists } from "jsr:@std/assert";
import { loadTestFixture, createMockLogCallback } from "./test_utils.ts";

// Mock DOMParser for Deno environment
class MockDOMParser {
  parseFromString(str: string, contentType: string) {
    // Parse the actual XML content for integration tests
    if (str.includes('<notgpx>')) {
      return {
        documentElement: { tagName: 'notgpx' },
        querySelector: () => null
      };
    }
    
    // For valid GPX, create a more realistic mock based on the content
    const hasTimestamps = str.includes('<time>');
    const trackpoints = this.extractTrackpoints(str);
    
    return {
      documentElement: { tagName: 'gpx' },
      querySelector: (selector: string) => {
        if (selector === 'parsererror') return null;
        return null;
      },
      querySelectorAll: (selector: string) => {
        if (selector === 'trk') return [{
          querySelectorAll: (sel: string) => {
            if (sel === 'trkseg') return [{
              querySelectorAll: (s: string) => {
                if (s === 'trkpt') return trackpoints;
                return [];
              }
            }];
            return [];
          }
        }];
        if (selector === 'wpt') return [];
        if (selector === 'rte') return [];
        return [];
      }
    };
  }
  
  private extractTrackpoints(xmlStr: string) {
    // Simple regex-based extraction for testing
    const trkptRegex = /<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>/g;
    const eleRegex = /<ele>([^<]*)<\/ele>/g;
    const timeRegex = /<time>([^<]*)<\/time>/g;
    
    const points = [];
    let match;
    let eleMatch;
    let timeMatch;
    
    while ((match = trkptRegex.exec(xmlStr)) !== null) {
      const point = {
        getAttribute: (attr: string) => {
          if (attr === 'lat') return match[1];
          if (attr === 'lon') return match[2];
          return null;
        },
        querySelector: (sel: string) => {
          if (sel === 'ele') {
            eleMatch = eleRegex.exec(xmlStr);
            return eleMatch ? { textContent: eleMatch[1] } : null;
          }
          if (sel === 'time') {
            timeMatch = timeRegex.exec(xmlStr);
            return timeMatch ? { textContent: timeMatch[1] } : null;
          }
          return null;
        }
      };
      points.push(point);
    }
    
    // Reset regex state
    eleRegex.lastIndex = 0;
    timeRegex.lastIndex = 0;
    
    return points;
  }
}

(globalThis as any).DOMParser = MockDOMParser;

Deno.test("Integration - Load and parse test fixture", async () => {
  const gpxContent = await loadTestFixture("test_day_1.gpx");
  
  assertExists(gpxContent);
  assertEquals(gpxContent.includes('<?xml version="1.0"'), true);
  assertEquals(gpxContent.includes('<gpx'), true);
  assertEquals(gpxContent.includes('Test Day 1'), true);
});

Deno.test("Integration - Process single GPX file", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  const gpxContent = await loadTestFixture("test_day_1.gpx");
  
  const points = processor.normalizeGPXData(gpxContent, "test_day_1.gpx");
  
  assertExists(points);
  assertEquals(Array.isArray(points), true);
  assertEquals(points.length > 0, true);
  
  // Check first point structure
  if (points.length > 0) {
    const point = points[0];
    assertEquals(typeof point.lat, 'number');
    assertEquals(typeof point.lon, 'number');
    assertEquals(typeof point.ele, 'number');
    assertExists(point.time);
    assertEquals(point.sourceFile, 'test_day_1.gpx');
  }
});

Deno.test("Integration - Generate merged GPX from multiple files", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  // Load and process multiple test files
  const day1Content = await loadTestFixture("test_day_1.gpx");
  const day2Content = await loadTestFixture("test_day_2.gpx");
  
  const points1 = processor.normalizeGPXData(day1Content, "test_day_1.gpx");
  const points2 = processor.normalizeGPXData(day2Content, "test_day_2.gpx");
  
  const allPoints = [...points1, ...points2];
  const mergedGPX = processor.generateGPX(allPoints, true);
  
  // Check merged GPX structure
  assertEquals(mergedGPX.includes('<?xml version="1.0"'), true);
  assertEquals(mergedGPX.includes('<gpx'), true);
  assertEquals(mergedGPX.includes('<trk>'), true);
  assertEquals(mergedGPX.includes('Merged GPX Track'), true);
  
  // Should contain points from both files
  assertEquals(mergedGPX.includes('46.7123220'), true); // from day 1
  assertEquals(mergedGPX.includes('46.7120000'), true); // from day 2
});

Deno.test("Integration - Handle invalid GPX file", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  const invalidContent = await loadTestFixture("invalid.gpx");
  
  try {
    const points = processor.normalizeGPXData(invalidContent, "invalid.gpx");
    // Should handle gracefully and return empty or throw
    assertEquals(Array.isArray(points), true);
  } catch (error) {
    // Expected to throw for invalid GPX
    assertEquals(error.message.includes('Invalid GPX'), true);
  }
});

Deno.test("Integration - Calculate statistics from real data", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  const gpxContent = await loadTestFixture("test_day_1.gpx");
  const points = processor.normalizeGPXData(gpxContent, "test_day_1.gpx");
  
  if (points.length > 1) {
    const stats = processor.calculateStats(points);
    
    assertExists(stats);
    assertEquals(typeof stats.totalDistance, 'number');
    assertEquals(typeof stats.elevationGain, 'number');
    assertEquals(typeof stats.elevationLoss, 'number');
    assertEquals(typeof stats.minElevation, 'number');
    assertEquals(typeof stats.maxElevation, 'number');
    
    // Distance should be positive for multiple points
    assertEquals(stats.totalDistance >= 0, true);
  }
});

Deno.test("Integration - End-to-end workflow simulation", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const logCallback = createMockLogCallback();
  const processor = new GPXProcessor(logCallback);
  
  // Simulate file processing workflow
  const files = [
    { name: "test_day_1.gpx", content: await loadTestFixture("test_day_1.gpx") },
    { name: "test_day_2.gpx", content: await loadTestFixture("test_day_2.gpx") }
  ];
  
  // Process files (similar to what the browser app does)
  const allPoints = [];
  const processedFiles = [];
  
  for (const file of files) {
    try {
      const points = processor.normalizeGPXData(file.content, file.name);
      allPoints.push(...points);
      
      // Generate individual normalized file
      const normalizedGPX = processor.generateSingleTrackGPX(points, file.name);
      processedFiles.push({
        name: file.name.replace('.gpx', '_normalized.gpx'),
        content: normalizedGPX
      });
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
    }
  }
  
  // Generate merged file
  const mergedGPX = processor.generateGPX(allPoints, true);
  processedFiles.push({
    name: 'merged.gpx',
    content: mergedGPX
  });
  
  // Verify results
  assertEquals(processedFiles.length, 3); // 2 normalized + 1 merged
  assertEquals(allPoints.length > 0, true);
  
  // Check that logging occurred
  assertEquals((logCallback as any).getLogs().length > 0, true);
});