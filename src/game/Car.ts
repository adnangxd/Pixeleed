import * as THREE from 'three';
import { GAME_CONFIG, PlayerStats, PowerUpType } from '../constants';

export class Car {
  mesh: THREE.Group;
  velocity: THREE.Vector3 = new THREE.Vector3();
  rotation: number = 0;
  stats: PlayerStats;
  controls: { forward: boolean; backward: boolean; left: boolean; right: boolean; drift: boolean } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
  };
  id: number;
  
  private flames: THREE.Mesh[] = [];
  private driftAngle: number = 0;
  private driftDirection: number = 0;
  private checkpointIndex: number = 0;

  constructor(id: number, color: number, startPos: THREE.Vector3) {
    this.id = id;
    this.mesh = new THREE.Group();
    this.stats = {
      lap: 1,
      checkpoints: 0,
      currentPowerUp: null,
      speed: 0,
      isDrifting: false,
      driftTime: 0,
      boostTime: 0,
      turboStage: 0,
      turboCharge: 0,
      driftCombo: 0,
      boostSpeedMultiplier: 1,
      effectTimer: 0,
      activeEffect: null,
      isWrongWay: false,
      wrongWayTimer: 3,
      totalLaps: 3,
      aiError: 0,
    };

    // Voxel Car Body
    const bodyGeom = new THREE.BoxGeometry(1.2, 0.6, 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.4;
    this.mesh.add(body);

    const cabinGeom = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 0.9, -0.2);
    this.mesh.add(cabin);

    // Wheels
    const wheelGeom = new THREE.BoxGeometry(0.3, 0.5, 0.5);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelPositions = [
      [-0.6, 0.25, 0.7], [0.6, 0.25, 0.7],
      [-0.6, 0.25, -0.7], [0.6, 0.25, -0.7]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      this.mesh.add(wheel);
    });

    // Exhaust Thrusters (Boost Flames)
    const flameGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    const flameMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        emissive: 0x00ffff,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.8
    });
    this.flames = [];
    [[-0.4, 0.4, -1.1], [0.4, 0.4, -1.1]].forEach(pos => {
        const flame = new THREE.Mesh(flameGeo, flameMat.clone());
        flame.position.set(pos[0], pos[1], pos[2]);
        flame.rotation.x = -Math.PI / 2;
        flame.scale.set(0.1, 0.1, 0.1); 
        flame.visible = false;
        this.mesh.add(flame);
        this.flames.push(flame);
    });

    this.mesh.position.copy(startPos);
  }

  update(dt: number, trackPoints: THREE.Vector3[]) {
    this.handlePowerUpEffects(dt);
    this.applyPhysics(dt, trackPoints);
    this.checkTrackProgress(trackPoints);
    this.checkWrongWay(trackPoints, dt);
  }

  private checkWrongWay(trackPoints: THREE.Vector3[], dt: number) {
    if (trackPoints.length < 2) return;
    const nextIdx = (this.checkpointIndex + 1) % trackPoints.length;
    const prevIdx = this.checkpointIndex;
    const trackDir = trackPoints[nextIdx].clone().sub(trackPoints[prevIdx]).normalize();
    
    const carDir = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    const dot = carDir.dot(trackDir);
    
    const isWrong = dot < -0.4 && this.stats.speed > 0.1;
    this.stats.isWrongWay = isWrong;

    if (isWrong) {
        this.stats.wrongWayTimer -= dt;
        if (this.stats.wrongWayTimer <= 0) {
            this.resetDirection(trackPoints);
        }
    } else {
        this.stats.wrongWayTimer = 3;
    }
  }

  private resetDirection(trackPoints: THREE.Vector3[]) {
    const nextIdx = (this.checkpointIndex + 1) % trackPoints.length;
    const prevIdx = this.checkpointIndex;
    const spawnPos = trackPoints[prevIdx].clone().lerp(trackPoints[nextIdx], 0.5);
    const trackDir = trackPoints[nextIdx].clone().sub(trackPoints[prevIdx]).normalize();
    const targetAngle = Math.atan2(trackDir.x, trackDir.z);

    this.mesh.position.copy(spawnPos);
    this.mesh.position.y = 0.5;
    this.rotation = targetAngle;
    this.stats.speed = 0;
    this.stats.wrongWayTimer = 3;
    this.stats.isWrongWay = false;
  }

  private handlePowerUpEffects(dt: number) {
    if (this.stats.effectTimer > 0) {
      this.stats.effectTimer -= dt;
      if (this.stats.effectTimer <= 0) {
        this.stats.activeEffect = null;
      }
    }

    if (this.stats.boostTime > 0) {
      this.stats.boostTime -= dt;
    }
  }

  private applyPhysics(dt: number, trackPoints: THREE.Vector3[]) {
    let accel = GAME_CONFIG.acceleration;
    let maxSpeed = GAME_CONFIG.maxSpeed;
    let steer = GAME_CONFIG.steering;

    // Apply Effects
    if (this.stats.activeEffect === PowerUpType.SLOWDOWN) {
      maxSpeed *= (this.id === 2 ? 0.3 : 0.4);
    }
    if (this.stats.boostTime > 0) {
      maxSpeed *= GAME_CONFIG.boostMultiplier * (this.stats.boostSpeedMultiplier || 1);
      accel *= 5;
    }
    if (this.stats.activeEffect === PowerUpType.INVERTED_STEERING) {
      steer *= -1;
    }

    // Input Handling
    let moveForward = this.controls.forward;
    let moveBackward = this.controls.backward;
    let steerDir = (this.controls.left ? 1 : 0) - (this.controls.right ? 1 : 0);

    if (this.stats.activeEffect === PowerUpType.REVERSE_ACCEL) {
      const temp = moveForward;
      moveForward = moveBackward;
      moveBackward = temp;
    }

    if (this.stats.activeEffect === PowerUpType.AUTOPILOT) {
        maxSpeed *= 1.15; // Autopilot is 15% faster
        moveForward = true;
        moveBackward = false;
        
        if (trackPoints && trackPoints.length > 0) {
            const nextPoint = trackPoints[(this.checkpointIndex + 1) % trackPoints.length];
            const targetAngle = Math.atan2(nextPoint.x - this.mesh.position.x, nextPoint.z - this.mesh.position.z) + this.stats.aiError;
            let angleDiff = targetAngle - this.rotation;
            
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (angleDiff > 0.05) steerDir = 1;
            else if (angleDiff < -0.05) steerDir = -1;
            else steerDir = 0;
        }
    }

    // Forward/Backward
    if (moveForward) {
      this.stats.speed += accel;
    } else if (moveBackward) {
      this.stats.speed -= GAME_CONFIG.braking;
    } else {
      this.stats.speed *= 0.97; // Friction
    }
    this.stats.speed = THREE.MathUtils.clamp(this.stats.speed, -0.1, maxSpeed);

    // Steering & Drifting
    const speedFactor = Math.abs(this.stats.speed) / GAME_CONFIG.maxSpeed;
    const isMoving = speedFactor > 0.05;
    
    if (isMoving) {
      // Human players get a slight steering buff for smoother controls
      const steeringBuff = this.id === 1 ? 1.2 : 1.0;
      const turnDir = steerDir;
      
      if (this.stats.activeEffect !== PowerUpType.AUTOPILOT && this.controls.drift && Math.abs(turnDir) > 0) {
        this.stats.isDrifting = true;
        this.driftDirection = turnDir;
        this.rotation += turnDir * steer * 1.8 * steeringBuff;
        this.driftAngle += turnDir * 0.06;
        this.driftAngle = THREE.MathUtils.clamp(this.driftAngle, -Math.PI/3.2, Math.PI/3.2);
        this.stats.driftTime += dt;

        // Build up Turbo (تفحيط تيربو) - Easier to charge
        this.stats.turboCharge += dt;
        if (this.stats.turboCharge > 1.0) this.stats.turboStage = 3;
        else if (this.stats.turboCharge > 0.6) this.stats.turboStage = 2;
        else if (this.stats.turboCharge > 0.3) this.stats.turboStage = 1;
        else this.stats.turboStage = 0;

      } else {
        if (this.stats.isDrifting) {
            // Release Turbo Boost
            if (this.stats.turboStage > 0) {
                // Increase combo and boost speed
                this.stats.driftCombo = Math.min(this.stats.driftCombo + 1, 5); 
                this.stats.boostSpeedMultiplier = 1 + (this.stats.driftCombo * 0.15); // Each combo adds 15% speed
                
                // Longer boost times
                this.stats.boostTime = this.stats.turboStage === 3 ? 2.5 : (this.stats.turboStage === 2 ? 1.6 : 1.0);
            } else if (this.stats.driftTime > 0.2) {
                this.stats.boostTime = 0.6;
                this.stats.boostSpeedMultiplier = 1.1;
                this.stats.driftCombo = Math.max(0, this.stats.driftCombo - 1); // Small decay if weak drift
            }
            this.stats.isDrifting = false;
            this.stats.driftTime = 0;
            this.stats.turboCharge = 0;
            this.stats.turboStage = 0;
            this.driftAngle = 0;
        } else if (this.stats.boostTime <= 0) {
            // Decay combo when not drifting or boosting
            if (this.stats.driftCombo > 0) {
                this.stats.driftCombo -= dt * 0.5; // Combo resets slowly over time
                if (this.stats.driftCombo < 0) this.stats.driftCombo = 0;
                this.stats.boostSpeedMultiplier = 1 + (this.stats.driftCombo * 0.15);
            }
        }
        this.rotation += turnDir * steer * Math.min(speedFactor * 1.8 * steeringBuff, 1.5);
        this.driftAngle *= 0.85;
      }
    }

    this.mesh.rotation.y = this.rotation;
    
    // Movement Vector
    const moveAngle = this.rotation + this.driftAngle;
    const dir = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle));
    const nextPos = this.mesh.position.clone().add(dir.multiplyScalar(this.stats.speed));

    // Boundary Containment
    if (trackPoints && trackPoints.length > 0) {
        let minDist = Infinity;
        let nearestIdx = 0;
        
        for (let i = 0; i < trackPoints.length; i++) {
            const d = nextPos.distanceTo(trackPoints[i]);
            if (d < minDist) {
                minDist = d;
                nearestIdx = i;
            }
        }
        
        const nearestPoint = trackPoints[nearestIdx];
        const maxRoadWidth = 12; 
        if (minDist > maxRoadWidth) {
            const pushDir = nearestPoint.clone().sub(nextPos).normalize();
            nextPos.add(pushDir.multiplyScalar(minDist - maxRoadWidth));
            this.stats.speed *= 0.8; 
        }

        // Auto-update checkpoint if we move forward significantly
        if (nearestIdx === (this.checkpointIndex + 1) % trackPoints.length) {
            this.checkpointIndex = nearestIdx;
            this.stats.checkpoints++;
            if (this.checkpointIndex === 0 && this.stats.checkpoints > 5) {
                this.stats.lap++;
                this.stats.checkpoints = 0;
            }
        }
    }

    this.mesh.position.copy(nextPos);

    // Visual Boost Effect (Tilted & Slightly Larger)
    if (this.stats.boostTime > 0) {
        this.mesh.scale.set(1.08, 1.08, 1.08);
        this.mesh.rotation.x = -0.08 * Math.sin(Date.now() * 0.05);

        // Update Flames
        const flameScale = 0.5 + Math.random() * 0.5;
        const turboColor = this.stats.turboStage === 3 ? 0xff0066 : 0x00ffff;
        
        this.flames.forEach(f => {
            f.visible = true;
            f.scale.set(flameScale, flameScale * 1.5, flameScale);
            (f.material as THREE.MeshStandardMaterial).emissive.setHex(turboColor);
            (f.material as THREE.MeshStandardMaterial).color.setHex(turboColor);
        });

        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !this.flames.includes(child as THREE.Mesh)) {
                const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (material.emissive) {
                    material.emissive.setHex(this.stats.turboStage === 3 ? 0xff0066 : 0x00ffff);
                    material.emissiveIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.1);
                }
            }
        });
    } else if (this.stats.isDrifting) {
        this.mesh.scale.set(1, 1, 1);
        this.flames.forEach(f => f.visible = false);
        
        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (material.emissive) {
                    const turboLevelColor = this.stats.turboStage === 3 ? 0xff0066 : 
                                            (this.stats.turboStage === 2 ? 0xffaa00 : 
                                            (this.stats.turboStage === 1 ? 0x00ffff : 0x000000));
                    material.emissive.setHex(turboLevelColor);
                    material.emissiveIntensity = this.stats.turboStage > 0 ? 0.3 : 0;
                }
            }
        });
    } else {
        this.mesh.scale.set(1, 1, 1);
        this.mesh.rotation.x = 0;
        this.flames.forEach(f => f.visible = false);
        
        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (material.emissive) material.emissiveIntensity = 0;
            }
        });
    }
  }

  private checkTrackProgress(trackPoints: THREE.Vector3[]) {
    const nextIdx = (this.checkpointIndex + 1) % trackPoints.length;
    const dist = this.mesh.position.distanceTo(trackPoints[nextIdx]);
    
    if (dist < 10) {
      this.checkpointIndex = nextIdx;
      this.stats.checkpoints++;
      if (this.checkpointIndex === 0 && this.stats.checkpoints > 1) {
        this.stats.lap++;
        this.stats.checkpoints = 0;
      }
    }
  }

  usePowerUp(target: Car) {
    if (!this.stats.currentPowerUp) return;

    const p = this.stats.currentPowerUp;
    this.stats.currentPowerUp = null;

    switch (p) {
      case PowerUpType.NITRO:
        this.stats.boostTime = 2;
        break;
      case PowerUpType.AUTOPILOT:
        this.stats.activeEffect = PowerUpType.AUTOPILOT;
        this.stats.effectTimer = 3;
        break;
      case PowerUpType.SLOWDOWN:
        target.stats.activeEffect = PowerUpType.SLOWDOWN;
        // AI (id 2 in solo) gets hit harder and longer
        target.stats.effectTimer = target.id === 2 ? 4 : 3;
        break;
      case PowerUpType.REVERSE_ACCEL:
        target.stats.activeEffect = PowerUpType.REVERSE_ACCEL;
        target.stats.effectTimer = target.id === 2 ? 4 : 3;
        break;
      case PowerUpType.INVERTED_STEERING:
        target.stats.activeEffect = PowerUpType.INVERTED_STEERING;
        target.stats.effectTimer = target.id === 2 ? 4 : 3;
        break;
    }
  }
}
