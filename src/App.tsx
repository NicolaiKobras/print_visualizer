import { useState, useEffect, useRef } from "react";
import "./index.css";

// Basic presets for "Screen Size" in inches
const SCREEN_PRESETS = [
  { label: 'MacBook Pro 13"', value: 13.3 },
  { label: 'MacBook Pro 14"', value: 14.2 },
  { label: 'MacBook Pro 15"', value: 15.4 },
  { label: 'MacBook Pro 16"', value: 16.2 },
  { label: 'Desktop 24"', value: 24 },
  { label: 'Desktop 27"', value: 27 },
];

export function App() {
  // --- State ---
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  
  // Print size
  const [printWidthCm, setPrintWidthCm] = useState<number>(30); // default 30cm
  const [printHeightCm, setPrintHeightCm] = useState<number>(0);
  
  // Screen calibration
  const [screenDiagonal, setScreenDiagonal] = useState<number>(13.3); // default to something common using presets logic might affect this
  const [cssPpi, setCssPpi] = useState<number>(0);

  // Visualization
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Image container specific
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Effects & Logic ---

  // 1. Calculate CSS PPI on mount or screen resize
  useEffect(() => {
    const updatePpi = () => {
      // Screen resolution in CSS pixels
      const sw = window.screen.width;
      const sh = window.screen.height;
      const diagonalPixels = Math.sqrt(sw * sw + sh * sh);
      // PPI = Pixels / Inches
      if (screenDiagonal > 0) {
        setCssPpi(diagonalPixels / screenDiagonal);
      }
    };
    updatePpi();
    window.addEventListener('resize', updatePpi);
    return () => window.removeEventListener('resize', updatePpi);
  }, [screenDiagonal]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // 2. Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setImageSrc(url);
        // Set initial height based on aspect ratio
        const ratio = img.naturalHeight / img.naturalWidth;
        setPrintHeightCm(Number((30 * ratio).toFixed(2))); // default 30cm width
        setPrintWidthCm(30);
      };
      img.src = url;
    }
  };

  // 3. Handle Dimension Changes (Aspect Ratio lock)
  const handleWidthChange = (val: number) => {
    setPrintWidthCm(val);
    if (imgNaturalSize) {
      const ratio = imgNaturalSize.h / imgNaturalSize.w;
      setPrintHeightCm(Number((val * ratio).toFixed(2)));
    }
  };

  const handleHeightChange = (val: number) => {
    setPrintHeightCm(val);
    if (imgNaturalSize) {
      const ratio = imgNaturalSize.w / imgNaturalSize.h;
      setPrintWidthCm(Number((val * ratio).toFixed(2)));
    }
  };

  // 4. Calculations for display
  // Pixels Per Inch of the print result
  const printPpi = imgNaturalSize 
    ? Math.round(imgNaturalSize.w / (printWidthCm / 2.54)) 
    : 0;

  // How wide should the image be on screen (in CSS pixels) to match physical print size?
  // printWidthCm * (cssPpi pixels/inch) / (2.54 cm/inch)
  // = printWidthCm * (cssPpi / 2.54)
  const displayWidthPx = cssPpi > 0 
    ? printWidthCm * (cssPpi / 2.54) 
    : 0;
    
  const displayHeightPx = imgNaturalSize && displayWidthPx > 0
    ? displayWidthPx * (imgNaturalSize.h / imgNaturalSize.w)
    : 0;

  // --- Interaction Handlers (Pan) ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-6 flex flex-col gap-8">
      <header className="max-w-4xl mx-auto w-full text-center">
        <h1 className="text-4xl font-bold mb-2 text-blue-400">Actual Print Size Visualizer</h1>
        <p className="text-gray-400">See exactly how big your print will look before you print it.</p>
      </header>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6 bg-gray-800 p-6 rounded-xl shadow-lg h-fit">
          
          {/* Section 1: Upload */}
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">1. Upload Image</h2>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
            {imgNaturalSize && (
              <p className="mt-2 text-xs text-gray-500">
                Original Resolution: {imgNaturalSize.w} x {imgNaturalSize.h} px
              </p>
            )}
          </section>

          {/* Section 2: Screen Calibration */}
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">2. Screen Calibration</h2>
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-400">Select Preset</label>
              <select 
                className="bg-gray-700 border border-gray-600 rounded p-2"
                onChange={(e) => setScreenDiagonal(Number(e.target.value))}
                value={screenDiagonal}
              >
                {SCREEN_PRESETS.map(p => (
                  <option key={p.label} value={p.value}>{p.label}</option>
                ))}
                <option value="0">Custom...</option>
              </select>
              
              <label className="text-sm text-gray-400">Screen Size (Diagonal Inches)</label>
              <input 
                type="number" 
                value={screenDiagonal}
                onChange={(e) => setScreenDiagonal(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded p-2"
                step="0.1"
              />
              <p className="text-xs text-gray-500">
                Detected Resolution (CSS): {window.screen.width} x {window.screen.height}
              </p>
            </div>
          </section>

          {/* Section 3: Print Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">3. Print Size</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Width (cm)</label>
                <input 
                  type="number" 
                  value={printWidthCm}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={printHeightCm}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                />
              </div>
            </div>
            {imgNaturalSize && (
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded">
                <p className="font-bold text-blue-300">Print Quality: {printPpi} PPI</p>
                <p className="text-xs text-blue-200/70 mt-1">
                  {printPpi > 300 ? "Excellent quality" : printPpi > 150 ? "Good quality" : "Low quality (might look pixelated)"}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Visualizer Area */}
        <div className="lg:col-span-8 bg-gray-950 rounded-xl overflow-hidden shadow-2xl relative flex flex-col h-[600px] border border-gray-800">
          {!imageSrc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <span className="text-6xl mb-4">🖼️</span>
              <p className="text-lg">Upload an image to start visualizing</p>
            </div>
          ) : (
            <>
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button
                  onClick={toggleFullscreen}
                  className="bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-mono border border-white/10 hover:bg-black/90 transition-colors cursor-pointer"
                 >
                   {isFullscreen ? "Exit Fullscreen" : "Fullscreen ⛶"}
                 </button>
                 <div className="bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-mono border border-white/10">
                  1:1 Physically Accurate Scale
                </div>
              </div>
              
              {/* Interactive Viewport */}
              <div 
                ref={containerRef}
                className="flex-1 w-full h-full relative cursor-move overflow-hidden bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
              >
                 <div
                    style={{
                      width: `${displayWidthPx}px`,
                      height: `${displayHeightPx}px`,
                      transform: `translate(${pan.x}px, ${pan.y}px)`,
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat'
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                 >
                   {/* Guide Rulers (Optional visual aid) */}
                   <div className="absolute -top-6 left-0 w-full text-center text-xs text-gray-500 border-b border-gray-500/50">
                      {printWidthCm} cm
                   </div>
                   <div className="absolute top-1/2 -left-8 -translate-y-1/2 h-full flex items-center text-xs text-gray-500 border-r border-gray-500/50 pr-2">
                     <span className="-rotate-90 whitespace-nowrap">{printHeightCm} cm</span>
                   </div>
                 </div>
              </div>

               <div className="bg-gray-900 border-t border-gray-800 p-2 text-center text-xs text-gray-500">
                  Drag to inspect different parts of the print
               </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
