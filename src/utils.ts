import * as THREE from 'three';

export interface Box {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function checkCollision(carBox: Box, boundaryBox: Box): boolean {
  return (
    carBox.min.x <= boundaryBox.max.x &&
    carBox.max.x >= boundaryBox.min.x &&
    carBox.min.z <= boundaryBox.max.z &&
    carBox.max.z >= boundaryBox.min.z
  );
}

// Simple path for the track
export function getTrackPoints(trackId: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  if (trackId === 0) {
    // Basic Oval
    for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * 40, 0, Math.sin(angle) * 25));
    }
  } else if (trackId === 1) {
    // Figure 8 or more complex
    for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(t) * 40, 0, Math.sin(2 * t) * 20));
    }
  } else {
    // Square-ish
    points.push(new THREE.Vector3(-30, 0, -20));
    points.push(new THREE.Vector3(30, 0, -20));
    points.push(new THREE.Vector3(30, 0, 20));
    points.push(new THREE.Vector3(-30, 0, 20));
    points.push(new THREE.Vector3(-30, 0, -20));
  }
  return points;
}
