import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * CanvasRenderer Component
 * 
 * Renders streaming frames using HTML5 Canvas with double-buffering
 * for smooth, flicker-free updates.
 */
const CanvasRenderer = ({ 
  width = 800, 
  height = 600, 
  sessionId, 
  screenshot,
  frameNumber,
  onFrameReceived,
  onError,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [nextImage, setNextImage] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);

  // Performance tracking
  const frameTimes = useRef([]);
  const maxFrameTimes = 60; // Track last 60 frames for FPS calculation

  const isRenderingRef = useRef(false);

  /**
   * Render frame to canvas
   * @param {Object} frameData - Frame data with base64 image
   */
  const renderFrame = useCallback(async (frameData) => {
    try {
      if (!canvasRef.current) {
        throw new Error('Canvas not available');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            renderImageToCanvas(ctx, img, canvas.width, canvas.height);
            setIsRendering(true);
            requestAnimationFrame(() => {
              setIsRendering(false);
            });
            URL.revokeObjectURL(img.src);
            resolve();
          } catch (error) {
            URL.revokeObjectURL(img.src);
            reject(error);
          }
        };
        img.onerror = (error) => {
          URL.revokeObjectURL(img.src);
          reject(new Error(`Failed to load image: ${error.message}`));
        };
        const blob = base64ToBlob(frameData, 'image/jpeg');
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      setError(error.message);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [onFrameReceived, onError]);

  /**
   * Render image to canvas with proper scaling
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {HTMLImageElement} img - Image to render
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   */
  const renderImageToCanvas = (ctx, img, canvasWidth, canvasHeight) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate scaling to maintain aspect ratio
    const scale = Math.min(
      canvasWidth / img.width,
      canvasHeight / img.height
    );

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center the image
    const x = (canvasWidth - scaledWidth) / 2;
    const y = (canvasHeight - scaledHeight) / 2;

    // Draw image with high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      img,
      x, y,
      scaledWidth,
      scaledHeight
    );
  };

  /**
   * Convert base64 string to Blob
   * @param {string} base64 - Base64 encoded data
   * @param {string} mimeType - MIME type
   * @returns {Blob} Blob object
   */
  const base64ToBlob = (base64, mimeType) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      throw new Error(`Failed to convert base64 to blob: ${error.message}`);
    }
  };

  /**
   * Clear canvas
   */
  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  /**
   * Reset renderer state
   */
  const reset = useCallback(() => {
    setFrameCount(0);
    setLastFrameTime(0);
    setFps(0);
    setError(null);
    setCurrentImage(null);
    setNextImage(null);
    setIsRendering(false);
    frameTimes.current = [];
    clearCanvas();
  }, [clearCanvas]);

  /**
   * Get renderer statistics
   */
  const getStats = useCallback(() => {
    return {
      frameCount,
      fps,
      isRendering,
      error,
      sessionId
    };
  }, [frameCount, fps, isRendering, error, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any blob URLs
      if (currentImage) {
        URL.revokeObjectURL(currentImage.src);
      }
      if (nextImage) {
        URL.revokeObjectURL(nextImage.src);
      }
    };
  }, [currentImage, nextImage]);

  // Expose methods via ref
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.renderFrame = renderFrame;
      canvasRef.current.clearCanvas = clearCanvas;
      canvasRef.current.reset = reset;
      canvasRef.current.getStats = getStats;
    }
  }, [renderFrame, clearCanvas, reset, getStats]);

  // Automatisches Rendern bei neuem Frame
  useEffect(() => {
    if (screenshot && !isRenderingRef.current) {
      isRenderingRef.current = true;
      setError(null);
      renderFrame(screenshot)
        .catch((err) => {
          setError(err.message);
          if (onError) onError(err);
        })
        .finally(() => {
          isRenderingRef.current = false;
        });
    }
    // eslint-disable-next-line
  }, [screenshot, frameNumber]);

  return (
    <div className={`canvas-renderer ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#f5f5f5'
        }}
      />
      
      {/* Performance overlay */}
      <div className="canvas-stats" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div>FPS: {fps}</div>
        <div>Frames: {frameCount}</div>
        {error && <div style={{ color: '#ff6b6b' }}>Error: {error}</div>}
      </div>

      {/* Loading indicator */}
      {isRendering && (
        <div className="rendering-indicator" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          Rendering...
        </div>
      )}
    </div>
  );
};

export default CanvasRenderer; 