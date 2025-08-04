/**
 * Test utilities for GPX Monster tests
 */

export async function loadTestFixture(filename: string): Promise<string> {
  const path = `./tests/fixtures/${filename}`;
  return await Deno.readTextFile(path);
}

export function createMockLogCallback(): (message: string) => void {
  const logs: string[] = [];
  const callback = (message: string) => {
    logs.push(message);
  };
  (callback as any).getLogs = () => logs;
  (callback as any).clearLogs = () => logs.length = 0;
  return callback;
}

export function assertPointsEqual(actual: any, expected: any, message?: string) {
  if (actual.lat !== expected.lat || actual.lon !== expected.lon) {
    throw new Error(
      `Points not equal: got (${actual.lat}, ${actual.lon}), expected (${expected.lat}, ${expected.lon})${message ? ': ' + message : ''}`
    );
  }
}

export function assertApproximatelyEqual(actual: number, expected: number, tolerance: number = 0.001, message?: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Values not approximately equal: got ${actual}, expected ${expected} (tolerance: ${tolerance})${message ? ': ' + message : ''}`
    );
  }
}