import { useEffect, useRef } from 'react';

export const GradientWave = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
      
      ctx.fillStyle = gradient;
      
      // Draw wave
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      const waveHeight = 50;
      const waveLength = 0.01;
      
      for (let x = 0; x < canvas.width; x++) {
        const y = Math.sin(x * waveLength + time) * waveHeight + 
                 Math.sin(x * waveLength * 0.5 + time * 0.8) * waveHeight * 0.5 + 
                 canvas.height * 0.7;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
      
      time += 0.02;
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

export default GradientWave;
