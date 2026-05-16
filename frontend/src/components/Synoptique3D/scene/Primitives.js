import * as THREE from 'three';

export const mkMat = (color, options = {}) => new THREE.MeshLambertMaterial({
    color,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
});

export const mkPipe = (x1, y1, z1, x2, y2, z2, color = 0x4d7890, radius = 0.06) => {
    const start = new THREE.Vector3(x1, y1, z1);
    const end = new THREE.Vector3(x2, y2, z2);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 12);
    const mesh = new THREE.Mesh(geometry, mkMat(color));
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
};

export const addBox = (group, size, position, color, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mkMat(color, options));
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
};

export const addCylinder = (group, radiusTop, radiusBottom, height, position, color, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 24), mkMat(color, options));
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
};

export const addSphere = (group, radius, position, color, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, options.width ?? 24, options.height ?? 16), mkMat(color, options));
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(options.sx ?? 1, options.sy ?? 1, options.sz ?? 1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
};
