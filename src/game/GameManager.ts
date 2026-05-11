import * as THREE from 'three';
import { Car } from './Car';
import { Track } from './Track';
import { GAME_CONFIG, AIDifficulty, GameMode, PowerUpType } from '../constants';
import { sounds } from './SoundManager';

export class GameManager {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  p1Camera: THREE.PerspectiveCamera;
  p2Camera: THREE.PerspectiveCamera | null = null;
  p1: Car;
  p2: Car;
  track: Track;
  isGameOver: boolean = false;
  winner: number | null = null;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  usePowerUps: boolean;
  totalLaps: number;
  isPaused: boolean = false;
  
  private clock: THREE.Clock = new THREE.Clock();
  private aiError: number = 0;
  private aiErrorTarget: number = 0;

  constructor(canvas: HTMLCanvasElement, trackId: number, mode: GameMode, difficulty: AIDifficulty, usePowerUps: boolean, totalLaps: number) {
    this.mode = mode;
    this.aiDifficulty = difficulty;
    this.usePowerUps = usePowerUps;
    this.totalLaps = totalLaps;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Setup Cameras
    const aspect = mode === GameMode.MULTIPLAYER ? (window.innerWidth / 2) / window.innerHeight : window.innerWidth / window.innerHeight;
    this.p1Camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
    
    if (mode === GameMode.MULTIPLAYER) {
        this.p2Camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
    }
    
    // Reset renderer state explicitly
    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(0x0f172a, 1);
    this.renderer.autoClear = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    this.scene.add(sun);

    // Initialize Track and Cars
    this.track = new Track(this.scene, trackId);
    this.scene.background = new THREE.Color(0x0f172a);
    
    if (this.track.points.length > 1) {
        const startPoint = this.track.points[0];
        const nextPoint = this.track.points[1];
        const initialRot = Math.atan2(nextPoint.x - startPoint.x, nextPoint.z - startPoint.z);

        this.p1 = new Car(1, 0xe11d48, new THREE.Vector3(startPoint.x + 3, 0, startPoint.z));
        this.p2 = new Car(2, 0x2563eb, new THREE.Vector3(startPoint.x - 3, 0, startPoint.z));
        
        this.p1.rotation = initialRot;
        this.p2.rotation = initialRot;

        // Forced initial cam placement to avoid black frame
        const offset = new THREE.Vector3(0, 7, -12).applyAxisAngle(new THREE.Vector3(0, 1, 0), initialRot);
        this.p1Camera.position.copy(this.p1.mesh.position).add(offset);
        this.p1Camera.lookAt(this.p1.mesh.position);
        if (this.p2Camera) {
            this.p2Camera.position.copy(this.p2.mesh.position).add(offset);
            this.p2Camera.lookAt(this.p2.mesh.position);
        }
    } else {
        this.p1 = new Car(1, 0xe11d48, new THREE.Vector3(2, 0, 0));
        this.p2 = new Car(2, 0x2563eb, new THREE.Vector3(-2, 0, 0));
    }

    this.scene.add(this.p1.mesh);
    this.scene.add(this.p2.mesh);

    this.setupInput();
  }

  private setupInput() {
    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      sounds.init(); 
      
      const isSolo = this.mode === GameMode.SINGLE_PLAYER;

      // P1: Arrow Keys or WASD (if solo)
      if (e.code === 'ArrowUp' || (isSolo && e.code === 'KeyW')) this.p1.controls.forward = isDown;
      if (e.code === 'ArrowDown' || (isSolo && e.code === 'KeyS')) this.p1.controls.backward = isDown;
      if (e.code === 'ArrowLeft' || (isSolo && e.code === 'KeyA')) this.p1.controls.left = isDown;
      if (e.code === 'ArrowRight' || (isSolo && e.code === 'KeyD')) this.p1.controls.right = isDown;
      if (e.code === 'ShiftRight' || e.code === 'ShiftLeft' || (isSolo && e.code === 'Space')) this.p1.controls.drift = isDown;
      
      if (isDown && (e.code === 'Slash' || (isSolo && e.code === 'KeyQ'))) {
          if (this.usePowerUps && this.p1.stats.currentPowerUp) {
            sounds.playPowerUp();
            this.p1.usePowerUp(this.p2);
          }
      }

      // P2 local only if multiplayer
      if (this.mode === GameMode.MULTIPLAYER) {
          if (e.code === 'KeyW') this.p2.controls.forward = isDown;
          if (e.code === 'KeyS') this.p2.controls.backward = isDown;
          if (e.code === 'KeyA') this.p2.controls.left = isDown;
          if (e.code === 'KeyD') this.p2.controls.right = isDown;
          if (e.code === 'Space') this.p2.controls.drift = isDown;
          if (isDown && e.code === 'KeyQ') {
              if (this.usePowerUps && this.p2.stats.currentPowerUp) {
                sounds.playPowerUp();
                this.p2.usePowerUp(this.p1);
              }
          }
      }
    };

    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
  }

  private handleAI(dt: number) {
      if (this.mode !== GameMode.SINGLE_PLAYER) return;
      
      // Update AI error periodically (makes them "waver")
      if (Math.random() < 0.05) {
          const errorScale = this.aiDifficulty === AIDifficulty.EASY ? 0.6 : (this.aiDifficulty === AIDifficulty.NORMAL ? 0.3 : 0.15);
          this.aiErrorTarget = (Math.random() - 0.5) * errorScale;
      }
      this.aiError = THREE.MathUtils.lerp(this.aiError, this.aiErrorTarget, dt * 2);
      this.p2.stats.aiError = this.aiError;

      // AI Logic
      this.p2.stats.activeEffect = PowerUpType.AUTOPILOT;
      
      let speedLimit = 0.4;
      let powerUpChance = 0.001;
      
      if (this.aiDifficulty === AIDifficulty.NORMAL) {
          speedLimit = 0.55;
          powerUpChance = 0.003;
      } else if (this.aiDifficulty === AIDifficulty.HARD) {
          speedLimit = 0.7;
          powerUpChance = 0.006;
      }
      
      // Inject error into steering via fake "target" if we could, 
      // but AUTOPILOT is a status effect handled in Car.ts.
      // We'll simulate imperfection by flickering the forward key
      if (this.p2.stats.speed > speedLimit * GAME_CONFIG.maxSpeed || Math.random() < 0.05) {
          this.p2.controls.forward = false;
      } else {
          this.p2.controls.forward = true;
      }
      
      // Bot occasionally makes steering mistakes (drift when not needed)
      if (Math.random() < 0.01) {
          this.p2.controls.drift = true;
          setTimeout(() => { if(this.p2) this.p2.controls.drift = false; }, 500);
      }

      if (this.usePowerUps && this.p2.stats.currentPowerUp && Math.random() < powerUpChance) {
          sounds.playPowerUp();
          this.p2.usePowerUp(this.p1);
      }
  }

  update() {
    const dtRaw = this.clock.getDelta();
    if (this.isGameOver || this.isPaused) return;

    const dt = Math.min(dtRaw, 0.1);
    
    this.handleAI(dt);

    const p1Had = !!this.p1.stats.currentPowerUp;
    const p2Had = !!this.p2.stats.currentPowerUp;

    this.p1.update(dt, this.track.points);
    this.p2.update(dt, this.track.points);
    
    if (this.usePowerUps) {
        this.track.update([this.p1, this.p2]);
        if (!p1Had && this.p1.stats.currentPowerUp) sounds.playPickUp();
        if (!p2Had && this.p2.stats.currentPowerUp) sounds.playPickUp();
    }
    
    if (this.p1.stats.isDrifting || this.p2.stats.isDrifting) sounds.playDrift();

    this.updateCameras(dt);
    this.checkWinCondition();
    this.render();
  }

  private updateCameras(dt: number) {
    const baseOffset = new THREE.Vector3(0, 8, -14);
    
    const updateCam = (cam: THREE.PerspectiveCamera, car: Car) => {
        const speedFactor = Math.abs(car.stats.speed) / GAME_CONFIG.maxSpeed;
        const targetFov = 70 + (speedFactor > 0.8 ? (speedFactor - 0.8) * 40 : 0);
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 0.1);
        cam.updateProjectionMatrix();

        const offset = baseOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation);
        const targetPos = car.mesh.position.clone().add(offset);
        
        // Faster lerp for first few frames to avoid black screen
        const lerpFactor = dt === 0 ? 1 : 0.15;
        cam.position.lerp(targetPos, lerpFactor);
        cam.lookAt(car.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    };

    updateCam(this.p1Camera, this.p1);
    if (this.p2Camera) updateCam(this.p2Camera, this.p2);
  }

  private checkWinCondition() {
    if (this.p1.stats.lap > this.totalLaps) {
      this.isGameOver = true;
      this.winner = 1;
    } else if (this.p2.stats.lap > this.totalLaps) {
      this.isGameOver = true;
      this.winner = 2;
    }
  }

  private render() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.mode === GameMode.SINGLE_PLAYER) {
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, width, height);
        this.renderer.clear();
        this.renderer.render(this.scene, this.p1Camera);
    } else {
        this.renderer.setScissorTest(true);
        this.renderer.clear();

        // Right View (P1)
        this.renderer.setViewport(width / 2, 0, width / 2, height);
        this.renderer.setScissor(width / 2, 0, width / 2, height);
        this.renderer.render(this.scene, this.p1Camera);

        // Left View (P2)
        if (this.p2Camera) {
            this.renderer.setViewport(0, 0, width / 2, height);
            this.renderer.setScissor(0, 0, width / 2, height);
            this.renderer.render(this.scene, this.p2Camera);
        }
    }
  }

  dispose() {
    this.renderer.dispose();
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      // Clear delta so first frame after resume is clean
      this.clock.getDelta();
    }
  }

  // Touch control helpers
  setP1Control(control: 'forward' | 'backward' | 'left' | 'right' | 'drift', value: boolean) {
    if (this.p1) this.p1.controls[control] = value;
  }

  useP1PowerUp() {
    if (this.p1 && this.usePowerUps && this.p1.stats.currentPowerUp) {
      sounds.playPowerUp();
      this.p1.usePowerUp(this.p2);
    }
  }
}
