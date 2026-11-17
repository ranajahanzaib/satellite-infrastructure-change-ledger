/**
 * Shared Geospatial Algorithms and Spatial Calculations
 */

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function bboxIntersection(
  b1: [number, number, number, number],
  b2: [number, number, number, number],
): [number, number, number, number] | null {
  const minX = Math.max(b1[0], b2[0]);
  const minY = Math.max(b1[1], b2[1]);
  const maxX = Math.min(b1[2], b2[2]);
  const maxY = Math.min(b1[3], b2[3]);

  if (minX >= maxX || minY >= maxY) {
    return null; // No spatial intersection
  }

  return [minX, minY, maxX, maxY];
}

export function approximatePolygonAreaM2(
  bbox: [number, number, number, number],
): number {
  const widthMeters = haversineDistanceMeters(
    bbox[1],
    bbox[0],
    bbox[1],
    bbox[2],
  );
  const heightMeters = haversineDistanceMeters(
    bbox[1],
    bbox[0],
    bbox[3],
    bbox[0],
  );
  return widthMeters * heightMeters;
}
