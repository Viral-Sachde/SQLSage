"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Domain-warped noise height field, shaded as polished chrome reflecting a studio environment.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_intensity;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}

float height(vec2 p) {
  float t = u_time * 0.08;
  vec2 q = vec2(fbm(vec3(p, t)), fbm(vec3(p + vec2(5.2, 1.3), t)));
  vec2 r = vec2(fbm(vec3(p + 3.0 * q + vec2(1.7, 9.2), t * 1.3)),
                fbm(vec3(p + 3.0 * q + vec2(8.3, 2.8), t * 1.3)));
  float h = fbm(vec3(p + 2.5 * r, t * 0.7));
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0) * 1.6;
  float d = length(p - m);
  h += 0.22 * exp(-d * d * 3.0);
  return h;
}

vec3 env(vec3 r) {
  float y = r.y;
  vec3 floorC = vec3(0.025, 0.027, 0.032);
  vec3 skyC = vec3(0.62, 0.65, 0.70);
  vec3 c = mix(floorC, skyC, smoothstep(-0.35, 0.75, y));
  // softbox strips
  c += vec3(1.0) * exp(-pow((y - 0.42) * 9.0, 2.0)) * 1.1;
  c += vec3(0.85, 0.9, 1.0) * exp(-pow((y + 0.05) * 22.0, 2.0)) * 0.55;
  c += vec3(1.0) * exp(-pow((r.x - 0.55) * 6.0, 2.0)) * smoothstep(0.0, 0.6, y) * 0.6;
  // dark horizon to give contrast
  c *= 1.0 - 0.75 * exp(-pow((y - 0.12) * 14.0, 2.0));
  return c;
}

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y * 1.6;

  float e = 0.004;
  float h = height(p);
  float hx = height(p + vec2(e, 0.0));
  float hy = height(p + vec2(0.0, e));
  vec3 n = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.6));

  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 r = reflect(-v, n);
  vec3 col = env(r);

  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
  vec3 irid = palette(h * 1.6 + fres * 0.8 + u_time * 0.02);
  col = mix(col, col * (0.55 + 0.9 * irid), 0.22 + 0.35 * fres);

  // ambient occlusion from cavities
  col *= mix(0.55, 1.0, smoothstep(0.2, 0.75, h));
  col = pow(col, vec3(0.95));
  col *= u_intensity;

  // fade toward page background at the edges
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.25, 1.6)));
  col = mix(vec3(0.027, 0.03, 0.035), col, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export default function LiquidMetal({ className, intensity = 1, scale = 0.6 }: { className?: string; intensity?: number; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      canvas.dataset.fallback = "true";
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uInt = gl.getUniformLocation(prog, "u_intensity");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0.35, y: 0.1, tx: 0.35, ty: 0.1 };
    let raf = 0;
    let visible = true;
    const start = performance.now() - 20000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uInt, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width - 0.5;
      mouse.ty = 0.5 - (e.clientY - rect.top) / rect.height;
    };

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    ro.observe(canvas);
    resize();

    if (reduced) draw(performance.now());
    else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [intensity, scale]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
