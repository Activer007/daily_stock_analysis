import { useEffect, useRef } from 'react';

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseAlpha: number;

      constructor(cvs: HTMLCanvasElement) {
        this.x = Math.random() * cvs.width;
        this.y = Math.random() * cvs.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2.0 + 1.0;
        this.baseAlpha = Math.random() * 0.6 + 0.2;
        
        const colors = ['14, 165, 233', '16, 185, 129', '59, 130, 246', '139, 92, 246'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(cvs: HTMLCanvasElement) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > cvs.width) this.vx *= -1;
        if (this.y < 0 || this.y > cvs.height) this.vy *= -1;
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(${this.color}, ${this.baseAlpha})`;
        c.fill();
      }
    }

    const initParticles = () => {
      if (!canvas) return;
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 10000); 
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(canvas));
      }
    };

    const drawLines = (c: CanvasRenderingContext2D) => {
      for (let i = 0; i < particles.length; i++) {
        const dxMouse = particles[i].x - mouse.x;
        const dyMouse = particles[i].y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distMouse < 250) {
          c.beginPath();
          const opacity = 0.8 * (1 - distMouse / 250);
          c.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
          c.lineWidth = 2.0;
          c.moveTo(particles[i].x, particles[i].y);
          c.lineTo(mouse.x, mouse.y);
          c.stroke();
          
          const force = (250 - distMouse) / 250;
          particles[i].x += (dxMouse / distMouse) * force * 2.0;
          particles[i].y += (dyMouse / distMouse) * force * 2.0;
        }

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            c.beginPath();
            const opacity = 0.3 * (1 - dist / 150);
            c.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            c.lineWidth = 0.8;
            c.moveTo(particles[i].x, particles[i].y);
            c.lineTo(particles[j].x, particles[j].y);
            c.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update(canvas);
        p.draw(ctx);
      });
      drawLines(ctx);

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => resize();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};
