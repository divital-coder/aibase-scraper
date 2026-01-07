import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js'

export default function HeadShader() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45 * 0.4, width / height, 1, 1000)
    camera.position.set(-3, -5, 8).setLength(21)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.5
    controls.minDistance = controls.getDistance()
    controls.maxDistance = controls.getDistance()

    // Create matcap textures
    const createBlackMatcap = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas')
      c.width = 1024
      c.height = 1024
      const ctx = c.getContext('2d')!

      const unit = (val: number) => val * c.height * 0.01

      ctx.fillStyle = '#222222'
      ctx.fillRect(0, 0, c.width, c.height)

      ctx.lineCap = 'round'
      ctx.strokeStyle = '#ddd'
      ctx.filter = `blur(${unit(0.5)}px)`

      const rows = 8
      const cols = 4
      const colFactor = 0.75
      const colAngle = Math.PI / cols
      const colAngleHalf = colAngle * 0.5

      for (let row = 0; row < rows; row++) {
        ctx.lineWidth = unit(10 - row) * 0.25
        const r = 47 - row * 5
        for (let col = 0; col < cols; col++) {
          ctx.beginPath()
          const centralAngle = -colAngleHalf - colAngle * col
          ctx.arc(
            unit(50),
            unit(50),
            unit(r),
            centralAngle - colAngleHalf * colFactor,
            centralAngle + colAngleHalf * colFactor
          )
          ctx.stroke()
        }
      }

      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(unit(50), unit(50))
      ctx.arc(unit(50), unit(50), unit(50), Math.PI * 0.25, Math.PI * 0.75)
      ctx.fill()

      const tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.center.setScalar(0.5)
      return tex
    }

    const createNeonMatcap = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas')
      c.width = 1024
      c.height = 1024
      const ctx = c.getContext('2d')!

      const grd = ctx.createLinearGradient(0, 0, 0, c.height)
      grd.addColorStop(0.25, '#ff00ff')
      grd.addColorStop(0.5, '#ff88ff')
      grd.addColorStop(0.75, '#0044ff')
      grd.addColorStop(1, '#ffff00')

      ctx.fillStyle = grd
      ctx.fillRect(0, 0, c.width, c.height)

      const tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.center.setScalar(0.5)
      return tex
    }

    const presets = {
      transitionLevel: { value: 0.5 },
      black: { value: createBlackMatcap() },
      neon: { value: createNeonMatcap() }
    }

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      'https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb',
      (gltf) => {
        const model = gltf.scene.children[0] as THREE.Mesh
        model.position.y = -0.75

        const material = new THREE.MeshMatcapMaterial({
          matcap: presets.black.value
        })

        material.onBeforeCompile = (shader) => {
          shader.uniforms.transitionLevel = presets.transitionLevel
          shader.uniforms.matcap2 = presets.neon

          shader.vertexShader = `
            varying vec4 vClipPos;
            ${shader.vertexShader}
          `.replace(
            `vViewPosition = - mvPosition.xyz;`,
            `vViewPosition = - mvPosition.xyz;
              vClipPos = gl_Position;
            `
          )

          shader.fragmentShader = `
            uniform float transitionLevel;
            uniform sampler2D matcap2;
            varying vec4 vClipPos;
            ${shader.fragmentShader}
          `.replace(
            `vec4 matcapColor = texture2D( matcap, uv );`,
            `
            vec4 mc1 = texture( matcap, uv );
            vec4 mc2 = texture( matcap2, uv );

            vec2 clipUV = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;

            vec4 matcapColor = mix(mc1, mc2, smoothstep(transitionLevel-0.1, transitionLevel+0.1, clipUV.y));
            `
          )
        }

        model.material = material
        scene.add(model)
      }
    )

    // Animation
    const simplex = new SimplexNoise()
    const clock = new THREE.Clock()
    let t = 0

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const dt = clock.getDelta()
      t += dt

      const n = simplex.noise(t * 0.25, Math.PI) * 0.5 + 0.5
      presets.transitionLevel.value = n

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
        container.removeChild(rendererRef.current.domElement)
      }
      controls.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
