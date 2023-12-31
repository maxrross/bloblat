const socket = io("http://localhost:4001");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 10;
camera.position.y = -20;
let gravityDirection = new THREE.Vector3();


const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const slimeMaterial = new THREE.MeshBasicMaterial({
  color: 0x1d5c22,
  roughness: 0.5,
});

const geometry = new THREE.SphereGeometry(1, 50, 10);
const blob = new THREE.Mesh(geometry, slimeMaterial);

const faceGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const faceMaterial = new THREE.MeshBasicMaterial({
  color: 0x83d6af,
  roughness: 0.8,
});
const face = new THREE.Mesh(faceGeometry, faceMaterial);
const eye1 = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
eye1.position.set(0.2, 0.2, 0.5);
face.add(eye1);
const eye2 = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
eye2.position.set(-0.2, 0.2, 0.5);
face.add(eye2);
// Create a quadratic bezier curve for the mouth
const smileCurve = new THREE.Shape();
smileCurve.moveTo(-0.2, -0.2); // Start at left side of mouth
smileCurve.quadraticCurveTo(0, -0.5, 0.2, -0.2); // Control point in middle bottom, end at right side of mouth

// Extrude to create a 3D shape from the curve
const extrudeSettings = { depth: 0.05, bevelEnabled: false }; // Adjust depth as needed
const smileGeometry = new THREE.ExtrudeGeometry(smileCurve, extrudeSettings);
const smileMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const smile = new THREE.Mesh(smileGeometry, smileMaterial);

smile.position.set(0, 0.2, 1.1); // Position on the face, adjust as needed


face.position.set(0, 0.5, 1);

const floorGeometry = new THREE.BoxGeometry(100, 100, 100);
const floorMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  map: new THREE.TextureLoader().load("ice.jpg"),
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / -2;
floor.position.y = -1;
scene.add(floor);

blob.position.z = 50;
scene.add(blob);

face.position.x = blob.position.x;
face.position.y = blob.position.y + 0.5;
face.position.z = blob.position.z + 1;
scene.add(face);
face.add(camera);



const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
  'corona_ft.png',
  'corona_bk.png',
  'corona_up.png',
  'corona_dn.png',
  'corona_rt.png',
  'corona_lf.png',
]);
scene.background = texture;

let mouse = new THREE.Vector2();
let direction = new THREE.Vector3();
let moving = false;
let targetPosition = new THREE.Vector3();
let rollSpeed = 0.2;
let distanceToTravel = 0;
let distanceTraveled = 0;

let chatSprites = [];
let trailParticles = [];

function createTrail() {
  const trailGeometry = new THREE.SphereGeometry(.75, 16, 16); // Smaller sphere for the trail particle
  const trailParticle = new THREE.Mesh(trailGeometry, slimeMaterial);
  trailParticle.position.copy(blob.position);
  scene.add(trailParticle);

  // Store the particle and its "birth time"
  trailParticles.push({ particle: trailParticle, time: Date.now() });
}

document.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  moving = true;
});

function createTextSprite(message) {
  const padding = 10;
  const arrowWidth = 10;
  const arrowHeight = 10;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // measure the text width
  context.font = "24px";
  const textWidth = context.measureText(message).width;

  // Set the canvas width and height to fit the text and padding
  canvas.width = textWidth + padding * 2;
  canvas.height = 8 + padding * 2 + arrowHeight;

  // Draw the background rectangle
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height - arrowHeight);

  // Draw the arrow
  context.beginPath();
  context.moveTo((canvas.width - arrowWidth) / 2, canvas.height - arrowHeight);
  context.lineTo(canvas.width / 2, canvas.height);
  context.lineTo((canvas.width + arrowWidth) / 2, canvas.height - arrowHeight);
  context.closePath();
  context.fill();

  // Draw the text
  context.fillStyle = "black";
  context.textBaseline = "top";
  context.fillText(message, padding, padding);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(canvas.width/15, canvas.height/15, 1);

  // Place the sprite above the blob
  sprite.position.set(blob.position.x, blob.position.y + 2, blob.position.z + 5);

  chatSprites.push(sprite);

  return sprite;
}
function bounceOffEdges() {
  // Edges of the rectangle
  // const minX = -55, maxX = 55;
  const minZ = 50, maxZ = 50;
  const minY = -48.5, maxY = 48.5;
  const minX = -48.5, maxX = 48.5;

  // Ensure the blob stays within the rectangle
  blob.position.x = THREE.MathUtils.clamp(blob.position.x, minX, maxX);
  blob.position.z = THREE.MathUtils.clamp(blob.position.z, minZ, maxZ);
  blob.position.y = THREE.MathUtils.clamp(blob.position.y, minY, maxY);
}

function animate() {
  requestAnimationFrame(animate);

  camera.lookAt(blob.position);
  for (let { particle, time } of trailParticles) {
    // Calculate the distance from the blob
    let distance = blob.position.distanceTo(particle.position);

    // Determine scale based on distance
    let scale = Math.max(0.05, 1 / (distance * 0.1 + 1)); // This will create larger particles near the blob and smaller particles farther away.
                                                           // Minimum size is set to 0.05 to ensure the particles are always visible

    // Update particle scale
    particle.scale.set(scale, scale, scale);
  }
  
  if (moving) {
    face.position.x = blob.position.x;
    face.position.y = blob.position.y -.5; // adjust the offset as needed
    face.position.z = blob.position.z +.75;
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    createTrail();
    bounceOffEdges();

    // Remove particles older than a certain age
    const maxParticleAge = 2000; // Maximum age in milliseconds, adjust as needed
    trailParticles = trailParticles.filter(({ particle, time }) => {
      if (Date.now() - time > maxParticleAge) {
        scene.remove(particle);
        return false;
      }
      return true;
    });

    let intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      targetPosition = intersects[0].point;
      distanceToTravel = blob.position.distanceTo(targetPosition);
      distanceTraveled = 0;
      direction.subVectors(targetPosition, blob.position).normalize();
    }

    let moveDistance = rollSpeed ;

    blob.position.addScaledVector(direction, moveDistance);
    blob.rotation.x += direction.y * rollSpeed;
    blob.rotation.z += direction.x * rollSpeed;

    // distanceTraveled += moveDistance;

    if (distanceTraveled >= distanceToTravel) {
      moving = false;
      blob.position.copy(targetPosition);
    }
  }

  // Update the position of each chat sprite to follow the blob
  for (let sprite of chatSprites) {
    sprite.position.set(blob.position.x, blob.position.y + 5, blob.position.z+2);
  }

  renderer.render(scene, camera);
}
animate();

const chatForm = document.getElementById("chat-form");
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = chatForm.elements.message.value;
  socket.emit("chat_message", message);

  const sprite = createTextSprite(message);
  scene.add(sprite);

  setTimeout(() => {
    scene.remove(sprite);
    const index = chatSprites.indexOf(sprite);
    if (index !== -1) {
      chatSprites.splice(index, 1);
    }
  }, 10000);
});

socket.on("chat_message", (message) => {
  const chatLog = document.getElementById("chat-log");
  const newMessage = document.createElement("div");
  newMessage.textContent = message;
  chatLog.appendChild(newMessage);

  const sprite = createTextSprite(message);
  scene.add(sprite);

  setTimeout(() => {
    scene.remove(sprite);
    const index = chatSprites.indexOf(sprite);
    if (index !== -1) {
      chatSprites.splice(index, 1);
    }
  }, 10000);
});
