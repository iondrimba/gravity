import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats-js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import Tweakpane from 'tweakpane';
import gsap from 'gsap';

import {
  rgbToHex,
  hexToRgb,
} from './helpers';

class App {
  init() {
    this.setup();
    this.createScene();
    this.createCamera();
    this.addCameraControls();
    this.addAmbientLight();
    this.addDirectionalLight();
    this.addPhysicsWorld();
    this.addPointLight();
    this.addPointerDebugger();
    this.addFloor();
    this.addBox();
    this.addPropeller();
    this.addInnerBoudaries();
    this.addAxisHelper();
    this.addStatsMonitor();
    this.addWindowListeners();
    this.addGuiControls();
    this.addInitialSpheres();
    this.animate();
  }

  addGuiControls() {
    this.pane = new Tweakpane();
    this.guiSettings = this.pane.addFolder({
      title: "Settings",
      expanded: false
    });

    this.guiSettings.addInput(this.colors, "background").on("change", (evt) => {
      this.floor.material.color = hexToRgb(evt.value);
      document.body.style.backgroundColor = evt.value;
      this.scene.background = new THREE.Color(evt.value);
    });

    this.guiSettings.addInput(this.colors, "ring").on("change", (evt) => {
      this.ringMesh.material.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.colors, "propeller").on("change", (evt) => {
      this.meshes.propeller.material.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.colors, "leftSideSphere").on("change", (evt) => {
      this.meshes.sphereLeftSideMaterial.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.colors, "rightSideSphere").on("change", (evt) => {
      this.meshes.sphereRightSideMaterial.color = hexToRgb(evt.value);
    });

    this.guiSettings.addInput(this.colors, "box").on("change", (evt) => {
      this.meshes.box.material[0].color = hexToRgb(evt.value);
      this.meshes.box.material[1].color = hexToRgb(evt.value);
      this.meshes.box.floor.material.color = hexToRgb(evt.value);
    });

    // control lights
    this.guiSettings = this.pane.addFolder({
      title: "Lights",
      expanded: false
    });

    this.guiSettings
      .addInput(this.directionalLight.position, "x", { min: -100, max: 100, step: 1 })
      .on("change", ({ value }) => {
        this.directionalLight.position.x = value;
      });

    this.guiSettings
      .addInput(this.directionalLight.position, "y", { min: -100, max: 100, step: 1 })
      .on("change", ({ value }) => {
        this.directionalLight.position.y = value;
      });

    this.guiSettings
      .addInput(this.directionalLight.position, "z", { min: -100, max: 100, step: 1 })
      .on("change", ({ value }) => {
        this.directionalLight.position.z = value;
      });

    this.guiSettings
      .addInput({ debug: false }, 'debug')
      .on("change", ({ value }) => {
        this.debug = value;
      });
  }

  addPointerDebugger() {
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const geometry = new THREE.SphereGeometry(.01, 16, 16);

    this.pointerDebugger = new THREE.Mesh(geometry, material);

    this.scene.add(this.pointerDebugger);
  }

  addPhysicsWorld() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -10, 40);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.defaultContactMaterial.contactEquationStiffness = 5e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.world.quatNormalizeFast = true;
    this.world.allowSleep = true;
    // this.world.frictionGravity = new CANNON.Vec3(0,10,20);

    this.cannonDebugRenderer = new CannonDebugger(this.scene, this.world, {
      scale: 1
    });
  }

  setup() {
    this.velocity = .01;
    this.raycaster = new THREE.Raycaster();
    this.mouse3D = new THREE.Vector2();
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.debug = false;

    this.colors = {
      background: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
      floor: rgbToHex(window.getComputedStyle(document.body).backgroundColor),
      box: '#ff0f40',
      leftSideSphere: '#ff0f40',
      rightSideSphere: '#ffffff',
      ambientLight: '#ffffff',
      directionalLight: '#ffffff',
      ring: '#ff00ff',
      propeller: '#ffffff',
    };

    this.sphereConfig = {
      radius: .18,
      width: 32,
      height: 32,
    }

    this.meshes = {
      container: new THREE.Object3D(),
      spheres: [],
      propeller: null,
      material: new THREE.MeshStandardMaterial({
        color: this.colors.propeller,
        metalness: 0,
        emissive: 0x0,
        roughness: 1,
      }),
      sphereBaseMaterial: new THREE.MeshPhysicalMaterial({ color: "#ff00ff" }),
      sphereLeftSideMaterial: new THREE.MeshPhysicalMaterial({
        color: this.colors.leftSideSphere,
        metalness: .1,
        emissive: 0x0,
        roughness: .1,
      }),
      sphereRightSideMaterial: new THREE.MeshPhysicalMaterial({
        color: this.colors.rightSideSphere,
        metalness: .1,
        emissive: 0x0,
        roughness: .2,
      }),
      sphereConfig: {
        geometry: new THREE.SphereGeometry(this.sphereConfig.radius, this.sphereConfig.width, this.sphereConfig.height),
        halfsphere: new THREE.SphereGeometry(this.sphereConfig.radius, 16, 16, 0, 3.15),
      }
    };

    this.meshes.sphereLeftSideMaterial.clearcoatRoughness = 0;
    this.meshes.sphereLeftSideMaterial.clearcoat = 0;
    this.meshes.sphereLeftSideMaterial.reflectivity = 1;

    this.meshes.sphereRightSideMaterial.clearcoatRoughness = 0;
    this.meshes.sphereRightSideMaterial.clearcoat = 0;
    this.meshes.sphereRightSideMaterial.reflectivity = 1;


    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('keydown', this.onKeydown.bind(this), { passive: true });
    window.addEventListener('keyup', this.onKeyup.bind(this), { passive: true });
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);
  }

  addAxisHelper() {
    const axesHelper = new THREE.AxesHelper(5);

    this.debug && this.scene.add(axesHelper);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(20, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 30, 0);

    this.scene.add(this.camera);
  }

  addCameraControls() {
    this.orbitControl = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControl.enableDamping = true;
    this.orbitControl.dampingFactor = 0.02;
    this.orbitControl.minPolarAngle = THREE.MathUtils.degToRad(0);
    this.orbitControl.maxPolarAngle = THREE.MathUtils.degToRad(70);
    this.orbitControl.enablePan = !this.cameraAutoAnimate;
    this.orbitControl.enableRotate = !this.cameraAutoAnimate;
    this.orbitControl.enableZoom = !this.cameraAutoAnimate;
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
    const light = new THREE.AmbientLight({ color: this.colors.ambientLight }, .5);

    this.scene.add(light);
  }

  addDirectionalLight() {
    const target = new THREE.Object3D();
    this.directionalLight = new THREE.DirectionalLight(this.colors.directionalLight, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.position.set(0, 2, -2);
    this.directionalLight.target = target;

    this.directionalLight.shadow.camera.needsUpdate = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.far = 1000;
    this.directionalLight.shadow.camera.near = -100;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.camera.zoom = 1;

    this.scene.add(this.directionalLight);
  }

  createShape(size) {
    const vectors = [
      new THREE.Vector2(-size, size),
      new THREE.Vector2(-size, -size),
      new THREE.Vector2(size, -size),
      new THREE.Vector2(size, size),
      new THREE.Vector2(size, size)
    ];

    const shape = new THREE.Shape(vectors);

    return shape;
  }

  createHole(shape, x, z) {
    const radius = 3;
    const holePath = new THREE.Path();

    holePath.moveTo(x, z);
    holePath.ellipse(x, z, radius, radius, 0, Math.PI * 2);
    holePath.autoClose = true;

    shape.holes.push(holePath);
  }

  addBox() {
    const floorShape = this.createShape(15);
    this.createHole(floorShape, 0, 0);

    const geometry = new THREE.ExtrudeGeometry(floorShape, {
      depth: 0,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 0,
      bevelSize: 0,
      bevelThickness: .5,
      curveSegments: 32,
    });

    const materials = [
      new THREE.MeshStandardMaterial({ color: this.colors.box, side: THREE.DoubleSide, opacity: 1, alphaTest: 1 }),
      new THREE.MeshStandardMaterial({ color: this.colors.box, side: THREE.DoubleSide, opacity: 1, alphaTest: 1 }),
    ];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.rotation.set(Math.PI * 0.5, 0, 0);
    mesh.position.set(0, .5, 0);

    const geometryfloor = new THREE.CircleGeometry(3.1, 32);
    const circle = new THREE.Mesh(geometryfloor, new THREE.MeshStandardMaterial({
      color: this.colors.box,
      side: THREE.DoubleSide,
      opacity: .5,
      alphaTest: 1
    }));
    circle.receiveShadow = true;
    circle.rotateX(-Math.PI / 2);
    circle.position.set(0, 0.01, 0);
    this.scene.add(circle);

    this.meshes.box = mesh;
    this.meshes.box.floor = circle;
    this.scene.add(mesh);
  }

  addFloor() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshPhysicalMaterial({
      color: this.colors.background,
      side: THREE.DoubleSide,
      metalness: .5,
      emissive: 0x0,
      roughness: .5,
    });

    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.y = -.01;
    this.floor.position.z = 0;
    this.floor.rotateX(Math.PI / 2);
    this.floor.receiveShadow = true;

    // physics floor
    this.floor.body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0),
      material: new CANNON.Material(),
      shape: new CANNON.Plane(2, 2, 2),
    });

    this.floor.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), THREE.MathUtils.degToRad(-90));
    this.world.addBody(this.floor.body);
    this.scene.add(this.floor);
  }

  addFloorHelper() {
    this.controls = new TransformControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.attach(this.floor);
    this.scene.add(this.controls);
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

      for (let index = 1; index < 80; index++) {
        const a = Math.random() / 2 * Math.PI;
        const r = 2 * Math.sqrt(Math.random())
        const x = r * Math.sin(a - 3);
        const z = r * Math.sin(a - 2);

        setTimeout(() => {
          this.addSpheres({ x, y: .3, z });
        }, index * 10)
      }
    }, 1000);
  }

  addInnerBoudaries() {
    const width = .2, height = 1, depth = .05;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const count = 100;

    this.ringMesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ff0f40', side: THREE.DoubleSide, opacity: 0, alphaTest: 1 }), count);
    this.ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ringMesh.castShadow = true;

    for (let index = 0; index < count; index++) {
      const mesh = new THREE.Mesh(geometry, this.ringMesh.material);
      mesh.needsUpdate = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const l = 360 / count;
      const pos = THREE.MathUtils.degToRad(l * index);
      const distance = (1.48 * 2);
      const sin = Math.sin(pos) * distance;
      const cos = Math.cos(pos) * distance;

      mesh.position.set(sin, height * .5, cos);
      mesh.lookAt(0, height * .5, 0);
      mesh.updateMatrix();

      this.ringMesh.setMatrixAt(index, mesh.matrix);

      // physics obstacle
      mesh.body = new CANNON.Body({
        mass: 0,
        material: new CANNON.ContactMaterial({ friction: 0, restitution: 1 }),
        shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5)),
        position: new CANNON.Vec3(sin, height * .5, cos),
      });

      mesh.body.material.name = "boudaries";
      mesh.body.quaternion.copy(mesh.quaternion);

      this.meshes.spheres.forEach(element => {
        const mat = new CANNON.ContactMaterial(
          mesh.body.material,
          element.body.material,
          { friction: 0, restitution: 1 }
        );
        this.world.addContactMaterial(mat);
      });

      this.world.addBody(mesh.body);
    }

    this.ringMesh.instanceMatrix.needsUpdate = false;
    this.scene.add(this.ringMesh);
  }

  onMouseMove({ clientX, clientY }) {
    this.mouse3D.x = (clientX / this.width) * 2 - 1;
    this.mouse3D.y = -(clientY / this.height) * 2 + 1;
  }

  onKeydown({ code }) {
    if (code.toLowerCase() === "space") {
      this.interval = setTimeout(() => {
        this.addSpheres({ x: this.pointerDebugger.position.x, y: 10, z: this.pointerDebugger.position.z });
      }, 20);
    }
  }

  onKeyup() {
    clearTimeout(this.interval);
  }

  addPropeller() {
    const width = 3, height = 1, depth = .2;
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const mesh = new THREE.Mesh(geometry, this.meshes.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(1.45, height * .5, 0);
    this.meshes.propeller = mesh;

    this.meshes.container = new THREE.Object3D();
    this.scene.add(this.meshes.container);
    this.meshes.container.add(this.meshes.propeller);

    // physics obstacle
    mesh.body = new CANNON.Body({
      mass: 0,
      type: CANNON.BODY_TYPES.KINEMATIC,
      material: new CANNON.ContactMaterial({ friction: 1, restitution: 0}),
      shape: new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .8)),
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    });

    this.world.addBody(mesh.body);

    const geometryC = new THREE.CylinderGeometry(.2, .2, 2, 32);
    const material = new THREE.MeshStandardMaterial({ color: this.colors.propeller });
    const cylinder = new THREE.Mesh(geometryC, material);
    cylinder.receiveShadow = true;
    cylinder.castShadow = true;

    this.meshes.container.add(cylinder);

    cylinder.body = new CANNON.Body({
      mass: 0,
      type: CANNON.BODY_TYPES.KINEMATIC,
      material: new CANNON.Material({ friction: 1, restitution: 0}),
      shape: new CANNON.Cylinder(.2, .2, 2, 32),
      position: new CANNON.Vec3(0, 0, 0),
    });

    this.world.addBody(cylinder.body);

  }

  addPointLight() {
    const pointLight = new THREE.PointLight(0xff00ff, .5);
    pointLight.position.set(5, 3, 5);
    pointLight.castShadow = true;

    this.scene.add(pointLight);
  }

  addSpheres(position) {
    for (let index = 0; index < 1; index++) {
      const mesh = new THREE.Mesh(
        this.meshes.sphereConfig.geometry,
        this.meshes.sphereBaseMaterial,
      );

      this.meshes.spheres.push(mesh);

      mesh.material.name = "sphere";
      mesh.material.needsUpdate = false;
      mesh.material.opacity = 0;
      mesh.material.alphaTest = 1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const leftSide = new THREE.Mesh(this.meshes.sphereConfig.halfsphere, this.meshes.sphereLeftSideMaterial);
      leftSide.rotation.y = THREE.MathUtils.degToRad(-90);
      mesh.add(leftSide);

      const rightSide = new THREE.Mesh(this.meshes.sphereConfig.halfsphere, this.meshes.sphereRightSideMaterial);
      rightSide.rotation.y = THREE.MathUtils.degToRad(90);
      mesh.add(rightSide);

      mesh.position.set(position.x, position.y, position.z);

      // physics mesh
      mesh.body = new CANNON.Body({
        mass: 1,
        material: new CANNON.ContactMaterial({ friction: .1, restitution: .9 }),
        shape: new CANNON.Sphere(this.sphereConfig.radius),
        position: new CANNON.Vec3(position.x, mesh.position.y, position.z),
        allowSleep: true,
      });


      mesh.body.material.name = "sphere";
      mesh.body.fixedRotation = true;

      this.world.addBody(mesh.body);

      const matp = new CANNON.ContactMaterial(
        this.meshes.propeller.body.material,
        mesh.body.material,
        { friction: 0, restitution: 1 }
      );

      this.world.addContactMaterial(matp);

      if (this.celing) {
        const matp1 = new CANNON.ContactMaterial(
          this.celing.body.material,
          mesh.body.material,
          { friction: 0, restitution: 0 }
        );

        this.world.addContactMaterial(matp1);
      }


      this.scene.add(mesh);
    }
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
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    this.raycaster.setFromCamera(this.mouse3D, this.camera);
    const intersects = this.raycaster.intersectObjects([this.floor]);

    if (intersects.length) {
      const { x, y, z } = intersects[0].point;

      this.pointerDebugger.position.set(x, y, z);
    }


    this.stats.begin();
    this.orbitControl.update();

    this.debug && this.cannonDebugRenderer.update();
    this.meshes.spheres.forEach((s, index) => {
      s.position.copy(s.body.position);
      s.quaternion.copy(s.body.quaternion);
    });

    const objectsWorldPosition = new THREE.Vector3();
    this.meshes.propeller.getWorldPosition(objectsWorldPosition);

    const objectsWorldQuaternion = new THREE.Quaternion();
    this.meshes.propeller.getWorldQuaternion(objectsWorldQuaternion);

    this.meshes.propeller.body.position.copy(objectsWorldPosition);
    this.meshes.propeller.body.quaternion.copy(objectsWorldQuaternion);

    this.world.fixedStep();

    this.meshes.container.rotation.y -= this.velocity;

    this.renderer.render(this.scene, this.camera);

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default App;
