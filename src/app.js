import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats-js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Tweakpane from 'tweakpane';

import {
  rgbToHex,
  hexToRgb,
} from './helpers';

class App {
  constructor() {
    this.settings = {
      velocity: .015,
      width: window.innerWidth,
      height: window.innerHeight,
      debug: false,
      colors: {
        background: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
        floor: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
        box: '#390fff',
        spheres: {
          left: '#390fff',
          right: '#ffffff',
        },
        ambientLight: '#ffffff',
        directionalLight: '#ffffff',
        pointLight: '#390fff',
      },
    };
  }

  init() {
    this.setup();
    this.createScene();
    this.createCamera();
    this.addCameraControls();
    this.addAmbientLight();
    this.addDirectionalLight();
    this.addPhysicsWorld();
    this.addPointLight();
    this.addFloor();
    this.addBox();
    this.addPropeller();
    this.addInnerBoudaries();
    this.addWindowListeners();
    this.addGuiControls();
    this.addInitialSpheres();
    this.addStatsMonitor();
    this.animate();
  }

  addGuiControls() {
    this.pane = new Tweakpane();
    this.guiSettings = this.pane.addFolder({
      title: 'Colors',
      expanded: false
    });

    this.guiSettings.addInput(this.settings.colors, 'background').on('change', (evt) => {
      this.floor.material.color = hexToRgb(evt.value);
      document.body.style.backgroundColor = evt.value;
      this.scene.background = new THREE.Color(evt.value);
    });

    this.guiSettings.addInput(this.settings.colors.spheres, 'left').on('change', (evt) => {
      this.spheres.materials.left.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.settings.colors.spheres, 'right').on('change', (evt) => {
      this.spheres.materials.right.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.settings.colors, 'box').on('change', (evt) => {
      this.meshes.box.material.color = hexToRgb(evt.value);
    });

    // control lights
    this.guiSettings = this.pane.addFolder({
      title: 'Directional Light',
      expanded: false
    });

    this.guiSettings
      .addInput(this.directionalLight.position, 'x', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.directionalLight.position.x = value;
      });

    this.guiSettings
      .addInput(this.directionalLight.position, 'y', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.directionalLight.position.y = value;
      });

    this.guiSettings
      .addInput(this.directionalLight.position, 'z', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.directionalLight.position.z = value;
      });

    this.guiSettings.addInput(this.settings.colors, 'directionalLight').on('change', (evt) => {
      this.directionalLight.color = hexToRgb(evt.value);
    });

    // control lights
    this.guiSettings = this.pane.addFolder({
      title: 'Point Light',
      expanded: false
    });

    this.guiSettings
      .addInput(this.pointLight.position, 'x', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.pointLight.position.x = value;
      });

    this.guiSettings
      .addInput(this.pointLight.position, 'y', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.pointLight.position.y = value;
      });

    this.guiSettings
      .addInput(this.pointLight.position, 'z', { min: -100, max: 100, step: .1 })
      .on('change', ({ value }) => {
        this.pointLight.position.z = value;
      });

    this.guiSettings.addInput(this.settings.colors, 'pointLight').on('change', (evt) => {
      this.pointLight.color = hexToRgb(evt.value);
    });

  }

  addPhysicsWorld() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -5, 20);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.defaultContactMaterial.contactEquationStiffness = 5e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.world.quatNormalizeFast = true;
    this.world.allowSleep = true;

    this.cannonDebugRenderer = new CannonDebugger(this.scene, this.world, {
      scale: 1,
    });
  }

  setup() {
    this.spheres = {
      config: {
        radius: .15,
        width: 32,
        height: 32,
      },
      materials: {
        base: new THREE.MeshBasicMaterial({ color: '#ff00ff' }),
        left: new THREE.MeshPhysicalMaterial({
          color: this.settings.colors.spheres.left,
          metalness: .1,
          emissive: 0x0,
          roughness: .1,
        }),
        right: new THREE.MeshPhysicalMaterial({
          color: this.settings.colors.spheres.right,
          metalness: .1,
          emissive: 0x0,
          roughness: .1,
        })
      }
    };

    this.meshes = {
      container: new THREE.Object3D(),
      spheres: [],
      propeller: null,
      material: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0,
        emissive: 0x0,
        roughness: 1,
      }),
      sphere: {
        baseMaterial: new THREE.MeshBasicMaterial({ color: '#ff00ff' }),
        geometry:new THREE.SphereGeometry(this.spheres.config.radius, 16, 16),
        geometryHalf: new THREE.SphereGeometry(this.spheres.config.radius, 16, 16, 0, 3.15),
      }
    };
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.colors.background);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(this.settings.width, this.settings.height);

    document.body.appendChild(this.renderer.domElement);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(20, this.settings.width / this.settings.height, 1, 1000);
    this.camera.position.set(0, 30, 0);

    this.scene.add(this.camera);
  }

  addCameraControls() {
    this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControl.enableDamping = true;
    this.orbitControl.dampingFactor = 0.02;
    this.orbitControl.minPolarAngle = THREE.MathUtils.degToRad(0);
    this.orbitControl.maxPolarAngle = THREE.MathUtils.degToRad(20);
    this.orbitControl.minAzimuthAngle = THREE.MathUtils.degToRad(0);
    this.orbitControl.maxAzimuthAngle = THREE.MathUtils.degToRad(0);
    this.orbitControl.enablePan = false;
    this.orbitControl.enableRotate = true;
    this.orbitControl.enableZoom = false;
    this.orbitControl.saveState();

    document.body.style.cursor = '-moz-grabg';
    document.body.style.cursor = '-webkit-grab';

    this.orbitControl.addEventListener('start', () => {
      requestAnimationFrame(() => {
        document.body.style.cursor = '-moz-grabbing';
        document.body.style.cursor = '-webkit-grabbing';
      });
    });

    this.orbitControl.addEventListener('end', () => {
      requestAnimationFrame(() => {
        document.body.style.cursor = '-moz-grab';
        document.body.style.cursor = '-webkit-grab';
      });
    });
  }

  addAmbientLight() {
    const light = new THREE.AmbientLight({ color: this.settings.colors.ambientLight }, .5);

    this.scene.add(light);
  }

  addDirectionalLight() {
    const target = new THREE.Object3D();
    this.directionalLight = new THREE.DirectionalLight(this.settings.colors.directionalLight, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.target = target;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.far = 1000;
    this.directionalLight.shadow.camera.near = -100;
    this.directionalLight.shadow.camera.zoom = 1;

    this.directionalLight.position.set(2, 2, -2);

    this.scene.add(this.directionalLight);
  }

  addPointLight() {
    this.pointLight = new THREE.PointLight(this.settings.colors.pointLight, .5);
    this.pointLight.position.set(1.5, 4, -2.4);
    this.pointLight.castShadow = true;

    this.scene.add(this.pointLight);
  }

  createShape(size) {
    const vectors = [
      new THREE.Vector2(-size, size),
      new THREE.Vector2(-size, -size),
      new THREE.Vector2(size, -size),
      new THREE.Vector2(size, size),
      new THREE.Vector2(size, size)
    ];

    return new THREE.Shape(vectors);
  }

  createHole(shape, x = 0, z = 0) {
    const radius = 3;
    const holePath = new THREE.Path();

    holePath.moveTo(x, z);
    holePath.ellipse(x, z, radius, radius, 0, Math.PI * 2);
    holePath.autoClose = true;

    shape.holes.push(holePath);
  }

  addBox() {
    const shape = this.createShape(15);

    this.createHole(shape);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 5,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 0,
      bevelSize: 0,
      bevelThickness: .5,
      curveSegments: 64,
    });

    const material = new THREE.MeshStandardMaterial({
      color: this.settings.colors.box,
      side: THREE.DoubleSide,
      opacity: 1,
      alphaTest: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.rotation.set(Math.PI * 0.5, 0, 0);
    mesh.position.set(0, .5, 0);

    this.meshes.box = mesh;

    this.scene.add(mesh);
  }

  addFloor() {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const material = new THREE.MeshPhysicalMaterial({
      color: this.settings.colors.background,
      side: THREE.DoubleSide,
      metalness: .5,
      emissive: 0x0,
      roughness: .5,
    });

    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.y = 0;
    this.floor.position.z = 0;
    this.floor.rotateX(Math.PI / 2);
    this.floor.receiveShadow = true;

    // floor physics body
    this.floor.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0),
      material: new CANNON.Material(),
      shape: new CANNON.Plane(2, 1, 2),
    });
    this.floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), THREE.MathUtils.degToRad(-90));
    this.world.addBody(this.floor.body);

    this.scene.add(this.floor);
  }

  addInitialSpheres() {
    this.celing = {};
    this.celing.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 1, 0),
      material: new CANNON.Material(),
      shape: new CANNON.Box(new CANNON.Vec3(3, 3, .1)),
    });

    this.celing.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), THREE.MathUtils.degToRad(-90));

    setTimeout(() => {
      this.world.addBody(this.celing.body);

      for (let index = 0; index < 150; index++) {
        const a = Math.random() / 2 * Math.PI;
        const r = 2 * Math.sqrt(Math.random())
        const x = r * Math.sin(a - 3);
        const z = r * Math.sin(a - 2);

        const t = setTimeout(() => {
          this.addSpheres({ x, y: .3, z });

          clearTimeout(t);
        }, (index+1) * 20)
      }
    }, 1000);
  }

  addInnerBoudaries() {
    const width = .2, height = 1, depth = .05;
    const count = 150;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, opacity: 0, alphaTest: 1 });

    this.ringMesh = new THREE.InstancedMesh(geometry, material, count);
    this.ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ringMesh.castShadow = true;

    for (let index = 0; index < count; index++) {
      const innerWall = new THREE.Mesh(geometry, this.ringMesh.material);
      innerWall.needsUpdate = false;
      innerWall.castShadow = true;
      innerWall.receiveShadow = true;

      const l = 360 / count;
      const pos = THREE.MathUtils.degToRad(l * index);
      const distance = (1.48 * 2);
      const sin = Math.sin(pos) * distance;
      const cos = Math.cos(pos) * distance;

      innerWall.position.set(sin, height * .5, cos);
      innerWall.lookAt(0, height * .5, 0);

      innerWall.updateMatrix();
      this.ringMesh.setMatrixAt(index, innerWall.matrix);

      // boundary physics body
      innerWall.body = new CANNON.Body({
        mass: 0,
        material: new CANNON.Material(),
        shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5)),
        position: new CANNON.Vec3(sin, height * .5, cos),
      });

      innerWall.body.material.name = 'boudaries';
      innerWall.body.quaternion.copy(innerWall.quaternion);

      this.meshes.spheres.forEach(sphere => {
        const mat = new CANNON.ContactMaterial(
          sphere.body.material,
          innerWall.body.material,
          { friction: 0, restitution: 1 }
        );
        this.world.addContactMaterial(mat);
      });

      this.world.addBody(innerWall.body);
    }

    this.ringMesh.instanceMatrix.needsUpdate = false;

    this.scene.add(this.ringMesh);
  }

  addPropeller() {
    const width = 3.05, height = 1, depth = .3;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, this.meshes.material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(1.45, 0, 0);

    this.meshes.propeller = mesh;
    this.meshes.container = new THREE.Object3D();
    this.scene.add(this.meshes.container);
    this.meshes.container.add(this.meshes.propeller);

    // propeller physics body
    mesh.body = new CANNON.Body({
      mass: 0,
      type: CANNON.BODY_TYPES.KINEMATIC,
      material: new CANNON.ContactMaterial({ friction: 0, restitution: .5 }),
      shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, .1)),
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    });

    this.world.addBody(mesh.body);

    // propeller cylinder
    const geometryCylinder = new THREE.CylinderGeometry(.2, .2, 2, 32);
    const cylinder = new THREE.Mesh(geometryCylinder, this.meshes.material);
    cylinder.receiveShadow = true;
    cylinder.castShadow = true;
    this.meshes.container.add(cylinder);

    cylinder.body = new CANNON.Body({
      mass: 0,
      type: CANNON.BODY_TYPES.KINEMATIC,
      material: new CANNON.Material({ friction: .1, restitution: .5 }),
      shape: new CANNON.Cylinder(.2, .2, 2, 32),
      position: new CANNON.Vec3(0, 0, 0),
    });

    this.world.addBody(cylinder.body);
  }



  addSpheres(position) {
    const mesh = new THREE.Mesh(
      this.meshes.sphere.geometry,
      this.meshes.sphere.baseMaterial,
    );

    this.meshes.spheres.push(mesh);

    mesh.material.name = 'sphere';
    mesh.material.needsUpdate = false;
    mesh.material.opacity = 0;
    mesh.material.alphaTest = 1;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const leftSide = new THREE.Mesh(this.meshes.sphere.geometryHalf, this.spheres.materials.left);
    leftSide.rotation.y = THREE.MathUtils.degToRad(-90);
    mesh.add(leftSide);

    const rightSide = new THREE.Mesh(this.meshes.sphere.geometryHalf, this.spheres.materials.right);
    rightSide.rotation.y = THREE.MathUtils.degToRad(90);

    mesh.add(rightSide);

    mesh.position.set(position.x, position.y, position.z);

    // sphere physics body
    mesh.body = new CANNON.Body({
      mass: 3,
      material: new CANNON.Material(),
      shape: new CANNON.Sphere(this.spheres.config.radius),
      position: new CANNON.Vec3(position.x, mesh.position.y, position.z),
      allowSleep: true,
    });

    mesh.body.material.name = 'sphere.body';

    this.world.addBody(mesh.body);

    const propellerContactMaterial = new CANNON.ContactMaterial(
      this.meshes.propeller.body.material,
      mesh.body.material,
      { friction: 0, restitution: .3 }
    );


    this.world.addContactMaterial(propellerContactMaterial);

    if (this.celing) {
      const ceilingContactMaterial = new CANNON.ContactMaterial(
        this.celing.body.material,
        mesh.body.material,
        { friction: 0, restitution: 0 }
      );

      this.world.addContactMaterial(ceilingContactMaterial);
    }

    mesh.body.addEventListener('collide', (event) => {
      if (event.body === this.meshes.propeller.body) {
        mesh.body.applyImpulse(new CANNON.Vec3(-4, 0, 0));
        mesh.body.applyLocalForce(new CANNON.Vec3(80, 0, 0));
      }
    })

    this.scene.add(mesh);
  }

  addWindowListeners() {
    window.addEventListener('resize', this.onResize.bind(this), { passive: true });
    window.addEventListener('visibilitychange', (evt) => {
      if (evt.target.hidden) {
        console.log('pause');
      } else {
        console.log('play');
      }
    }, false);
  }

  addStatsMonitor() {
    this.stats = new Stats();
    this.stats.showPanel(0);

    document.body.querySelector('#stats').appendChild(this.stats.dom);
  }

  onResize() {
    this.settings.width = window.innerWidth;
    this.settings.height = window.innerHeight;
    this.camera.aspect = this.settings.width / this.settings.height;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.settings.width, this.settings.height);
  }

  animate() {
    this.stats.begin();
    this.orbitControl.update();

    this.meshes.spheres.forEach((sphere) => {
      sphere.position.copy(sphere.body.position);
      sphere.quaternion.copy(sphere.body.quaternion);
    });

    const objectsWorldPosition = new THREE.Vector3();
    this.meshes.propeller.getWorldPosition(objectsWorldPosition);

    const objectsWorldQuaternion = new THREE.Quaternion();
    this.meshes.propeller.getWorldQuaternion(objectsWorldQuaternion);

    this.meshes.propeller.body.position.copy(objectsWorldPosition);
    this.meshes.propeller.body.quaternion.copy(objectsWorldQuaternion);

    this.meshes.container.rotation.y -= this.settings.velocity;

    this.world.fixedStep();

    this.renderer.render(this.scene, this.camera);

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default App;
