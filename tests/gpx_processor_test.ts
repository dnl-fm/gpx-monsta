import { assertEquals, assertThrows } from "jsr:@std/assert";
import { loadTestFixture, createMockLogCallback, assertPointsEqual, assertApproximatelyEqual } from "./test_utils.ts";

// Note: GPXProcessor is written as a browser module with DOMParser
// For Deno testing, we need to create a mock DOMParser or test browser-compatible way
// Since GPXProcessor uses DOMParser, we'll import it as text and create browser-compatible tests

const GPX_PROCESSOR_CODE = await Deno.readTextFile("./gpx-processor.js");

// Create a basic mock DOMParser for testing
class MockDOMParser {
  parseFromString(str: string, contentType: string) {
    // This is a simplified mock - in real tests you'd use a proper XML parser
    // For now, we'll test the logic that doesn't require actual DOM parsing
    if (str.includes('<notgpx>')) {
      const doc = {
        documentElement: { tagName: 'notgpx' },
        querySelector: () => null
      };
      return doc;
    }
    
    // Mock valid GPX structure
    const doc = {
      documentElement: { tagName: 'gpx' },
      querySelector: (selector: string) => {
        if (selector === 'parsererror') return null;
        return null;
      },
      querySelectorAll: (selector: string) => {
        if (selector === 'trk') return [mockTrack];
        if (selector === 'wpt') return [];
        if (selector === 'rte') return [];
        return [];
      }
    };
    return doc;
  }
}

const mockTrack = {
  querySelectorAll: (selector: string) => {
    if (selector === 'trkseg') return [mockSegment];
    return [];
  }
};

const mockSegment = {
  querySelectorAll: (selector: string) => {
    if (selector === 'trkpt') return [
      {
        getAttribute: (attr: string) => {
          if (attr === 'lat') return '46.7123220';
          if (attr === 'lon') return '11.6599920';
          return null;
        },
        querySelector: (sel: string) => {
          if (sel === 'ele') return { textContent: '567.0' };
          if (sel === 'time') return { textContent: '2024-08-01T10:00:00Z' };
          return null;
        }
      }
    ];
    return [];
  }
};

// Mock global DOMParser
(globalThis as any).DOMParser = MockDOMParser;

// Now we can test mathematical functions that don't require DOM parsing
Deno.test("GPXProcessor - calculateDistance", async () => {
  // Import the class (we'll need to eval it since it's browser JS)
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  // Test known distance calculation
  // Distance between two points in Bolzano area (approximately)
  const lat1 = 46.7123220;
  const lon1 = 11.6599920;
  const lat2 = 46.7118530;
  const lon2 = 11.6598790;
  
  const distance = processor.calculateDistance(lat1, lon1, lat2, lon2);
  
  // Should be approximately 0.052 km (52 meters)
  assertApproximatelyEqual(distance, 0.052, 0.01, "Distance calculation");
});

Deno.test("GPXProcessor - toRadians", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  assertEquals(processor.toRadians(0), 0);
  assertApproximatelyEqual(processor.toRadians(90), Math.PI / 2, 0.001);
  assertApproximatelyEqual(processor.toRadians(180), Math.PI, 0.001);
  assertApproximatelyEqual(processor.toRadians(360), 2 * Math.PI, 0.001);
});

Deno.test("GPXProcessor - constructor and logging", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const mockCallback = createMockLogCallback();
  const processor = new GPXProcessor(mockCallback);
  
  processor.log("test message");
  assertEquals((mockCallback as any).getLogs().length, 1);
  assertEquals((mockCallback as any).getLogs()[0], "test message");
});

// Test file ordering logic
Deno.test("GPXProcessor - file ordering by day number", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  // Create mock points from different files
  const points = [
    { lat: 46.1, lon: 11.1, sourceFile: "Day_3_track.gpx" },
    { lat: 46.2, lon: 11.2, sourceFile: "Day_1_track.gpx" },
    { lat: 46.3, lon: 11.3, sourceFile: "Day_2_track.gpx" },
  ];
  
  const ordered = processor.getOrderedCoordinates(points);
  
  // Should be ordered by day number: Day_1, Day_2, Day_3
  assertEquals(ordered.length, 3);
  assertEquals(ordered[0].sourceFile, "Day_1_track.gpx");
  assertEquals(ordered[1].sourceFile, "Day_2_track.gpx");
  assertEquals(ordered[2].sourceFile, "Day_3_track.gpx");
});

// Test GPX generation functions (basic structure)
Deno.test("GPXProcessor - generateGPX structure", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  const points = [
    { lat: 46.1, lon: 11.1, ele: 500, time: "2024-08-01T10:00:00Z" },
    { lat: 46.2, lon: 11.2, ele: 510, time: "2024-08-01T10:15:00Z" }
  ];
  
  const gpx = processor.generateGPX(points, true);
  
  // Check basic GPX structure
  assertEquals(gpx.includes('<?xml version="1.0"'), true);
  assertEquals(gpx.includes('<gpx'), true);
  assertEquals(gpx.includes('<trk>'), true);
  assertEquals(gpx.includes('<trkseg>'), true);
  assertEquals(gpx.includes('<trkpt'), true);
  assertEquals(gpx.includes('lat="46.1"'), true);
  assertEquals(gpx.includes('lon="11.1"'), true);
  assertEquals(gpx.includes('<ele>500</ele>'), true);
  assertEquals(gpx.includes('<time>2024-08-01T10:00:00Z</time>'), true);
});

Deno.test("GPXProcessor - generateSingleTrackGPX", async () => {
  const module = await import("../gpx-processor.js");
  const { GPXProcessor } = module;
  
  const processor = new GPXProcessor(createMockLogCallback());
  
  const points = [
    { lat: 46.1, lon: 11.1, ele: 500 }
  ];
  
  const gpx = processor.generateSingleTrackGPX(points, "test_track.gpx");
  
  assertEquals(gpx.includes('<name>test_track</name>'), true);
  assertEquals(gpx.includes('lat="46.1"'), true);
  assertEquals(gpx.includes('lon="11.1"'), true);
});