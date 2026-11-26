import * as THREE from "three";

/** A lumpy sphere reads as a grilled takoyaki ball. */
export function createBallGeometry(segments = 64): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    const normal = point.clone().normalize();
    const ripple =
      1 +
      0.05 * Math.sin(normal.x * 7.5) * Math.sin(normal.y * 6.1 + 1.3) * Math.sin(normal.z * 7.9 + 2.1) +
      0.02 * Math.sin(normal.x * 15 + 0.5) * Math.sin(normal.z * 14);
    point.copy(normal).multiplyScalar(ripple);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Tapered wooden chopstick / skewer, centred on the origin. */
export function createChopstickGeometry(): THREE.LatheGeometry {
  const profile: THREE.Vector2[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    profile.push(new THREE.Vector2(0.018 + 0.062 * Math.pow(t, 1.35), t));
  }
  const geometry = new THREE.LatheGeometry(profile, 32);
  geometry.translate(0, -0.5, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/** Folded paper boat / tray, faceted like origami. */
export function createTrayGeometry(): THREE.BufferGeometry {
  const rim: [number, number][] = [
    [1.0, 0.0],
    [0.62, 0.66],
    [-0.62, 0.66],
    [-1.0, 0.0],
    [-0.62, -0.66],
    [0.62, -0.66],
  ];
  const bottom = rim.map(([x, z]) => [x * 0.6, z * 0.48] as [number, number]);
  const rimY = 0.42;
  const bottomY = -1;
  const vertices: number[] = [];
  const push = (x: number, y: number, z: number) => vertices.push(x, y, z);
  const count = rim.length;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const [rx, rz] = rim[i];
    const [rx2, rz2] = rim[j];
    const [bx, bz] = bottom[i];
    const [bx2, bz2] = bottom[j];
    push(rx, rimY, rz); push(bx, bottomY, bz); push(bx2, bottomY, bz2);
    push(rx, rimY, rz); push(bx2, bottomY, bz2); push(rx2, rimY, rz2);
  }
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    push(0, bottomY, 0); push(bottom[i][0], bottomY, bottom[i][1]); push(bottom[j][0], bottomY, bottom[j][1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function onSurface(points: [number, number, number][], radius = 1.02): THREE.Vector3[] {
  return points.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius));
}

function tube(points: [number, number, number][], thickness: number): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onSurface(points)), 64, thickness, 8, false);
}

/** Dark sauce drizzle. */
export function createSauceGeometry(): THREE.TubeGeometry {
  return tube(
    [
      [-0.62, 0.12, 0.76], [-0.26, 0.0, 0.95], [0.08, -0.14, 0.98], [0.4, -0.02, 0.9],
      [0.6, 0.34, 0.72], [0.24, 0.5, 0.82], [-0.14, 0.44, 0.9], [-0.46, 0.3, 0.86],
    ],
    0.04,
  );
}

/** White mayo zig-zag. */
export function createMayoGeometry(): THREE.TubeGeometry {
  return tube(
    [
      [-0.57, 0.42, 0.66], [-0.2, 0.62, 0.74], [0.04, 0.32, 0.94], [0.34, 0.46, 0.8],
      [0.56, 0.16, 0.8], [0.16, -0.08, 0.98], [-0.24, 0.03, 0.97], [-0.52, -0.2, 0.84],
    ],
    0.045,
  );
}

/** A shallow plate with a flat top and a rounded rim. */
export function createPlateGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(0.001, 0.1),
    new THREE.Vector2(0.55, 0.1),
    new THREE.Vector2(0.82, 0.085),
    new THREE.Vector2(0.94, 0.045),
    new THREE.Vector2(1.0, 0.0),
    new THREE.Vector2(1.0, -0.035),
    new THREE.Vector2(0.9, -0.075),
    new THREE.Vector2(0.55, -0.1),
    new THREE.Vector2(0.001, -0.1),
  ];
  const geometry = new THREE.LatheGeometry(profile, 48);
  geometry.computeVertexNormals();
  return geometry;
}

/** A green-onion ring. */
export function createOnionRingGeometry(): THREE.TorusGeometry {
  return new THREE.TorusGeometry(0.15, 0.05, 10, 24);
}
