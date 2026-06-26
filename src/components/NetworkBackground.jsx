import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function NetworkBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Palette specifications from user prompt
    const dotColor = 0x000000;  // Deep Black
    const lineColor = 0xdadadb; // Surface Dim gray

    const particlesCount = 100;
    const positions = new Float32Array(particlesCount * 3);
    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: dotColor,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: lineColor, 
      transparent: true, 
      opacity: 0.3 
    });

    const lineGeometry = new THREE.BufferGeometry();
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    camera.position.z = 5;

    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      points.rotation.y += 0.001;
      points.rotation.x += 0.0005;
      
      const linePositions = [];
      const p = points.geometry.attributes.position.array;
      
      for (let i = 0; i < particlesCount; i++) {
        for (let j = i + 1; j < particlesCount; j++) {
          const dx = p[i*3] - p[j*3];
          const dy = p[i*3+1] - p[j*3+1];
          const dz = p[i*3+2] - p[j*3+2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist < 2) {
            linePositions.push(p[i*3], p[i*3+1], p[i*3+2]);
            linePositions.push(p[j*3], p[j*3+1], p[j*3+2]);
          }
        }
      }
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      
      // Keep lines synchronized with the rotating points
      lineSegments.rotation.y = points.rotation.y;
      lineSegments.rotation.x = points.rotation.x;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[-1] overflow-hidden opacity-30 pointer-events-none" 
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
