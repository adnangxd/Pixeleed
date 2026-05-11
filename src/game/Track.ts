import * as THREE from 'three';
import { Car } from './Car';
import { PowerUpType } from '../constants';

export class Track {
  scene: THREE.Scene;
  points: THREE.Vector3[];
  roadMesh: THREE.Mesh;
  powerUpBoxes: THREE.Group = new THREE.Group();
  barriers: THREE.Group = new THREE.Group();
  
  constructor(scene: THREE.Scene, trackId: number) {
    this.scene = scene;
    this.points = this.generatePoints(trackId);
    this.roadMesh = this.createRoad();
    this.scene.add(this.roadMesh);
    this.scene.add(this.powerUpBoxes);
    this.scene.add(this.barriers);
    this.createStartFinishLine();
    this.createBarriers();
    this.spawnPowerUps();
    this.createEnvironment(trackId);
  }

  private createStartFinishLine() {
    const startPoint = this.points[0];
    const nextPoint = this.points[1];
    const diff = nextPoint.clone().sub(startPoint).normalize();
    const angle = Math.atan2(diff.x, diff.z);

    const geom = new THREE.PlaneGeometry(16, 4);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = 'black';
    for (let x = 0; x < 128; x += 16) {
        for (let y = 0; y < 32; y += 16) {
            if ((x + y) / 16 % 2 === 0) ctx.fillRect(x, y, 16, 16);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    const line = new THREE.Mesh(geom, mat);
    line.position.copy(startPoint);
    line.position.y = 0.08;
    line.rotation.x = -Math.PI/2;
    line.rotation.z = angle + Math.PI/2;
    this.scene.add(line);
  }

  private createBarriers() {
    const curve = new THREE.CatmullRomCurve3(this.points, true);
    
    // Create inner and outer barriers using TubeGeometry
    // We'll use 2 tubes slightly wider/narrower than the road
    const innerGeom = new THREE.TubeGeometry(curve, 200, 1, 8, true);
    const outerGeom = new THREE.TubeGeometry(curve, 200, 1, 8, true);
    
    const barrierMat = new THREE.MeshStandardMaterial({ 
        color: 0x64748b, 
        transparent: true, 
        opacity: 0.3,
        wireframe: true 
    });

    const innerBarrier = new THREE.Mesh(innerGeom, barrierMat);
    const outerBarrier = new THREE.Mesh(outerGeom, barrierMat);

    // Scaling to offset them from center (road width is approx 12-14)
    innerBarrier.scale.set(0.75, 1, 0.75); 
    outerBarrier.scale.set(1.25, 1, 1.25);
    
    innerBarrier.position.y = 0.5;
    outerBarrier.position.y = 0.5;

    this.barriers.add(innerBarrier);
    this.barriers.add(outerBarrier);
  }

  private generatePoints(trackId: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const scale = 1.5;
    if (trackId === 0) { // Forest Run (Oval)
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * 70 * scale, 0, Math.sin(a) * 45 * scale));
      }
    } else if (trackId === 1) { // Desert Dash (Amorphous)
      for (let i = 0; i < 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        const r = (60 + Math.sin(a * 3) * 15 + Math.cos(a * 5) * 8) * scale;
        points.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
    } else { // Night City (Rectangular-ish)
        for (let i = 0; i < 80; i++) {
            const a = (i / 80) * Math.PI * 2;
            const r = 60 / (Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4));
            const radius = (Math.pow(r, 0.25) * 20) * scale; // Soften corners
            points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
    }
    return points;
  }

  private createRoad(): THREE.Mesh {
    if (this.points.length < 2) return new THREE.Mesh();
    const curve = new THREE.CatmullRomCurve3(this.points, true);
    const geometry = new THREE.TubeGeometry(curve, 200, 12, 12, true);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x333333, 
      roughness: 0.95,
      flatShading: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -0.15;
    mesh.scale.set(1, 0.02, 1); // Flatten it significantly
    return mesh;
  }

  private spawnPowerUps() {
    const types = Object.values(PowerUpType);
    for (let i = 10; i < this.points.length - 5; i += 15) {
      const type = types[Math.floor(Math.random() * types.length)];
      const group = new THREE.Group();
      
      const boxGeom = new THREE.BoxGeometry(2, 2, 2);
      const boxMat = new THREE.MeshStandardMaterial({ 
        color: 0xffff00, 
        emissive: 0xffff00, 
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6
      });
      const box = new THREE.Mesh(boxGeom, boxMat);
      group.add(box);

      const innerGeom = new THREE.SphereGeometry(0.5, 8, 8);
      const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const inner = new THREE.Mesh(innerGeom, innerMat);
      group.add(inner);

      group.position.copy(this.points[i]);
      group.position.y = 1.5;
      (group as any).powerUpType = type;
      this.powerUpBoxes.add(group);
    }
  }

  private createEnvironment(trackId: number) {
    const groundGeom = new THREE.PlaneGeometry(1000, 1000);
    const colors = [0x228B22, 0xd2b48c, 0x111122];
    const groundMat = new THREE.MeshStandardMaterial({ color: colors[trackId] });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    this.scene.add(ground);

    // Some simple voxel obstacles (trees, rocks, buildings)
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 300;
        
        // Skip if too close to track
        let close = false;
        for (const p of this.points) {
            if (p.distanceTo(new THREE.Vector3(x, 0, z)) < 15) {
                close = true;
                break;
            }
        }
        if (close) continue;

        const h = 2 + Math.random() * 5;
        const objGeom = new THREE.BoxGeometry(2, h, 2);
        const objMat = new THREE.MeshStandardMaterial({ 
            color: trackId === 0 ? 0x2d5a27 : (trackId === 1 ? 0x8b4513 : 0x4444ff) 
        });
        const obj = new THREE.Mesh(objGeom, objMat);
        obj.position.set(x, h/2, z);
        this.scene.add(obj);
    }
  }

  update(cars: Car[]) {
    // Check collisions with power ups
    this.powerUpBoxes.children.forEach((box: any) => {
      if (!box.visible) return;
      box.rotation.y += 0.05;
      box.rotation.x += 0.02;
      
      cars.forEach(car => {
        if (car.mesh.position.distanceTo(box.position) < 2) {
          if (!car.stats.currentPowerUp) {
            car.stats.currentPowerUp = box.powerUpType;
            // Briefly "disable" box or just let it stay for multi pick
            box.visible = false;
            setTimeout(() => box.visible = true, 5000);
          }
        }
      });
    });
  }
}
