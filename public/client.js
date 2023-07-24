const socket = io('http://localhost:4001');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const slimeMaterial = new THREE.MeshBasicMaterial({
  color: 0x1d5c22,
  roughness: 0.5,
});

const geometry = new THREE.SphereGeometry(1, 32, 32);
const blob = new THREE.Mesh(geometry, slimeMaterial);

const faceGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const faceMaterial = new THREE.MeshBasicMaterial({
  color: 0x83d6af,
  roughness: 0.8,
});
const face = new THREE.Mesh(faceGeometry, faceMaterial);
face.position.set(0, 0.5, 1);
blob.add(face);
scene.add(blob);


const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / -2;
floor.position.y = -2;
scene.add(floor);

let mouse = new THREE.Vector2();
let direction = new THREE.Vector3();
let moving = false;
let targetPosition = new THREE.Vector3();
let rollSpeed = 0.05;
let distanceToTravel = 0;
let distanceTraveled = 0;

let chatSprites = [];

document.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  moving = true;
});

function createTextSprite(message) {
  const padding = 10;
  const arrowWidth = 10;
  const arrowHeight = 10;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // measure the text width
  const textWidth = context.measureText(message).width;

  // Set the canvas width and height to fit the text and padding
  canvas.width = textWidth + padding * 2;
  canvas.height = 24 + padding * 2 + arrowHeight;

  // Draw the background rectangle
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height - arrowHeight);

  // Draw the arrow
  context.beginPath();
  context.moveTo((canvas.width - arrowWidth) / 2, canvas.height - arrowHeight);
  context.lineTo(canvas.width / 2, canvas.height);
  context.lineTo((canvas.width + arrowWidth) / 2, canvas.height - arrowHeight);
  context.closePath();
  context.fill();

  // Draw the text
  context.fillStyle = 'black';
  context.textBaseline = 'top';
  context.fillText(message, padding, padding);
  
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  
  sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
  
  // Place the sprite above the blob
  sprite.position.set(blob.position.x, blob.position.y + 2, blob.position.z);
  
  chatSprites.push(sprite);
  
  return sprite;
}


function animate() {
  requestAnimationFrame(animate);

  if (moving) {
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    let intersects = raycaster.intersectObject(floor);

    if (intersects.length > 0) {
      targetPosition = intersects[0].point;
      distanceToTravel = blob.position.distanceTo(targetPosition);
      distanceTraveled = 0;
      direction.subVectors(targetPosition, blob.position).normalize();
    }

    let moveDistance = rollSpeed * distanceToTravel;

    blob.position.addScaledVector(direction, moveDistance);
    blob.rotation.x += direction.y * rollSpeed;
    blob.rotation.z += direction.x * rollSpeed;

    distanceTraveled += moveDistance;

    if (distanceTraveled >= distanceToTravel) {
      moving = false;
      blob.position.copy(targetPosition);
    }
  }

  // Update the position of each chat sprite to follow the blob
  for (let sprite of chatSprites) {
    sprite.position.set(blob.position.x, blob.position.y + 2, blob.position.z);
  }

  renderer.render(scene, camera);
}
animate();

const chatForm = document.getElementById('chat-form');
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const message = chatForm.elements.message.value;
  socket.emit('chat_message', message);

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

socket.on('chat_message', (message) => {
  const chatLog = document.getElementById('chat-log');
  const newMessage = document.createElement('div');
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
