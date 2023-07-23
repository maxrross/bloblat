const socket = io('http://localhost:4001');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
const blob = new THREE.Mesh(geometry, material);
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

document.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  moving = true;
});

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

  renderer.render(scene, camera);
}
animate();

const chatForm = document.getElementById('chat-form');
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const message = chatForm.elements.message.value;
  socket.emit('chat_message', message);
});

socket.on('chat_message', (message) => {
  const chatLog = document.getElementById('chat-log');
  const newMessage = document.createElement('div');
  newMessage.textContent = message;
  chatLog.appendChild(newMessage);
});
