import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface EditorPageProps { onBack: () => void; }

type Tool = 'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'line' | 'text' | 'fill' | 'eyedropper' | 'crop';

interface Stroke {
  tool: Tool;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
  hardness: number;
  startX?: number; startY?: number; endX?: number; endY?: number;
  text?: string;
  imageUrl?: string;
  imgWidth?: number;
  imgHeight?: number;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: Stroke[];
  redoStack: Stroke[];
}

export function EditorPage({ onBack }: EditorPageProps) {
  const { user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tools & Brushes
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushHardness, setBrushHardness] = useState(100);
  
  // Canvas State
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, visible: boolean, value: string } | null>(null);

  // Layers System
  const [layers, setLayers] = useState<Layer[]>([{ 
    id: 'layer-bg', name: 'Background', visible: true, opacity: 100, strokes: [], redoStack: [] 
  }]);
  const [activeLayerId, setActiveLayerId] = useState('layer-bg');
  const draftStrokeRef = useRef<Stroke | null>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Crop State
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isCropSelecting, setIsCropSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  // Resize State
  const [rightPanelWidth, setRightPanelWidth] = useState(256);
  const isResizingRef = useRef(false);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 200 && newWidth < 500) setRightPanelWidth(newWidth);
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleResize]);

  const startResizing = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResizing);
  };

  // Filters State
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });

  // Dialogs
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(92);
  const [newCanvasSize, setNewCanvasSize] = useState({ w: 1200, h: 800 });

  // Utility: Hex to RGBA
  const hexToRgba = (hex: string, alpha: number = 255) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return { r, g, b, a: alpha };
  };

  const addStrokeToActiveLayer = useCallback((stroke: Stroke) => {
    setLayers(prev => prev.map(l => 
      l.id === activeLayerId ? { ...l, strokes: [...l.strokes, stroke], redoStack: [] } : l
    ));
  }, [activeLayerId]);

  const drawStroke = (s: Stroke, ctx: CanvasRenderingContext2D) => {
    ctx.globalAlpha = s.opacity / 100;
    
    if (s.tool === 'fill' && s.imageUrl) {
        const img = imageCache.current[s.imageUrl];
        if (img) {
            ctx.drawImage(img, 0, 0);
        } else {
            const newImg = new Image();
            newImg.src = s.imageUrl;
            newImg.onload = () => {
                imageCache.current[s.imageUrl!] = newImg;
                redrawCanvas();
            };
        }
        ctx.globalAlpha = 1.0;
        return;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.tool === 'pen' || s.tool === 'eraser') {
        if (s.hardness < 100) {
            ctx.shadowBlur = (100 - s.hardness) / 3;
            ctx.shadowColor = s.tool === 'eraser' ? '#ffffff' : s.color;
        } else {
            ctx.shadowBlur = 0;
        }
    } else {
        ctx.shadowBlur = 0;
    }

    if (s.tool === 'pen') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.globalCompositeOperation = 'source-over';
        if (s.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
    } else if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = s.size;
        if (s.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    } else if (s.tool === 'rect' && s.startX != null && s.endX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeRect(s.startX, s.startY!, s.endX - s.startX, s.endY! - s.startY!);
    } else if (s.tool === 'circle' && s.startX != null && s.endX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.globalCompositeOperation = 'source-over';
        const rx = Math.abs(s.endX - s.startX) / 2;
        const ry = Math.abs(s.endY! - s.startY!) / 2;
        const cx = s.startX + (s.endX - s.startX) / 2;
        const cy = s.startY! + (s.endY! - s.startY!) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (s.tool === 'line' && s.startX != null && s.endX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(s.startX, s.startY!);
        ctx.lineTo(s.endX, s.endY!);
        ctx.stroke();
    } else if (s.tool === 'text' && s.text && s.startX != null) {
        ctx.fillStyle = s.color;
        ctx.font = `${s.size * 5}px 'Plus Jakarta Sans', sans-serif`;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillText(s.text, s.startX, s.startY!);
    }
    
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  };

  const redrawRef = useRef<number | null>(null);

  const redrawCanvas = useCallback(() => {
    if (redrawRef.current) cancelAnimationFrame(redrawRef.current);
    redrawRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Checkerboard / Transparent Background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      layers.forEach(layer => {
        if (!layer.visible) return;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        // Draw all strokes of this layer
        layer.strokes.forEach(s => drawStroke(s, offCtx));

        ctx.globalAlpha = layer.opacity / 100;
        ctx.drawImage(offCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
      });

      updateNavigator();
      redrawRef.current = null;
    });
  }, [layers]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const updateNavigator = () => {
    const nav = navCanvasRef.current;
    const main = canvasRef.current;
    if (!nav || !main) return;
    const nctx = nav.getContext('2d');
    if (!nctx) return;
    nctx.clearRect(0, 0, nav.width, nav.height);
    nctx.drawImage(main, 0, 0, nav.width, nav.height);
  };

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const doFloodFill = (x: number, y: number, fillColor: string, tolerance = 32) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // We must read from the main canvas to sample all layers
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const startPos = (y * w + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    const targetColor = hexToRgba(fillColor);
    
    // Ignore if clicking on same color
    if (Math.abs(startR - targetColor.r) < tolerance && 
        Math.abs(startG - targetColor.g) < tolerance && 
        Math.abs(startB - targetColor.b) < tolerance) return;

    const fillImageData = new ImageData(w, h);
    const fillData = fillImageData.data;

    const pixelStack = [[x, y]];
    const matchStartColor = (pos: number) => {
      return (Math.abs(data[pos] - startR) <= tolerance && 
              Math.abs(data[pos+1] - startG) <= tolerance && 
              Math.abs(data[pos+2] - startB) <= tolerance && 
              Math.abs(data[pos+3] - startA) <= tolerance);
    };

    const colorPixel = (pos: number) => {
      fillData[pos] = targetColor.r;
      fillData[pos+1] = targetColor.g;
      fillData[pos+2] = targetColor.b;
      fillData[pos+3] = targetColor.a;
      
      // Mark visited in main array
      data[pos] = targetColor.r;
      data[pos+1] = targetColor.g;
      data[pos+2] = targetColor.b;
      data[pos+3] = 255;
    };

    while (pixelStack.length) {
      const newPos = pixelStack.pop()!;
      const currX = newPos[0];
      let currY = newPos[1];
      
      let pixelPos = (currY * w + currX) * 4;
      while (currY-- >= 0 && matchStartColor(pixelPos)) {
        pixelPos -= w * 4;
      }
      pixelPos += w * 4;
      ++currY;
      
      let reachLeft = false;
      let reachRight = false;
      
      while (currY++ < h - 1 && matchStartColor(pixelPos)) {
        colorPixel(pixelPos);
        
        if (currX > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([currX - 1, currY]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }
        
        if (currX < w - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([currX + 1, currY]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }
        
        pixelPos += w * 4;
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx?.putImageData(fillImageData, 0, 0);
    
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      addStrokeToActiveLayer({
          tool: 'fill',
          points: [],
          color: fillColor,
          size: 1,
          opacity: brushOpacity,
          hardness: brushHardness,
          imageUrl: dataUrl
      });
    }, 'image/png');
  };

  const doEyedropper = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = ctx.getImageData(x, y, 1, 1).data; 
    const hex = "#" + ("000000" + ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16)).slice(-6);
    setColor(hex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    setCursorPos(pos);

    if (tool === 'eyedropper') {
        doEyedropper(pos.x, pos.y);
        return;
    }

    if (tool === 'fill') {
        doFloodFill(pos.x, pos.y, color);
        return;
    }

    if (textInput && textInput.visible) {
        commitTextStroke();
    }

    if (tool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, visible: true, value: '' });
      return;
    }

    setIsDrawing(true);

    let newStroke: Stroke;
    if (tool === 'pen' || tool === 'eraser' || tool === 'select') {
      newStroke = { tool, points: [pos], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness };
    } else {
      setShapeStart(pos);
      newStroke = { tool, points: [], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y };
    }
    
    draftStrokeRef.current = newStroke;
    const dCtx = draftCanvasRef.current?.getContext('2d');
    if (dCtx) {
        dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        drawStroke(newStroke, dCtx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    setCursorPos(pos);
    if (!isDrawing || !draftStrokeRef.current) return;

    if (tool === 'pen' || tool === 'eraser' || tool === 'select') {
      draftStrokeRef.current.points.push(pos);
    } else if (shapeStart) {
      draftStrokeRef.current.endX = pos.x;
      draftStrokeRef.current.endY = pos.y;
    }
    
    const dCtx = draftCanvasRef.current?.getContext('2d');
    if (dCtx) {
        dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        drawStroke(draftStrokeRef.current, dCtx);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !draftStrokeRef.current) { setIsDrawing(false); return; }
    addStrokeToActiveLayer(draftStrokeRef.current);
    draftStrokeRef.current = null;
    setShapeStart(null);
    setIsDrawing(false);
    
    const dCtx = draftCanvasRef.current?.getContext('2d');
    if (dCtx) dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
  };

  const commitTextStroke = () => {
      if (textInput && textInput.value.trim() !== '') {
          addStrokeToActiveLayer({ tool: 'text', points: [], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness, startX: textInput.x, startY: textInput.y, text: textInput.value });
      }
      setTextInput(null);
  };

  const undo = () => {
    setLayers(prev => prev.map(l => {
        if (l.id === activeLayerId) {
            if (l.strokes.length === 0) return l;
            const last = l.strokes[l.strokes.length - 1];
            return { ...l, strokes: l.strokes.slice(0, -1), redoStack: [...l.redoStack, last] };
        }
        return l;
    }));
  };

  const redo = () => {
    setLayers(prev => prev.map(l => {
        if (l.id === activeLayerId) {
            if (l.redoStack.length === 0) return l;
            const last = l.redoStack[l.redoStack.length - 1];
            return { ...l, redoStack: l.redoStack.slice(0, -1), strokes: [...l.strokes, last] };
        }
        return l;
    }));
  };

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    setLayers(prev => [...prev, { id: newId, name: `Katman ${prev.length + 1}`, visible: true, opacity: 100, strokes: [], redoStack: [] }]);
    setActiveLayerId(newId);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return; // Must have at least 1 layer
    setLayers(prev => {
        const filtered = prev.filter(l => l.id !== id);
        if (activeLayerId === id) setActiveLayerId(filtered[filtered.length - 1].id);
        return filtered;
    });
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };

  const moveLayerUp = (id: string) => {
    setLayers(prev => {
        const idx = prev.findIndex(l => l.id === id);
        if (idx >= prev.length - 1 || idx === -1) return prev;
        const newLayers = [...prev];
        [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
        return newLayers;
    });
  };

  const moveLayerDown = (id: string) => {
    setLayers(prev => {
        const idx = prev.findIndex(l => l.id === id);
        if (idx <= 0 || idx === -1) return prev;
        const newLayers = [...prev];
        [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
        return newLayers;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'b' || e.key === 'B') setTool('pen');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
      if (e.key === 'r' || e.key === 'R') setTool('rect');
      if (e.key === 'l' || e.key === 'L') setTool('line');
      if (e.key === 't' || e.key === 'T') setTool('text');
      if (e.key === 'i' || e.key === 'I') setTool('eyedropper');
      if (e.key === 'f' || e.key === 'F') setTool('fill');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [layers, activeLayerId]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom(z => Math.min(Math.max(z + delta, 10), 500));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const zoomIn = () => setZoom(z => Math.min(z + 10, 500));
  const zoomOut = () => setZoom(z => Math.max(z - 10, 10));

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'mireditor-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ─── IMAGE IMPORT ───
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imageCache.current[dataUrl] = img;
      addStrokeToActiveLayer({
        tool: 'fill', points: [], color: '#000', size: 1,
        opacity: 100, hardness: 100, imageUrl: dataUrl,
        imgWidth: img.width, imgHeight: img.height
      });
    };
    img.src = dataUrl;
    e.target.value = '';
  };

  // ─── CROP ───
  const applyCrop = () => {
    if (!cropRect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, w, h } = cropRect;
    const cX = Math.max(0, Math.round(x));
    const cY = Math.max(0, Math.round(y));
    const cW = Math.min(Math.round(w), canvas.width - cX);
    const cH = Math.min(Math.round(h), canvas.height - cY);
    if (cW <= 0 || cH <= 0) { setCropRect(null); return; }

    // Flatten current canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(cX, cY, cW, cH);
    const temp = document.createElement('canvas');
    temp.width = cW; temp.height = cH;
    temp.getContext('2d')?.putImageData(imgData, 0, 0);
    
    temp.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-crop-${Date.now()}`;
      setCanvasSize({ w: cW, h: cH });
      setLayers([{ id: newId, name: 'Cropped', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
      setCropRect(null);
    }, 'image/png');
  };

  const cancelCrop = () => { setCropRect(null); };

  // ─── ROTATE ───
  const rotateCanvas = (deg: 90 | -90) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const temp = document.createElement('canvas');
    temp.width = canvas.height; temp.height = canvas.width;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;
    tCtx.save();
    if (deg === 90) { tCtx.translate(temp.width, 0); tCtx.rotate(Math.PI / 2); }
    else { tCtx.translate(0, temp.height); tCtx.rotate(-Math.PI / 2); }
    tCtx.drawImage(canvas, 0, 0);
    tCtx.restore();
    
    temp.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-rot-${Date.now()}`;
      setCanvasSize({ w: temp.width, h: temp.height });
      setLayers([{ id: newId, name: 'Rotated', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
    }, 'image/png');
  };

  // ─── FLIP ───
  const flipCanvas = (dir: 'h' | 'v') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const temp = document.createElement('canvas');
    temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;
    tCtx.save();
    if (dir === 'h') { tCtx.translate(canvas.width, 0); tCtx.scale(-1, 1); }
    else { tCtx.translate(0, canvas.height); tCtx.scale(1, -1); }
    tCtx.drawImage(canvas, 0, 0);
    tCtx.restore();
    
    temp.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-flip-${Date.now()}`;
      setLayers([{ id: newId, name: dir === 'h' ? 'Flipped H' : 'Flipped V', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
    }, 'image/png');
  };

  // ─── FILTERS ───
  const filterString = (() => {
    const p: string[] = [];
    if (filters.brightness !== 100) p.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== 100) p.push(`contrast(${filters.contrast}%)`);
    if (filters.saturation !== 100) p.push(`saturate(${filters.saturation}%)`);
    if (filters.blur > 0) p.push(`blur(${filters.blur}px)`);
    return p.length > 0 ? p.join(' ') : 'none';
  })();

  const bakeFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const temp = document.createElement('canvas');
    temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;
    tCtx.filter = filterString;
    tCtx.drawImage(canvas, 0, 0);
    
    temp.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-filtered-${Date.now()}`;
      setLayers([{ id: newId, name: 'Filtered', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
      setFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });
    }, 'image/png');
  };

  const resetFilters = () => setFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });

  // ─── CANVAS RESIZE ───
  const doResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const temp = document.createElement('canvas');
    temp.width = newCanvasSize.w; temp.height = newCanvasSize.h;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;
    tCtx.drawImage(canvas, 0, 0);
    
    temp.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-resized-${Date.now()}`;
      setCanvasSize({ w: newCanvasSize.w, h: newCanvasSize.h });
      setLayers([{ id: newId, name: 'Resized', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
      setShowResizeDialog(false);
    }, 'image/png');
  };

  // ─── ADVANCED EXPORT ───
  const doExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = exportFormat === 'png' ? 'image/png' : exportFormat === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const link = document.createElement('a');
    link.download = `mireditor-export.${exportFormat}`;
    link.href = canvas.toDataURL(mime, exportQuality / 100);
    link.click();
    setShowExportDialog(false);
  };

  // Canvas presets
  const CANVAS_PRESETS = [
    { name: 'Instagram Post', w: 1080, h: 1080 },
    { name: 'Instagram Story', w: 1080, h: 1920 },
    { name: 'Full HD', w: 1920, h: 1080 },
    { name: 'Twitter Post', w: 1200, h: 675 },
    { name: '4K', w: 3840, h: 2160 },
    { name: 'A4 (300dpi)', w: 2480, h: 3508 },
  ];

  const toolConfig: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'pen', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>, label: 'Kalem', shortcut: 'B' },
    { id: 'eraser', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path><path d="M22 21H7"></path><path d="m5 11 9 9"></path></svg>, label: 'Silgi', shortcut: 'E' },
    { id: 'line', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line></svg>, label: 'Çizgi', shortcut: 'L' },
    { id: 'rect', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>, label: 'Dikdörtgen', shortcut: 'R' },
    { id: 'circle', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>, label: 'Daire', shortcut: '' },
    { id: 'text', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>, label: 'Metin', shortcut: 'T' },
    { id: 'fill', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"></path><path d="m5 2 5 5"></path><path d="M2 13h15"></path><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"></path></svg>, label: 'Doldur', shortcut: 'F' },
    { id: 'eyedropper', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9"></path><path d="M3 21v-3l9-9"></path><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"></path></svg>, label: 'Damlalık', shortcut: 'I' },
    { id: 'crop', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>, label: 'Kırpma', shortcut: 'C' },
  ];

  const presetColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#888888', '#ff4488'];

  const activeLayer = layers.find(l => l.id === activeLayerId);

  return (
    <div className="w-full h-full flex bg-[#090909] select-none font-sans text-white">
      {/* LEFT TOOLBAR */}
      <div className="w-14 bg-[#111] border-r border-[#1a1a1a] flex flex-col items-center py-3 gap-0.5 flex-shrink-0 z-10">
        {toolConfig.map(t => (
          <div key={t.id} className="relative group">
            <button
              onClick={() => setTool(t.id)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all duration-150 ${tool === t.id
                  ? 'bg-[#2a2a2a] text-[#4ea8de] shadow-inner border border-[#333]'
                  : 'text-[#666] hover:bg-[#1a1a1a] hover:text-[#aaa]'
                }`}
            >
              {t.icon}
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#222] text-white text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity shadow-lg border border-[#333] flex items-center gap-2">
              <span>{t.label}</span>
              {t.shortcut && <span className="bg-[#111] text-[#888] rounded px-1.5 py-0.5 text-[10px] font-mono border border-[#333]">{t.shortcut}</span>}
            </div>
          </div>
        ))}

        <div className="w-8 h-px bg-[#222] my-2" />

        <button onClick={undo} title="Geri Al (Ctrl+Z)" className="w-10 h-10 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#1a1a1a] hover:text-[#aaa] transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg></button>
        <button onClick={redo} title="Yinele (Ctrl+Y)" className="w-10 h-10 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#1a1a1a] hover:text-[#aaa] transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg></button>

        <div className="flex-1" />

        <button onClick={exportCanvas} title="PNG Olarak Kaydet" className="w-10 h-10 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#1a1a1a] hover:text-[#aaa] transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Bar - Properties */}
        <div className="h-10 bg-[#161616] border-b border-[#222] flex items-center px-4 gap-6 flex-shrink-0 z-10">
          {/* Tool specific settings */}
          <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                  <span className="text-[#888]">Boyut:</span>
                  <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24 accent-[#4ea8de]" />
                  <span className="w-6 text-right">{brushSize}</span>
              </div>
              
              <div className="w-px h-4 bg-[#333]" />
              
              <div className="flex items-center gap-2">
                  <span className="text-[#888]">Opaklık:</span>
                  <input type="range" min="1" max="100" value={brushOpacity} onChange={e => setBrushOpacity(Number(e.target.value))} className="w-24 accent-[#4ea8de]" />
                  <span className="w-8 text-right">{brushOpacity}%</span>
              </div>

              {(tool === 'pen' || tool === 'eraser') && (
                  <>
                      <div className="w-px h-4 bg-[#333]" />
                      <div className="flex items-center gap-2">
                          <span className="text-[#888]">Sertlik:</span>
                          <input type="range" min="0" max="100" value={brushHardness} onChange={e => setBrushHardness(Number(e.target.value))} className="w-24 accent-[#4ea8de]" />
                          <span className="w-8 text-right">{brushHardness}%</span>
                      </div>
                  </>
              )}
          </div>

          <div className="flex-1" />
          
          <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-md px-2 py-1 border border-[#222]">
            <button onClick={zoomOut} className="text-[#888] hover:text-white px-1">−</button>
            <span className="text-[#aaa] text-[10px] w-10 text-center font-mono">{zoom}%</span>
            <button onClick={zoomIn} className="text-[#888] hover:text-white px-1">+</button>
          </div>
        </div>

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center bg-[#1e1e1e] p-8"
          style={{ 
            cursor: tool === 'eyedropper' ? 'crosshair' : 
                    tool === 'fill' ? 'cell' : 
                    tool === 'text' ? 'text' : 'crosshair' 
          }}
        >
          {/* Main Canvas background styling - Photoshop style transparent checkerboard */}
          <div className="shadow-2xl relative" style={{
               width: `${canvasSize.w * (zoom / 100)}px`,
               height: `${canvasSize.h * (zoom / 100)}px`,
               backgroundImage: 'conic-gradient(#333 90deg, #222 90deg 180deg, #333 180deg 270deg, #222 270deg)',
               backgroundSize: '20px 20px',
               boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ imageRendering: zoom > 200 ? 'pixelated' : 'auto' }}
            />
            {/* Draft Canvas to handle real-time drawing smoothly */}
            <canvas
              ref={draftCanvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute top-0 left-0 w-full h-full"
              style={{ imageRendering: zoom > 200 ? 'pixelated' : 'auto' }}
            />
            {/* Inline Text Input */}
            {textInput && textInput.visible && (
                <input
                    type="text"
                    autoFocus
                    value={textInput.value}
                    onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') commitTextStroke(); }}
                    onBlur={commitTextStroke}
                    className="absolute bg-transparent outline-none whitespace-pre"
                    style={{
                        left: `${textInput.x * (zoom / 100)}px`,
                        top: `${(textInput.y - (brushSize * 5)) * (zoom / 100)}px`,
                        color: color,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: `${brushSize * 5 * (zoom / 100)}px`,
                        lineHeight: 1
                    }}
                />
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANELS */}
      <div 
        className="bg-[#111] border-l border-[#1a1a1a] flex flex-col flex-shrink-0 z-10 relative"
        style={{ width: rightPanelWidth }}
      >
        <div 
          onMouseDown={startResizing}
          className="absolute left-0 top-0 bottom-0 w-1.5 hover:bg-[#4ea8de] bg-transparent cursor-col-resize z-20 transition-colors"
          style={{ transform: 'translateX(-50%)' }}
        />
        
        {/* Navigator & Color (Combined like PS) */}
        <div className="border-b border-[#222] p-4">
          <h3 className="text-[10px] text-[#888] font-bold uppercase tracking-wider mb-3">Renk Seçici</h3>
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-12 h-12 rounded border-2 border-[#333] cursor-pointer bg-transparent overflow-hidden" />
                <span className="text-[#888] text-[10px] font-mono text-center bg-[#0a0a0a] py-1 rounded">{color}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 flex-1 content-start">
              {presetColors.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-full aspect-square rounded-sm border transition-all ${color === c ? 'border-white scale-110 z-10 shadow-lg' : 'border-[#222] hover:border-[#555]'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Layers Panel */}
        <div className="flex-1 p-0 flex flex-col min-h-0 bg-[#161616]">
          <div className="p-3 border-b border-[#222] flex items-center justify-between bg-[#111]">
            <h3 className="text-[10px] text-[#888] font-bold uppercase tracking-wider">Katmanlar</h3>
            <button onClick={addLayer} className="text-[#aaa] hover:text-white text-lg leading-none" title="Yeni Katman">+</button>
          </div>
          
          {/* Layer Controls (Active Layer) */}
          <div className="p-2 border-b border-[#222] bg-[#1a1a1a] flex items-center gap-2 text-xs">
              <span className="text-[#666]">Opaklık:</span>
              <input type="range" min="0" max="100" 
                value={activeLayer?.opacity ?? 100} 
                onChange={e => updateLayerOpacity(activeLayerId, Number(e.target.value))} 
                className="flex-1 accent-[#4ea8de] h-1" 
                disabled={!activeLayer}
              />
              <span className="text-[#888] w-8 text-right">{activeLayer?.opacity ?? 100}%</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Draw top to bottom visually */}
            {[...layers].reverse().map((layer, index, array) => {
              const originalIndex = array.length - 1 - index;
              return (
              <div 
                key={layer.id} 
                onClick={() => setActiveLayerId(layer.id)}
                className={`p-2 rounded flex flex-col gap-2 cursor-pointer border ${activeLayerId === layer.id ? 'bg-[#2a2d3e] border-[#4ea8de]' : 'bg-[#111] border-[#222] hover:bg-[#1a1a1a]'}`}
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} 
                    className={`text-sm ${layer.visible ? 'text-[#ccc]' : 'text-[#444]'}`}
                    title="Görünürlük"
                  >
                    {layer.visible ? '👁' : ''}
                  </button>
                  
                  <div className="w-8 h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center overflow-hidden">
                      <span className="text-[8px] text-[#555]">{layer.strokes.length}</span>
                  </div>
                  
                  <span className="text-xs text-[#ddd] flex-1 truncate">{layer.name}</span>
                  
                  <div className="flex flex-col gap-0.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }} 
                      disabled={originalIndex === layers.length - 1}
                      className="text-[#666] hover:text-white disabled:opacity-30 disabled:hover:text-[#666] text-[10px] leading-none"
                      title="Yukarı Taşı"
                    >▲</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }} 
                      disabled={originalIndex === 0}
                      className="text-[#666] hover:text-white disabled:opacity-30 disabled:hover:text-[#666] text-[10px] leading-none"
                      title="Aşağı Taşı"
                    >▼</button>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} 
                    className="text-[#555] hover:text-red-400 text-xs ml-1"
                    title="Katmanı Sil"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Back Button */}
        <button onClick={onBack}
          className="p-4 border-t border-[#222] bg-[#0a0a0a] text-[#888] text-[10px] font-bold uppercase tracking-wider text-center hover:bg-[#1a1a1a] hover:text-white transition-colors z-10">
          ← Dashboard'a Dön
        </button>
      </div>
    </div>
  );
}
