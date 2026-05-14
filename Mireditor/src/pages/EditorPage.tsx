import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool, Eraser, Minus, Square, Circle, Type, PaintBucket, Pipette, Crop,
  ArrowDown, Cloud, Download, Settings, Check, X, ZoomIn,
  SlidersHorizontal, Layers, Plus, Trash2, Eye, Lock, Sparkles,
  RotateCcw, RotateCw, MousePointer2, Hand, Move, Grid3X3,
  RectangleHorizontal, Pen
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { ProjectConfig } from './DashboardPage';

interface EditorPageProps {
  onBack: () => void;
  config?: ProjectConfig;
}

type Tool = 'select' | 'move' | 'hand' | 'pen' | 'eraser' | 'rect' | 'rect_fill' | 'circle' | 'circle_fill' | 'line' | 'text' | 'fill' | 'eyedropper' | 'crop';

const ShortcutSection = ({ title, shortcuts }: { title: string, shortcuts: { label: string, keys: string[] }[] }) => (
  <div>
    <h3 className="text-[#888] text-[11px] font-bold uppercase tracking-wider mb-4">{title}</h3>
    <div className="space-y-3">
      {shortcuts.map((s, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-[#ddd] text-sm">{s.label}</span>
          <div className="flex items-center gap-1.5">
            {s.keys.map((k, j) => (
              k === '/' ? <span key={j} className="text-[#666] px-1">/</span> :
                <kbd key={j} className="bg-[#222] border border-[#333] text-[#aaa] rounded-md px-2 py-1 text-xs font-medium font-mono shadow-sm">
                  {k}
                </kbd>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ShortcutsModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#161616] border border-[#333] rounded-xl shadow-2xl w-[480px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#4ea8de] rounded flex items-center justify-center text-white font-bold text-xs">M</div>
            <h2 className="text-white font-semibold">Klavye Kısayolları</h2>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <ShortcutSection title="GENEL" shortcuts={[
            { label: 'Aç (.gef)', keys: ['Ctrl+O'] },
            { label: 'Kaydet', keys: ['Ctrl+S'] },
            { label: 'Görüntü Yapıştır', keys: ['Ctrl+V'] },
            { label: 'Geri Al', keys: ['Ctrl+Z'] },
            { label: 'Yinele', keys: ['Ctrl+Shift+Z', '/', 'Ctrl+Y'] },
            { label: 'Yakınlaştır', keys: ['Ctrl++'] },
            { label: 'Uzaklaştır', keys: ['Ctrl+-'] },
            { label: 'Onayla (metin / görsel)', keys: ['Enter'] },
            { label: 'İptal (metin / görsel)', keys: ['Escape'] },
          ]} />
          <ShortcutSection title="ARAÇLAR" shortcuts={[
            { label: 'Seçim', keys: ['V'] },
            { label: 'Taşı', keys: ['M'] },
            { label: 'El (Kaydır)', keys: ['H'] },
            { label: 'El (Geçici)', keys: ['Boşluk'] },
            { label: 'Fırça', keys: ['B'] },
            { label: 'Silgi', keys: ['E'] },
            { label: 'Dikdörtgen', keys: ['R'] },
            { label: 'Daire', keys: ['C'] },
            { label: 'Çizgi', keys: ['L'] },
            { label: 'Metin', keys: ['T'] },
            { label: 'Renk Seçici', keys: ['I'] },
            { label: 'Doldur', keys: ['F'] },
            { label: 'Kırpma', keys: ['K'] },
          ]} />
          <ShortcutSection title="KATMAN" shortcuts={[
            { label: 'Yeni Katman', keys: ['Ctrl+Shift+N'] },
            { label: 'Katmanı Sil', keys: ['Delete'] },
          ]} />
        </div>
      </div>
    </div>
  );
};

const MIRA_QUICK_CMDS = [
  { label: 'Arka Plan Sil', cmd: 'arka plan', color: 'from-violet-600 to-blue-600' },
  { label: 'Renklendur', cmd: 'renklendir', color: 'from-amber-500 to-red-500' },
  { label: 'Netleştir', cmd: 'netlestir', color: 'from-emerald-500 to-teal-600' },
  { label: 'Bulanıklaştır', cmd: 'blur', color: 'from-blue-600 to-indigo-700' },
  { label: 'Kontrast', cmd: 'kontrast', color: 'from-indigo-600 to-purple-700' },
  { label: 'Parlaklık', cmd: 'parlaklık', color: 'from-yellow-500 to-orange-500' },
  { label: 'Siyah Beyaz', cmd: 'siyah beyaz', color: 'from-gray-500 to-gray-800' },
  { label: 'Gökyüzü Güçlendir', cmd: 'gökyüzü', color: 'from-sky-500 to-blue-700' },
];

interface MiraAIModalProps {
  onClose: () => void;
  onCommand: (cmd: string) => void;
  chat: { sender: 'user' | 'mira'; text: string }[];
  input: string;
  setInput: (v: string) => void;
  isProcessing: boolean;
  onSubmit: () => void;
}

const MiraAIModal = ({ onClose, onCommand, chat, input, setInput, isProcessing, onSubmit }: MiraAIModalProps) => {
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181f] border border-[#3F3F46] rounded-2xl shadow-2xl w-[360px] flex flex-col overflow-hidden" style={{ maxHeight: '580px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3F3F46] bg-[#111118] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">Mira AI</p>
            <p className="text-[#555] text-[10px]">Görüntü düzenleme asistanı</p>
          </div>
          <button onClick={onClose} className="ml-auto text-[#555] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Sohbet alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ scrollbarWidth: 'thin' }}>
          {chat.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'mira' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={10} className="text-white" />
                </div>
              )}
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${msg.sender === 'user' ? 'bg-[#3788D8] text-white rounded-br-sm' : 'bg-[#252530] text-[#ccc] rounded-bl-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
                <Sparkles size={10} className="text-white" />
              </div>
              <div className="bg-[#252530] rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Hızlı komutlar */}
        <div className="px-4 py-3 border-t border-[#2A2A35] bg-[#111118] flex-shrink-0">
          <p className="text-[10px] text-[#444] uppercase tracking-wider font-semibold mb-2">Hızlı Komutlar</p>
          <div className="flex flex-wrap gap-1.5">
            {MIRA_QUICK_CMDS.map(qc => (
              <button key={qc.cmd} onClick={() => onCommand(qc.cmd)} disabled={isProcessing}
                className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${qc.color} text-white text-[10px] font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40`}>
                {qc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-[#2A2A35] flex-shrink-0">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSubmit()}
            placeholder="Komut yazın… (ör. 'gökyüzüyü güçlendir')"
            className="flex-1 bg-[#252530] border border-[#3F3F46] rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-[#3788D8] placeholder-[#444]" />
          <button onClick={onSubmit} disabled={isProcessing || !input.trim()}
            className="w-9 h-9 rounded-xl bg-[#3788D8] hover:bg-[#2A75C5] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
            {isProcessing
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ArrowDown size={14} className="text-white -rotate-90" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Çizim (Stroke) Arayüzü ───
// Tuval üzerine çizilen her bir kalem darbesi, metin, şekil veya eklenen görsel "Stroke" olarak adlandırılır ve kaydedilir.
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
  fontFamily?: string;
  fontWeight?: string;
  fontItalic?: boolean;
  preMovePatch?: Stroke[];
}

// ─── Yüzen Görsel Arayüzü ───
// Tuvale dışarıdan eklenen ve sürüklenip boyutlandırılabilen (henüz onaylanmamış) geçici görsellerin durumu.
interface FloatingImageState {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Katman (Layer) Arayüzü ───
// Photoshop benzeri katman yapısını temsil eder. Her katman kendi içinde "Stroke" dizisi barındırır.
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode?: string;
  locked?: boolean;
  strokes: Stroke[];
  redoStack: Stroke[];
  offsetX?: number;
  offsetY?: number;
}

// ─── Ana Editör Bileşeni (EditorPage) ───
// Mireditor'ün kalbidir. Tuval (canvas) çizimleri, araçların seçimi, katman yönetimi ve yapay zeka (Mira AI) burada işlenir.
export function EditorPage({ onBack, config }: EditorPageProps) {
  const { user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tools & Brushes
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushHardness, setBrushHardness] = useState(100);

  // Canvas State
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ w: config?.width || 1200, h: config?.height || 800 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, visible: boolean, value: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'props' | 'layers'>('layers');

  // Layers System
  const initialStrokes: Stroke[] = [];
  if (config && config.background !== 'transparent') {
    initialStrokes.push({
      tool: 'fill', points: [], color: config.background === 'white' ? '#ffffff' : config.customColor || '#000000', size: 1, opacity: 100, hardness: 100
    });
  }

  const [layers, setLayers] = useState<Layer[]>([{
    id: 'layer-bg', name: 'Background', visible: true, opacity: 100, blendMode: 'source-over', locked: true, strokes: initialStrokes, redoStack: []
  }]);
  const [activeLayerId, setActiveLayerId] = useState('layer-bg');
  const draftStrokeRef = useRef<Stroke | null>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Crop State
  const [isCropSelecting, setIsCropSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  // Floating Image State — drag/resize handled via refs (no stale closure)
  const [floatingImage, setFloatingImage] = useState<FloatingImageState | null>(null);
  const floatingImageRef = useRef<FloatingImageState | null>(null);
  const floatingDragRef = useRef<{
    type: 'drag' | 'resize';
    corner: string;
    startX: number; startY: number;
    initX: number; initY: number; initW: number; initH: number;
  } | null>(null);
  // Keep ref in sync with state
  useEffect(() => { floatingImageRef.current = floatingImage; }, [floatingImage]);

  // AI State
  const [showMiraAI, setShowMiraAI] = useState(false);
  const [aiChat, setAiChat] = useState<{ sender: 'user' | 'mira', text: string }[]>([
    { sender: 'mira', text: 'Merhaba! Ben Mira. "arka planı kaldır", "siyah beyaz yap" gibi komutlar vererek tasarımınızı saniyeler içinde değiştirebilirsiniz.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // --- MIRA AI LOGIC ---
  const applyAICommand = (cmd: string) => {
    const command = cmd.toLowerCase();
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const temp = document.createElement('canvas');
    temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d', { willReadFrequently: true });
    if (!tCtx) return false;

    let applied = false;
    let newLayerName = 'AI İşlemi';

    if (command.includes('arka plan') || command.includes('arkaplan')) {
      tCtx.drawImage(canvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width, h = canvas.height;
      // Sample background color from the most common edge pixel color
      const samplePoints = [
        [0,0],[w-1,0],[0,h-1],[w-1,h-1],
        [Math.floor(w/2),0],[Math.floor(w/2),h-1],
        [0,Math.floor(h/2)],[w-1,Math.floor(h/2)]
      ];
      let bgR = 0, bgG = 0, bgB = 0;
      // Use the top-left corner as background sample (most common case)
      const sp = 0; // index 0 = [0,0]
      bgR = data[sp]; bgG = data[sp+1]; bgB = data[sp+2];
      const tolerance = 35;

      // Edge-connected flood fill: only remove pixels reachable from the edges
      const visited = new Uint8Array(w * h);
      const stack: number[] = [];

      const pushIfMatch = (idx: number) => {
        if (idx < 0 || idx >= w * h || visited[idx]) return;
        const pos = idx * 4;
        if (data[pos + 3] === 0) { visited[idx] = 1; return; }
        if (Math.abs(data[pos] - bgR) <= tolerance &&
            Math.abs(data[pos + 1] - bgG) <= tolerance &&
            Math.abs(data[pos + 2] - bgB) <= tolerance) {
          stack.push(idx);
          visited[idx] = 1;
        }
      };

      // Seed from all 4 edges
      for (let x = 0; x < w; x++) { pushIfMatch(x); pushIfMatch((h-1)*w+x); }
      for (let y = 0; y < h; y++) { pushIfMatch(y*w); pushIfMatch(y*w+w-1); }

      while (stack.length) {
        const idx = stack.pop()!;
        const pos = idx * 4;
        data[pos + 3] = 0; // make transparent
        const x = idx % w, y = Math.floor(idx / w);
        if (x > 0) pushIfMatch(idx - 1);
        if (x < w - 1) pushIfMatch(idx + 1);
        if (y > 0) pushIfMatch(idx - w);
        if (y < h - 1) pushIfMatch(idx + w);
      }

      tCtx.putImageData(imgData, 0, 0);
      applied = true;
      newLayerName = 'AI: Arka Plan Temizliği';
    } else if (command.includes('siyah beyaz') || command.includes('siyah-beyaz') || command.includes('grayscale')) {
      tCtx.filter = 'grayscale(100%)';
      tCtx.drawImage(canvas, 0, 0);
      applied = true;
      newLayerName = 'AI: Siyah Beyaz';
    } else if (command.includes('blur') || command.includes('bulanık')) {
      // Blur: draw to offscreen first to avoid edge clipping
      const blurTemp = document.createElement('canvas');
      blurTemp.width = canvas.width + 20; blurTemp.height = canvas.height + 20;
      const bCtx = blurTemp.getContext('2d');
      if (bCtx) {
        bCtx.filter = 'blur(6px)';
        bCtx.drawImage(canvas, 10, 10);
        tCtx.drawImage(blurTemp, -10, -10, blurTemp.width, blurTemp.height);
      }
      applied = true;
      newLayerName = 'AI: Bulanıklaştırma';
    } else if (command.includes('netlestir') || command.includes('netleştir') || command.includes('sharpen') || command.includes('keskin')) {
      tCtx.drawImage(canvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width, h = canvas.height;
      const copy = new Uint8ClampedArray(data);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const v = -copy[((y-1)*w+x)*4+c]
              - copy[(y*w+(x-1))*4+c]
              + 5 * copy[idx+c]
              - copy[(y*w+(x+1))*4+c]
              - copy[((y+1)*w+x)*4+c];
            data[idx+c] = Math.min(255, Math.max(0, v));
          }
        }
      }
      tCtx.putImageData(imgData, 0, 0);
      applied = true;
      newLayerName = 'AI: Netleştirme';
    } else if (command.includes('parlaklık') || command.includes('parlak') || command.includes('bright')) {
      tCtx.filter = 'brightness(140%)';
      tCtx.drawImage(canvas, 0, 0);
      applied = true;
      newLayerName = 'AI: Parlaklık Artışı';
    } else if (command.includes('kontrast') || command.includes('contrast')) {
      tCtx.filter = 'contrast(160%)';
      tCtx.drawImage(canvas, 0, 0);
      applied = true;
      newLayerName = 'AI: Kontrast Artışı';
    } else if (command.includes('renklendir') || command.includes('colorize') || command.includes('renk')) {
      tCtx.drawImage(canvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Detect if image is mostly B&W (average saturation < 20)
      let totalSat = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        totalSat += Math.max(data[i], data[i+1], data[i+2]) - Math.min(data[i], data[i+1], data[i+2]);
        count++;
      }
      const avgSat = totalSat / (count || 1);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Luminance (true gray value)
        const L = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        if (avgSat < 25) {
          // B&W photo: apply rich sepia-to-warm colorization based on brightness zones
          if (L < 50) {
            // Shadows: deep cool brown
            data[i]   = Math.min(255, Math.round(L * 0.95 + 10));
            data[i+1] = Math.min(255, Math.round(L * 0.85));
            data[i+2] = Math.min(255, Math.round(L * 0.72));
          } else if (L < 120) {
            // Midtones: warm amber
            data[i]   = Math.min(255, Math.round(L * 1.2 + 18));
            data[i+1] = Math.min(255, Math.round(L * 0.95 + 5));
            data[i+2] = Math.min(255, Math.round(L * 0.65));
          } else if (L < 200) {
            // Highlights: warm golden
            data[i]   = Math.min(255, Math.round(L * 1.15 + 25));
            data[i+1] = Math.min(255, Math.round(L * 1.0 + 8));
            data[i+2] = Math.min(255, Math.round(L * 0.75));
          } else {
            // Bright highlights: soft warm white
            data[i]   = Math.min(255, Math.round(L * 1.05 + 15));
            data[i+1] = Math.min(255, Math.round(L * 1.0 + 5));
            data[i+2] = Math.min(255, Math.round(L * 0.88));
          }
        } else {
          // Colored photo: boost saturation vibrantly
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const delta = max - min;
          if (delta > 0) {
            const boost = 1.4;
            const midR = (r - 128) * boost + 128;
            const midG = (g - 128) * boost + 128;
            const midB = (b - 128) * boost + 128;
            data[i]   = Math.min(255, Math.max(0, Math.round(midR)));
            data[i+1] = Math.min(255, Math.max(0, Math.round(midG)));
            data[i+2] = Math.min(255, Math.max(0, Math.round(midB)));
          }
        }
      }
      tCtx.putImageData(imgData, 0, 0);
      applied = true;
      newLayerName = avgSat < 25 ? 'AI: Fotoğraf Renklendirme' : 'AI: Renk Güçlendirme';
    } else if (command.includes('gökyüzü') || command.includes('mavi') || command.includes('sky')) {
      tCtx.drawImage(canvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (b > r && b > g - 20) {
          data[i + 2] = Math.min(255, b + 60);
          data[i] = Math.max(0, r - 30);
        }
      }
      tCtx.putImageData(imgData, 0, 0);
      applied = true;
      newLayerName = 'AI: Gökyüzü Güçlendirme';
    } else {
      tCtx.filter = 'brightness(110%) saturate(120%) contrast(105%)';
      tCtx.drawImage(canvas, 0, 0);
      applied = true;
      newLayerName = 'AI: Otomatik Geliştirme';
    }

    if (applied) {
      // Preload image into cache BEFORE adding layer — fixes "effects not showing" bug
      const dataUrl = temp.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        imageCache.current[dataUrl] = img;
        const newId = `layer-ai-${Date.now()}`;
        setLayers(prev => [...prev, {
          id: newId, name: newLayerName, visible: true, opacity: 100,
          strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
          redoStack: []
        }]);
        setActiveLayerId(newId);
      };
      img.src = dataUrl;
      return true;
    }
    return false;
  };

  const handleAiSubmit = () => {
    if (!aiInput.trim() || isAiProcessing) return;
    const cmd = aiInput.trim();
    setAiChat(prev => [...prev, { sender: 'user', text: cmd }]);
    setAiInput('');
    setIsAiProcessing(true);

    setTimeout(() => {
      const success = applyAICommand(cmd);
      if (success) {
        setAiChat(prev => [...prev, { sender: 'mira', text: '✨ İşlem başarıyla uygulandı ve yeni bir katman olarak eklendi! Başka ne yapabilirim?' }]);
      } else {
        setAiChat(prev => [...prev, { sender: 'mira', text: 'Üzgünüm, bu komutu tam anlayamadım.' }]);
      }
      setIsAiProcessing(false);
    }, 1200);
  };

  // Resize State
  const [rightPanelWidth, setRightPanelWidth] = useState(260);
  const isResizingRef = useRef(false);

  // Layer Drag & Drop State
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLayerIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires some data to be set
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedLayerIndex === null || draggedLayerIndex === dropIndex) {
      setDraggedLayerIndex(null);
      setDragOverIndex(null);
      return;
    }

    setLayers(prev => {
      const newLayers = [...prev];
      const draggedLayer = newLayers[draggedLayerIndex];
      newLayers.splice(draggedLayerIndex, 1);
      newLayers.splice(dropIndex, 0, draggedLayer);
      return newLayers;
    });

    setDraggedLayerIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerIndex(null);
    setDragOverIndex(null);
  };

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

  // Pan/Hand tool state
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Move tool state — live offset stored in ref to avoid setState on every mousemove
  const moveStartRef = useRef<{ x: number; y: number; layerOffsetX: number; layerOffsetY: number } | null>(null);
  const liveOffsetRef = useRef<{ x: number; y: number } | null>(null);

  // Cursor pos ref for ruler (avoids re-render on every mousemove)
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const cursorThrottleRef = useRef<number>(0);

  // Layers ref for callbacks that shouldn't re-create on every layer change
  const layersRef = useRef<typeof layers>(layers);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  // Select tool state
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const selStartRef = useRef<{ x: number; y: number } | null>(null);

  // Dialogs
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showCurvesDialog, setShowCurvesDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp' | 'gef'>('png');
  const [exportQuality, setExportQuality] = useState(92);
  const [newCanvasSize, setNewCanvasSize] = useState({ w: 1200, h: 800 });

  // Rulers
  const rulerHRef = useRef<HTMLCanvasElement>(null);
  const rulerVRef = useRef<HTMLCanvasElement>(null);
  const [showRulers, setShowRulers] = useState(true);

  // Zoom input
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInputStr, setZoomInputStr] = useState('');

  // Text formatting
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontItalic, setFontItalic] = useState(false);

  // Auto-save
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveMinutes, setAutoSaveMinutes] = useState(3);

  // Curves settings
  const [curvesSettings, setCurvesSettings] = useState({
    channel: 'rgb', inBlack: 0, inWhite: 255, gamma: 1.0, outBlack: 0, outWhite: 255
  });

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

    if (s.tool === 'fill') {
      if (s.imageUrl) {
        const img = imageCache.current[s.imageUrl];
        if (img) {
          const imgW = s.imgWidth || img.width;
          const imgH = s.imgHeight || img.height;
          const imgX = s.startX || 0;
          const imgY = s.startY || 0;
          ctx.drawImage(img, imgX, imgY, imgW, imgH);
        } else {
          const newImg = new Image();
          newImg.src = s.imageUrl;
          newImg.onload = () => {
            imageCache.current[s.imageUrl!] = newImg;
            redrawCanvas();
          };
        }
      } else {
        ctx.fillStyle = s.color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
    } else if ((s.tool === 'rect' || s.tool === 'rect_fill') && s.startX != null && s.endX != null) {
      ctx.globalCompositeOperation = 'source-over';
      if (s.tool === 'rect_fill') {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.startX, s.startY!, s.endX - s.startX, s.endY! - s.startY!);
      } else {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.strokeRect(s.startX, s.startY!, s.endX - s.startX, s.endY! - s.startY!);
      }
    } else if ((s.tool === 'circle' || s.tool === 'circle_fill') && s.startX != null && s.endX != null) {
      ctx.globalCompositeOperation = 'source-over';
      const rx = Math.abs(s.endX - s.startX) / 2;
      const ry = Math.abs(s.endY! - s.startY!) / 2;
      const cx = s.startX + (s.endX - s.startX) / 2;
      const cy = s.startY! + (s.endY! - s.startY!) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (s.tool === 'circle_fill') {
        ctx.fillStyle = s.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.stroke();
      }
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
      const fw = s.fontWeight === 'bold' ? 'bold ' : '';
      const fi = s.fontItalic ? 'italic ' : '';
      const ff = s.fontFamily || 'Plus Jakarta Sans';
      ctx.font = `${fi}${fw}${s.size * 5}px '${ff}', sans-serif`;
      ctx.globalCompositeOperation = 'source-over';
      ctx.textBaseline = 'top';
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

        // Use liveOffsetRef during move drag to avoid setLayers on every mousemove
        const isMovingThis = layer.id === activeLayerId && liveOffsetRef.current !== null;
        const ox = isMovingThis ? liveOffsetRef.current!.x : (layer.offsetX || 0);
        const oy = isMovingThis ? liveOffsetRef.current!.y : (layer.offsetY || 0);

        offCtx.save();
        offCtx.translate(ox, oy);
        layer.strokes.forEach(s => drawStroke(s, offCtx));
        offCtx.restore();

        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = (layer.blendMode as GlobalCompositeOperation) || 'source-over';
        ctx.drawImage(offCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
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
        Math.abs(data[pos + 1] - startG) <= tolerance &&
        Math.abs(data[pos + 2] - startB) <= tolerance &&
        Math.abs(data[pos + 3] - startA) <= tolerance);
    };

    const colorPixel = (pos: number) => {
      fillData[pos] = targetColor.r;
      fillData[pos + 1] = targetColor.g;
      fillData[pos + 2] = targetColor.b;
      fillData[pos + 3] = targetColor.a;

      // Mark visited in main array
      data[pos] = targetColor.r;
      data[pos + 1] = targetColor.g;
      data[pos + 2] = targetColor.b;
      data[pos + 3] = 255;
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
    const activeTool = spaceHeld ? 'hand' : tool;

    if (activeTool === 'hand') {
      const container = containerRef.current;
      if (!container) return;
      panStartRef.current = { x: e.clientX, y: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
      setIsDrawing(true);
      return;
    }

    const pos = getCanvasCoords(e);
    setCursorPos(pos);

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked && activeTool !== 'select' && activeTool !== 'move') return;

    if (activeTool === 'eyedropper') {
      doEyedropper(pos.x, pos.y);
      return;
    }

    if (activeTool === 'fill') {
      doFloodFill(pos.x, pos.y, color);
      return;
    }

    if (textInput && textInput.visible) {
      commitTextStroke();
    }

    if (activeTool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, visible: true, value: '' });
      return;
    }

    if (activeTool === 'crop') {
      setIsCropSelecting(true);
      setCropStart(pos);
      return;
    }

    if (activeTool === 'move') {
      const al = layers.find(l => l.id === activeLayerId);
      if (al?.locked) return; // Kilitli katman taşınamaz
      moveStartRef.current = { x: pos.x, y: pos.y, layerOffsetX: al?.offsetX || 0, layerOffsetY: al?.offsetY || 0 };
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'select') {
      selStartRef.current = pos;
      setSelection(null);
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);

    let newStroke: Stroke;
    if (activeTool === 'pen' || activeTool === 'eraser') {
      newStroke = { tool: activeTool as Tool, points: [pos], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness };
    } else {
      setShapeStart(pos);
      newStroke = { tool: activeTool as Tool, points: [], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y };
    }

    draftStrokeRef.current = newStroke;
    const dCtx = draftCanvasRef.current?.getContext('2d');
    if (dCtx) {
      dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      drawStroke(newStroke, dCtx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const activeTool = spaceHeld ? 'hand' : tool;

    if (activeTool === 'hand' && isDrawing && panStartRef.current) {
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
      container.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
      return;
    }

    const pos = getCanvasCoords(e);
    cursorPosRef.current = pos;
    if (showRulers) drawRulers();
    // Throttle the status-bar state update to ~30fps (every 33ms)
    const now = performance.now();
    if (now - cursorThrottleRef.current > 33) {
      cursorThrottleRef.current = now;
      setCursorPos(pos);
    }

    if (activeTool === 'crop' && isCropSelecting && cropStart) {
      const dCtx = draftCanvasRef.current?.getContext('2d');
      if (dCtx) {
        dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        dCtx.fillStyle = 'rgba(0,0,0,0.5)';
        dCtx.fillRect(0, 0, canvasSize.w, canvasSize.h);
        const rX = Math.min(pos.x, cropStart.x);
        const rY = Math.min(pos.y, cropStart.y);
        const rW = Math.abs(pos.x - cropStart.x);
        const rH = Math.abs(pos.y - cropStart.y);
        dCtx.clearRect(rX, rY, rW, rH);
        dCtx.strokeStyle = '#fff';
        dCtx.lineWidth = 1;
        dCtx.setLineDash([5, 5]);
        dCtx.strokeRect(rX, rY, rW, rH);
        dCtx.setLineDash([]);
      }
      return;
    }

    if (activeTool === 'move' && isDrawing && moveStartRef.current) {
      const dx = pos.x - moveStartRef.current.x;
      const dy = pos.y - moveStartRef.current.y;
      // Update ref only — no setState, no React re-render, no useEffect cascade
      liveOffsetRef.current = {
        x: moveStartRef.current.layerOffsetX + dx,
        y: moveStartRef.current.layerOffsetY + dy
      };
      redrawCanvas();
      return;
    }

    if (activeTool === 'select' && isDrawing && selStartRef.current) {
      const x = Math.min(pos.x, selStartRef.current.x);
      const y = Math.min(pos.y, selStartRef.current.y);
      const w = Math.abs(pos.x - selStartRef.current.x);
      const h = Math.abs(pos.y - selStartRef.current.y);
      setSelection({ x, y, w, h });
      const dCtx = draftCanvasRef.current?.getContext('2d');
      if (dCtx) {
        dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        dCtx.strokeStyle = '#fff';
        dCtx.lineWidth = 1;
        dCtx.setLineDash([6, 3]);
        dCtx.strokeRect(x + 0.5, y + 0.5, w, h);
        dCtx.strokeStyle = '#000';
        dCtx.lineDashOffset = 6;
        dCtx.strokeRect(x + 0.5, y + 0.5, w, h);
        dCtx.setLineDash([]);
        dCtx.lineDashOffset = 0;
      }
      return;
    }

    if (!isDrawing || !draftStrokeRef.current) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
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
    if ((spaceHeld || tool === 'hand') && panStartRef.current) {
      panStartRef.current = null;
      setIsDrawing(false);
      return;
    }

    if (tool === 'move' && moveStartRef.current) {
      const finalOffset = liveOffsetRef.current;
      moveStartRef.current = null;
      liveOffsetRef.current = null;
      setIsDrawing(false);

      if (!finalOffset || (finalOffset.x === 0 && finalOffset.y === 0)) return;

      // Bake offset into a single image stroke (one setState call total)
      const layer = layersRef.current.find(l => l.id === activeLayerId);
      if (!layer) return;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvasSize.w; offCanvas.height = canvasSize.h;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;
      offCtx.save();
      offCtx.translate(finalOffset.x, finalOffset.y);
      layer.strokes.forEach(s => drawStroke(s, offCtx));
      offCtx.restore();
      const dataUrl = offCanvas.toDataURL('image/png');
      const img = new Image();
      const lid = activeLayerId;
      img.onload = () => {
        imageCache.current[dataUrl] = img;
        setLayers(prev => prev.map(l => l.id === lid ? {
          ...l,
          strokes: [{ tool: 'fill' as Tool, points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl, startX: 0, startY: 0, imgWidth: canvasSize.w, imgHeight: canvasSize.h, preMovePatch: l.strokes }],
          offsetX: 0, offsetY: 0, redoStack: l.redoStack
        } : l));
      };
      img.src = dataUrl;
      return;
    }

    if (tool === 'select') {
      selStartRef.current = null;
      setIsDrawing(false);
      return;
    }

    if (tool === 'crop' && isCropSelecting && cropStart) {
      setIsCropSelecting(false);
      const finalW = Math.abs(cursorPos.x - cropStart.x);
      const finalH = Math.abs(cursorPos.y - cropStart.y);
      if (finalW > 10 && finalH > 10) {
        const finalRect = {
          x: Math.min(cursorPos.x, cropStart.x),
          y: Math.min(cursorPos.y, cropStart.y),
          w: finalW,
          h: finalH
        };
        doCrop(finalRect);
      }
      const dCtx = draftCanvasRef.current?.getContext('2d');
      if (dCtx) dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      return;
    }

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
      addStrokeToActiveLayer({ tool: 'text', points: [], color, size: brushSize, opacity: brushOpacity, hardness: brushHardness, startX: textInput.x, startY: textInput.y, text: textInput.value, fontFamily, fontWeight, fontItalic });
    }
    setTextInput(null);
  };

  const undo = () => {
    setLayers(prev => prev.map(l => {
      if (l.id === activeLayerId) {
        if (l.strokes.length === 0) return l;
        const last = l.strokes[l.strokes.length - 1];
        if (last.preMovePatch) {
          return { ...l, strokes: last.preMovePatch, redoStack: [...l.redoStack, last] };
        }
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
        if (last.preMovePatch) {
          return { ...l, redoStack: l.redoStack.slice(0, -1), strokes: [last] };
        }
        return { ...l, redoStack: l.redoStack.slice(0, -1), strokes: [...l.strokes, last] };
      }
      return l;
    }));
  };

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    setLayers(prev => [...prev, { id: newId, name: `Katman ${prev.length + 1}`, visible: true, opacity: 100, locked: false, strokes: [], redoStack: [] }]);
    setActiveLayerId(newId);
  };

  const deleteLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked || layers.length <= 1) return; 
    setLayers(prev => {
      const filtered = prev.filter(l => l.id !== id);
      if (activeLayerId === id) setActiveLayerId(filtered[filtered.length - 1].id);
      return filtered;
    });
  };

  const toggleLayerLock = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };

  const updateLayerBlendMode = (id: string, blendMode: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode } : l));
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

  // Floating Image — global handlers registered once, use refs (no stale closure, no re-registration)
  useEffect(() => {
    const getCanvasPosFromEvent = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const drag = floatingDragRef.current;
      const fi = floatingImageRef.current;
      if (!drag || !fi) return;
      const pos = getCanvasPosFromEvent(e);
      const dx = pos.x - drag.startX;
      const dy = pos.y - drag.startY;

      if (drag.type === 'drag') {
        setFloatingImage({ ...fi, x: drag.initX + dx, y: drag.initY + dy });
      } else {
        let x = drag.initX, y = drag.initY, w = drag.initW, h = drag.initH;
        if (drag.corner === 'se') { w += dx; h += dy; }
        else if (drag.corner === 'sw') { x += dx; w -= dx; h += dy; }
        else if (drag.corner === 'ne') { y += dy; w += dx; h -= dy; }
        else if (drag.corner === 'nw') { x += dx; y += dy; w -= dx; h -= dy; }
        else if (drag.corner === 'n') { y += dy; h -= dy; }
        else if (drag.corner === 's') { h += dy; }
        else if (drag.corner === 'w') { x += dx; w -= dx; }
        else if (drag.corner === 'e') { w += dx; }
        w = Math.max(20, w); h = Math.max(20, h);
        setFloatingImage({ ...fi, x, y, w, h });
      }
    };

    const handleGlobalMouseUp = () => {
      floatingDragRef.current = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []); // Registered ONCE — refs handle the live values

  const handleFloatingMouseDown = (e: React.MouseEvent, corner?: string) => {
    if (!floatingImage) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getCanvasCoords(e);
    floatingDragRef.current = {
      type: corner ? 'resize' : 'drag',
      corner: corner || '',
      startX: pos.x, startY: pos.y,
      initX: floatingImage.x, initY: floatingImage.y,
      initW: floatingImage.w, initH: floatingImage.h,
    };
  };

  const commitFloatingImage = () => {
    const fi = floatingImageRef.current;
    if (!fi) return;
    const img = imageCache.current[fi.url];
    if (!img) {
      const newImg = new Image();
      newImg.onload = () => {
        imageCache.current[fi.url] = newImg;
        addStrokeToActiveLayer({ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: fi.url, startX: fi.x, startY: fi.y, imgWidth: fi.w, imgHeight: fi.h });
      };
      newImg.src = fi.url;
    } else {
      addStrokeToActiveLayer({ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: fi.url, startX: fi.x, startY: fi.y, imgWidth: fi.w, imgHeight: fi.h });
    }
    setFloatingImage(null);
  };

  const handleFloatingEdgeResize = (e: React.MouseEvent, edge: string) => {
    if (!floatingImage) return;
    e.stopPropagation(); e.preventDefault();
    const pos = getCanvasCoords(e);
    floatingDragRef.current = {
      type: 'resize', corner: edge,
      startX: pos.x, startY: pos.y,
      initX: floatingImage.x, initY: floatingImage.y,
      initW: floatingImage.w, initH: floatingImage.h,
    };
  };

  // Close menu on outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (textInput?.visible) return;

      // Floating image shortcuts
      if (floatingImageRef.current) {
        if (e.key === 'Enter') { e.preventDefault(); commitFloatingImage(); return; }
        if (e.key === 'Escape') { e.preventDefault(); setFloatingImage(null); return; }
      }

      if (e.key === ' ' && !e.repeat) { e.preventDefault(); setSpaceHeld(true); return; }

      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); redo(); }
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveProject(); }
      if (e.ctrlKey && e.shiftKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); addLayer(); }
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(z => Math.min(z + 10, 500)); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(z - 10, 10)); }
      if (e.key === 'Delete') {
        e.preventDefault();
        if (selection) {
          // Seçili alanı sil
          const canvas = canvasRef.current;
          if (canvas) {
            const temp = document.createElement('canvas');
            temp.width = canvas.width; temp.height = canvas.height;
            const tCtx = temp.getContext('2d');
            if (tCtx) {
              tCtx.drawImage(canvas, 0, 0);
              tCtx.clearRect(selection.x, selection.y, selection.w, selection.h);
              const dataUrl = temp.toDataURL('image/png');
              const img = new Image();
              img.onload = () => {
                imageCache.current[dataUrl] = img;
                const newId = `layer-del-${Date.now()}`;
                setLayers([{ id: newId, name: 'Seçim Silindi', visible: true, opacity: 100, strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }], redoStack: [] }]);
                setActiveLayerId(newId);
              };
              img.src = dataUrl;
            }
          }
          setSelection(null);
          const dCtx = draftCanvasRef.current?.getContext('2d');
          if (dCtx) dCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        } else if (activeLayerId && layers.length > 1) {
          deleteLayer(activeLayerId);
        }
      }

      if (!e.ctrlKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === 'm' || e.key === 'M') setTool('move');
        if (e.key === 'h' || e.key === 'H') setTool('hand');
        if (e.key === 'b' || e.key === 'B') setTool('pen');
        if (e.key === 'e' || e.key === 'E') setTool('eraser');
        if (e.key === 'r' || e.key === 'R') setTool('rect');
        if (e.key === 'l' || e.key === 'L') setTool('line');
        if (e.key === 't' || e.key === 'T') setTool('text');
        if (e.key === 'i' || e.key === 'I') setTool('eyedropper');
        if (e.key === 'f' || e.key === 'F') setTool('fill');
        if (e.key === 'c' || e.key === 'C') setTool('circle');
        if (e.key === 'k' || e.key === 'K') setTool('crop');
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceHeld(false);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [layers, activeLayerId, textInput]);

  // Paste handler for Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (textInput?.visible) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const dataUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              imageCache.current[dataUrl] = img;
              const { x, y, w, h } = fitImageToCanvas(img.width, img.height);
              setFloatingImage({ url: dataUrl, x, y, w, h });
            };
            img.src = dataUrl;
          }
          break; // Only handle the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addStrokeToActiveLayer, textInput]);

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

  const projectInputRef = useRef<HTMLInputElement>(null);

  // Scale image to fit inside canvas (90%) while keeping aspect ratio, center or drop at cursor
  const fitImageToCanvas = (imgW: number, imgH: number, dropX?: number, dropY?: number) => {
    const maxW = canvasSize.w * 0.9;
    const maxH = canvasSize.h * 0.9;
    const scale = Math.min(1, maxW / imgW, maxH / imgH);
    const w = Math.round(imgW * scale);
    const h = Math.round(imgH * scale);
    const x = dropX !== undefined ? Math.round(dropX - w / 2) : Math.round((canvasSize.w - w) / 2);
    const y = dropY !== undefined ? Math.round(dropY - h / 2) : Math.round((canvasSize.h - h) / 2);
    return { x, y, w, h };
  };

  // ─── IMAGE IMPORT ───
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imageCache.current[dataUrl] = img;
      const { x, y, w, h } = fitImageToCanvas(img.width, img.height);
      setFloatingImage({ url: dataUrl, x, y, w, h });
    };
    img.src = dataUrl;
    e.target.value = '';
  };

  // ─── PROJECT IMPORT (.gef) ───
  const handleProjectImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.gef')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.canvasSize && data.layers) {
          setCanvasSize(data.canvasSize);
          setLayers(data.layers);
          alert(`${file.name} başarıyla yüklendi!`);
        } else {
          alert('Hata: Geçersiz proje dosyası formatı.');
        }
      } catch (err) {
        console.error(err);
        alert('Hata: Proje dosyası okunurken bir sorun oluştu.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ─── CROP ───
  const doCrop = (rect: { x: number, y: number, w: number, h: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, w, h } = rect;
    const cX = Math.max(0, Math.round(x));
    const cY = Math.max(0, Math.round(y));
    const cW = Math.min(Math.round(w), canvas.width - cX);
    const cH = Math.min(Math.round(h), canvas.height - cY);
    if (cW <= 0 || cH <= 0) return;

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
      setLayers([{
        id: newId, name: 'Kırpılmış', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl, startX: 0, startY: 0, imgWidth: cW, imgHeight: cH }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
    }, 'image/png');
  };

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
      setLayers([{
        id: newId, name: 'Rotated', visible: true, opacity: 100,
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
      setLayers([{
        id: newId, name: dir === 'h' ? 'Flipped H' : 'Flipped V', visible: true, opacity: 100,
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
      setLayers([{
        id: newId, name: 'Filtered', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
      setFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });
    }, 'image/png');
  };

  const resetFilters = () => setFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });

  const flattenLayers = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = URL.createObjectURL(blob);
      const newId = `layer-flat-${Date.now()}`;
      setLayers([{ id: newId, name: 'Düzleştirildi', visible: true, opacity: 100, strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }], redoStack: [] }]);
      setActiveLayerId(newId);
    }, 'image/png');
  };

  const fitToWindow = () => {
    const container = containerRef.current;
    if (!container) return;
    const scaleX = (container.clientWidth - 80) / canvasSize.w * 100;
    const scaleY = (container.clientHeight - 80) / canvasSize.h * 100;
    setZoom(Math.max(10, Math.round(Math.min(scaleX, scaleY, 200))));
  };

  // ─── RULERS ───
  const drawRulers = useCallback(() => {
    const container = containerRef.current;
    const rulerH = rulerHRef.current;
    const rulerV = rulerVRef.current;
    if (!container || !rulerH || !rulerV) return;

    const pxPerCanvasPx = zoom / 100;
    const canvasW = canvasSize.w * pxPerCanvasPx;
    const canvasH = canvasSize.h * pxPerCanvasPx;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const canvasLeft = Math.max(0, (containerW - canvasW) / 2) - container.scrollLeft;
    const canvasTop  = Math.max(0, (containerH - canvasH) / 2) - container.scrollTop;

    let step = 100;
    if (zoom >= 400) step = 10;
    else if (zoom >= 200) step = 25;
    else if (zoom >= 100) step = 50;
    else if (zoom >= 40) step = 100;
    else step = 200;

    // Horizontal ruler
    rulerH.width = rulerH.offsetWidth || containerW;
    const hCtx = rulerH.getContext('2d');
    if (hCtx) {
      hCtx.fillStyle = '#1E1E1E';
      hCtx.fillRect(0, 0, rulerH.width, 20);
      const startCpx = Math.floor(-canvasLeft / pxPerCanvasPx / step) * step;
      for (let cpx = startCpx; cpx <= canvasSize.w + rulerH.width / pxPerCanvasPx + step; cpx += step) {
        const sx = Math.round(canvasLeft + cpx * pxPerCanvasPx);
        if (sx < -1 || sx > rulerH.width + 1) continue;
        const isMajor = (cpx % (step * 5) === 0) || step >= 100;
        hCtx.strokeStyle = isMajor ? '#555' : '#3A3A3A';
        hCtx.lineWidth = 1;
        hCtx.beginPath();
        hCtx.moveTo(sx + 0.5, 20);
        hCtx.lineTo(sx + 0.5, isMajor ? 10 : 15);
        hCtx.stroke();
        if (isMajor && cpx >= 0 && cpx <= canvasSize.w) {
          hCtx.fillStyle = '#666';
          hCtx.font = '7px monospace';
          hCtx.fillText(cpx.toString(), sx + 2, 9);
        }
      }
      [canvasLeft, canvasLeft + canvasW].forEach(x => {
        hCtx.strokeStyle = '#3788D8';
        hCtx.lineWidth = 1;
        hCtx.beginPath();
        hCtx.moveTo(Math.round(x) + 0.5, 0);
        hCtx.lineTo(Math.round(x) + 0.5, 20);
        hCtx.stroke();
      });
      const cx = Math.round(canvasLeft + cursorPosRef.current.x * pxPerCanvasPx);
      hCtx.strokeStyle = 'rgba(55,136,216,0.6)';
      hCtx.lineWidth = 1;
      hCtx.beginPath(); hCtx.moveTo(cx + 0.5, 0); hCtx.lineTo(cx + 0.5, 20); hCtx.stroke();
    }

    // Vertical ruler
    rulerV.height = rulerV.offsetHeight || containerH;
    const vCtx = rulerV.getContext('2d');
    if (vCtx) {
      vCtx.fillStyle = '#1E1E1E';
      vCtx.fillRect(0, 0, 20, rulerV.height);
      const startCpy = Math.floor(-canvasTop / pxPerCanvasPx / step) * step;
      for (let cpy = startCpy; cpy <= canvasSize.h + rulerV.height / pxPerCanvasPx + step; cpy += step) {
        const sy = Math.round(canvasTop + cpy * pxPerCanvasPx);
        if (sy < -1 || sy > rulerV.height + 1) continue;
        const isMajor = (cpy % (step * 5) === 0) || step >= 100;
        vCtx.strokeStyle = isMajor ? '#555' : '#3A3A3A';
        vCtx.lineWidth = 1;
        vCtx.beginPath();
        vCtx.moveTo(20, sy + 0.5);
        vCtx.lineTo(isMajor ? 10 : 15, sy + 0.5);
        vCtx.stroke();
        if (isMajor && cpy >= 0 && cpy <= canvasSize.h) {
          vCtx.save();
          vCtx.fillStyle = '#666';
          vCtx.font = '7px monospace';
          vCtx.translate(9, sy - 2);
          vCtx.rotate(-Math.PI / 2);
          vCtx.fillText(cpy.toString(), 0, 0);
          vCtx.restore();
        }
      }
      [canvasTop, canvasTop + canvasH].forEach(y => {
        vCtx.strokeStyle = '#3788D8';
        vCtx.lineWidth = 1;
        vCtx.beginPath();
        vCtx.moveTo(0, Math.round(y) + 0.5);
        vCtx.lineTo(20, Math.round(y) + 0.5);
        vCtx.stroke();
      });
      const cy = Math.round(canvasTop + cursorPosRef.current.y * pxPerCanvasPx);
      vCtx.strokeStyle = 'rgba(55,136,216,0.6)';
      vCtx.lineWidth = 1;
      vCtx.beginPath(); vCtx.moveTo(0, cy + 0.5); vCtx.lineTo(20, cy + 0.5); vCtx.stroke();
    }
  }, [zoom, canvasSize]); // cursorPosRef is a ref — not a dependency

  useEffect(() => {
    if (!showRulers) return;
    drawRulers();
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => drawRulers();
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [drawRulers, showRulers]);

  // ─── AUTO-SAVE ───
  const autoSaveQuiet = useCallback(async () => {
    try {
      const dateStr = new Date().toLocaleString('tr-TR').replace(/[:. ]/g, '-');
      const title = `Otomatik_${dateStr}`;
      const fileName = `${title}.gef`;
      // Use layersRef so this callback never needs to be recreated on layer changes
      const projectData = { version: '1.0', title, canvasSize, layers: layersRef.current, lastModified: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {}
  }, [canvasSize]); // layersRef is a ref — stable reference, not a dep

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const id = setInterval(() => autoSaveQuiet(), autoSaveMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSaveEnabled, autoSaveMinutes, autoSaveQuiet]);

  // ─── CURVES / LEVELS ───
  const applyCurves = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const temp = document.createElement('canvas');
    temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d', { willReadFrequently: true });
    if (!tCtx) return;
    tCtx.drawImage(canvas, 0, 0);
    const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const { channel, inBlack, inWhite, gamma, outBlack, outWhite } = curvesSettings;

    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let v = (i - inBlack) / Math.max(1, inWhite - inBlack);
      v = Math.max(0, Math.min(1, v));
      v = Math.pow(v, 1 / Math.max(0.01, gamma));
      lut[i] = Math.round(outBlack + v * (outWhite - outBlack));
    }

    for (let i = 0; i < d.length; i += 4) {
      if (channel === 'rgb') {
        d[i] = lut[d[i]]; d[i+1] = lut[d[i+1]]; d[i+2] = lut[d[i+2]];
      } else if (channel === 'r') {
        d[i] = lut[d[i]];
      } else if (channel === 'g') {
        d[i+1] = lut[d[i+1]];
      } else if (channel === 'b') {
        d[i+2] = lut[d[i+2]];
      }
    }
    tCtx.putImageData(imgData, 0, 0);
    const dataUrl = temp.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      imageCache.current[dataUrl] = img;
      const newId = `layer-curves-${Date.now()}`;
      setLayers(prev => [...prev, {
        id: newId, name: 'Eğri Ayarı', visible: true, opacity: 100,
        strokes: [{ tool: 'fill' as Tool, points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
    };
    img.src = dataUrl;
    setShowCurvesDialog(false);
  };

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
      setLayers([{
        id: newId, name: 'Resized', visible: true, opacity: 100,
        strokes: [{ tool: 'fill', points: [], color: '#000', size: 1, opacity: 100, hardness: 100, imageUrl: dataUrl }],
        redoStack: []
      }]);
      setActiveLayerId(newId);
      setShowResizeDialog(false);
    }, 'image/png');
  };

  // ─── ADVANCED EXPORT ───
  const doExport = () => {
    if (exportFormat === 'gef') {
      saveProject();
      setShowExportDialog(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = exportFormat === 'png' ? 'image/png' : exportFormat === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const link = document.createElement('a');
    link.download = `mireditor-export.${exportFormat}`;
    link.href = canvas.toDataURL(mime, exportQuality / 100);
    link.click();
    setShowExportDialog(false);
  };

  // ─── SAVE PROJECT ───
  const saveProject = async () => {
    try {
      const dateStr = new Date().toLocaleString('tr-TR').replace(/[:. ]/g, '-');
      const title = `Proje_${dateStr}`;
      const fileName = `${title}.gef`;

      // 1. Prepare project data for the .gef file
      const projectData = {
        version: '1.0',
        title: title,
        canvasSize: canvasSize,
        layers: layers,
        lastModified: new Date().toISOString()
      };

      // 2. Download the .gef file
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);

      // 3. Save metadata to Local Storage
      const newDraft = {
        id: Date.now(),
        title: title,
        file_path: `local://${fileName}`,
        file_size_kb: Math.round(blob.size / 1024),
        last_modified: new Date().toISOString(),
        is_cloud_synced: false
      };

      const localDraftsStr = localStorage.getItem('mireditor-local-drafts');
      const localDrafts = localDraftsStr ? JSON.parse(localDraftsStr) : [];
      localDrafts.unshift(newDraft);
      localStorage.setItem('mireditor-local-drafts', JSON.stringify(localDrafts));

      // 4. Optional Cloud Sync
      const token = useAuthStore.getState().token;
      if (token) {
        try {
          const res = await fetch("http://localhost:8000/drafts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, file_size_kb: newDraft.file_size_kb })
          });
          if (res.ok) {
            newDraft.is_cloud_synced = true;
            localStorage.setItem('mireditor-local-drafts', JSON.stringify(localDrafts));
          }
        } catch (err) {
          console.warn("Backend save failed, saved locally.");
        }
      }

      alert(`${fileName} başarıyla bilgisayarınıza indirildi ve taslaklara kaydedildi!`);
    } catch (err) {
      console.error(err);
      alert("Proje kaydedilemedi.");
    }
  };

  // Canvas presets
  const CANVAS_PRESETS = [
    { name: 'Instagram Post', w: 1080, h: 1080 },
    { name: 'Instagram Story', w: 1080, h: 1920 },
    { name: 'Facebook Kapak', w: 820, h: 312 },
    { name: 'Twitter/X Başlık', w: 1500, h: 500 },
    { name: 'YouTube Thumbnail', w: 1280, h: 720 },
    { name: 'Full HD', w: 1920, h: 1080 },
    { name: '4K UHD', w: 3840, h: 2160 },
    { name: 'A4 (300dpi)', w: 2480, h: 3508 },
    { name: 'A3 (300dpi)', w: 3508, h: 4961 },
    { name: 'Twitch Banner', w: 1200, h: 480 },
    { name: 'LinkedIn Kapak', w: 1584, h: 396 },
    { name: 'Web Banner', w: 728, h: 90 },
  ];

  const toolConfig: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; group?: string }[] = [
    { id: 'select', icon: <MousePointer2 size={20} />, label: 'Seçim', shortcut: 'V', group: 'nav' },
    { id: 'move', icon: <Move size={20} />, label: 'Taşı (katman)', shortcut: 'M', group: 'nav' },
    { id: 'hand', icon: <Hand size={20} />, label: 'El (Kaydır)', shortcut: 'H', group: 'nav' },
    { id: 'pen', icon: <PenTool size={20} />, label: 'Fırça', shortcut: 'B', group: 'draw' },
    { id: 'eraser', icon: <Eraser size={20} />, label: 'Silgi', shortcut: 'E', group: 'draw' },
    { id: 'line', icon: <Minus size={20} />, label: 'Çizgi', shortcut: 'L', group: 'shape' },
    { id: 'rect', icon: <Square size={20} />, label: 'Dikdörtgen (çizgi)', shortcut: 'R', group: 'shape' },
    { id: 'rect_fill', icon: <RectangleHorizontal size={20} />, label: 'Dikdörtgen (dolu)', shortcut: 'shift+R', group: 'shape' },
    { id: 'circle', icon: <Circle size={20} />, label: 'Daire (çizgi)', shortcut: 'C', group: 'shape' },
    { id: 'circle_fill', icon: <div style={{width:16,height:16,borderRadius:'50%',background:'currentColor'}} />, label: 'Daire (dolu)', shortcut: 'shift+C', group: 'shape' },
    { id: 'text', icon: <Type size={20} />, label: 'Metin', shortcut: 'T', group: 'other' },
    { id: 'fill', icon: <PaintBucket size={20} />, label: 'Doldur (Bucket)', shortcut: 'F', group: 'other' },
    { id: 'eyedropper', icon: <Pipette size={20} />, label: 'Renk Seçici', shortcut: 'I', group: 'other' },
    { id: 'crop', icon: <Crop size={20} />, label: 'Kırpma', shortcut: 'K', group: 'other' },
  ];

  const presetColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#888888', '#ff4488'];

  const activeLayer = layers.find(l => l.id === activeLayerId);

  return (
    <div className="w-full h-full flex flex-col bg-[#0D0D12] select-none font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleImageImport} accept="image/*" className="hidden" />
      <input type="file" ref={projectInputRef} onChange={handleProjectImport} accept=".gef" className="hidden" />

      {/* ── TOP BAR ── */}
      <header className="h-11 bg-[#111118] flex items-center px-3 justify-between border-b border-[#1E1E2A] z-50 relative flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }}>
        {/* Left: Logo + Menus */}
        <div className="flex items-center gap-0.5">
          <button onClick={onBack} className="flex items-center gap-2 mr-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white font-black text-[11px] shadow-[0_2px_8px_rgba(59,130,246,0.4)]">M</div>
            <span className="font-semibold text-[#E4E4EB] text-[13px] group-hover:text-white transition-colors">MirEditor</span>
          </button>
          <div className="w-px h-5 bg-[#1E1E2A] mr-2" />

          {/* Menus — data-driven */}
          {([
            { id: 'dosya', label: 'Dosya', items: [
              { label: 'Proje Aç...', shortcut: 'Ctrl+O', action: () => projectInputRef.current?.click() },
              { label: 'Projeyi Kaydet', shortcut: 'Ctrl+S', action: saveProject },
              null,
              { label: 'Görüntü İçe Aktar...', action: () => fileInputRef.current?.click() },
              { label: 'Dışa Aktar...', action: () => setShowExportDialog(true) },
              null,
              { label: `Otomatik Kaydet (${autoSaveMinutes}dk)`, action: () => setAutoSaveEnabled(v => !v), check: autoSaveEnabled },
              null,
              { label: 'Kapat', action: onBack, danger: true },
            ]},
            { id: 'duzenle', label: 'Düzenle', items: [
              { label: 'Geri Al', shortcut: 'Ctrl+Z', action: undo },
              { label: 'Yinele', shortcut: 'Ctrl+Y', action: redo },
              null,
              { label: 'Tuval Boyutlandır...', action: () => setShowResizeDialog(true) },
            ]},
            { id: 'katman', label: 'Katman', items: [
              { label: 'Yeni Katman', shortcut: 'Ctrl+⇧N', action: addLayer },
              { label: 'Katmanı Sil', action: () => deleteLayer(activeLayerId) },
              null,
              { label: 'Yukarı Taşı', action: () => moveLayerUp(activeLayerId) },
              { label: 'Aşağı Taşı', action: () => moveLayerDown(activeLayerId) },
              null,
              { label: 'Tüm Katmanları Düzleştir', action: flattenLayers },
            ]},
            { id: 'secim', label: 'Seçim', items: [
              { label: 'Seçim Aracı', shortcut: 'V', action: () => setTool('select') },
              { label: 'Taşıma Aracı', shortcut: 'M', action: () => setTool('move') },
            ]},
            { id: 'filtre', label: 'Filtre', items: [
              { label: 'Siyah Beyaz', action: () => applyAICommand('siyah beyaz') },
              { label: 'Bulanıklaştır', action: () => applyAICommand('blur') },
              { label: 'Parlaklık Artır', action: () => applyAICommand('parlaklık') },
              { label: 'Kontrast Artır', action: () => applyAICommand('kontrast') },
              null,
              { label: 'Eğriler / Seviyeler...', action: () => setShowCurvesDialog(true) },
              null,
              { label: 'Arka Plan Sil', action: () => applyAICommand('arka plan') },
              { label: 'Filtreleri Sıfırla', action: resetFilters, danger: true },
            ]},
            { id: 'gorunum', label: 'Görünüm', items: [
              { label: 'Yakınlaştır', shortcut: 'Ctrl++', action: zoomIn },
              { label: 'Uzaklaştır', shortcut: 'Ctrl+-', action: zoomOut },
              { label: 'Gerçek Boyut (%100)', action: () => setZoom(100) },
              { label: 'Pencereye Sığdır', action: fitToWindow },
              null,
              { label: 'Kılavuz Çizgileri', action: () => setShowGrid(g => !g), check: showGrid },
              { label: 'Cetveller', action: () => setShowRulers(r => !r), check: showRulers },
              null,
              { label: 'Klavye Kısayolları...', action: () => setShowShortcutsDialog(true) },
            ]},
          ] as { id: string; label: string; items: ({ label: string; shortcut?: string; action: () => void; check?: boolean; danger?: boolean } | null)[] }[]).map(menu => (
            <div key={menu.id} className="relative" data-menu>
              <button
                onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${activeMenu === menu.id ? 'bg-white/10 text-white' : 'text-[#8888A0] hover:text-[#E4E4EB] hover:bg-white/5'}`}
              >{menu.label}</button>
              {activeMenu === menu.id && (
                <div className="absolute top-full left-0 mt-1.5 min-w-[210px] bg-[#18181F] border border-[#2A2A35] rounded-xl shadow-2xl py-1.5 z-[100]">
                  {menu.items.map((item, i) => item === null ? (
                    <div key={i} className="h-px bg-[#2A2A35] mx-2 my-1" />
                  ) : (
                    <button key={i} onClick={() => { item.action(); setActiveMenu(null); }}
                      className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between text-[11.5px] transition-colors ${item.danger ? 'text-[#f87171] hover:bg-red-500/10' : 'text-[#C8C8D8] hover:bg-[#3B82F6]/12 hover:text-white'}`}>
                      <div className="flex items-center gap-2">
                        {item.check !== undefined && (
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.check ? 'bg-[#3B82F6]' : 'border border-[#3A3A4A]'}`} />
                        )}
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && <kbd className="text-[10px] opacity-35 font-mono ml-4">{item.shortcut}</kbd>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Center: Project info */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 pointer-events-none">
          <span className="text-[11px] text-[#3A3A4A] font-mono tracking-tight">{canvasSize.w} × {canvasSize.h} px</span>
          {autoSaveEnabled && (
            <span className="text-[10px] bg-emerald-500/12 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">● Otomatik Kaydet</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <div className="flex items-center bg-white/4 rounded-lg p-0.5 border border-[#1E1E2A]">
            <button onClick={undo} title="Geri Al (Ctrl+Z)" className="p-1.5 rounded-md hover:bg-white/8 text-[#6060A0] hover:text-[#C8C8D8] transition-colors">
              <RotateCcw size={13} />
            </button>
            <button onClick={redo} title="Yinele (Ctrl+Y)" className="p-1.5 rounded-md hover:bg-white/8 text-[#6060A0] hover:text-[#C8C8D8] transition-colors">
              <RotateCw size={13} />
            </button>
          </div>

          <div className="w-px h-5 bg-[#1E1E2A] mx-1" />

          <button onClick={saveProject} title="Kaydet (Ctrl+S)" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#8888A0] hover:text-[#E4E4EB] text-[12px]">
            <Cloud size={13} className="text-[#3B82F6]" />
            <span>Kaydet</span>
          </button>

          <button onClick={() => setShowExportDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#6366F1] hover:opacity-90 active:scale-[0.97] transition-all text-white text-[12px] font-semibold shadow-[0_2px_12px_rgba(59,130,246,0.3)]">
            <Download size={13} />
            <span>Dışa Aktar</span>
          </button>

          <div className="w-px h-5 bg-[#1E1E2A] mx-1" />

          <button onClick={() => setShowMiraAI(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:opacity-90 active:scale-[0.97] transition-all text-white text-[12px] font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.25)]">
            <Sparkles size={13} />
            <span>Mira AI</span>
          </button>

          {/* User avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] p-px ml-1.5 cursor-pointer shrink-0" title={user?.username || 'Kullanıcı'}>
            <div className="w-full h-full bg-[#111118] rounded-full flex items-center justify-center text-white font-bold text-[10px]">{user?.username?.[0]?.toUpperCase() || 'M'}</div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT TOOLBAR ── */}
        <aside className="w-[52px] bg-[#111118] border-r border-[#1E1E2A] flex flex-col items-center py-2 gap-0.5 flex-shrink-0 z-20 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {toolConfig.map((t, i) => {
            const prevGroup = i > 0 ? toolConfig[i - 1].group : t.group;
            const showSep = i > 0 && prevGroup !== t.group;
            return (
              <React.Fragment key={t.id}>
                {showSep && <div className="w-7 h-px bg-[#1E1E2A] my-1.5 flex-shrink-0" />}
                <button
                  onClick={() => setTool(t.id as Tool)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 group relative flex-shrink-0
                    ${tool === t.id
                      ? 'bg-[#3B82F6]/20 text-[#60A5FA] shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_12px_rgba(59,130,246,0.12)]'
                      : 'text-[#4A4A5A] hover:text-[#C8C8D8] hover:bg-white/5'}`}
                >
                  {t.icon}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#18181F] border border-[#2A2A35] text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 flex items-center gap-2 shadow-xl pointer-events-none">
                    <span className="text-[#E4E4EB]">{t.label}</span>
                    <kbd className="text-[#8B5CF6] font-mono font-bold bg-[#0D0D12] px-1.5 py-0.5 rounded text-[10px]">{t.shortcut}</kbd>
                  </div>
                </button>
              </React.Fragment>
            );
          })}

          <div className="w-7 h-px bg-[#1E1E2A] my-1.5 flex-shrink-0" />

          {/* Color swatch */}
          <div className="relative group flex-shrink-0">
            <div
              className="w-9 h-9 rounded-xl border border-[#2A2A35] overflow-hidden cursor-pointer hover:border-[#3B82F6] transition-colors relative shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.4)]"
              style={{ backgroundColor: color }}
            >
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
            </div>
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#18181F] border border-[#2A2A35] text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap z-50 shadow-xl pointer-events-none">
              <span className="text-[#6060A0]">Renk: </span>
              <span className="font-mono text-[#60A5FA]">{color.toUpperCase()}</span>
            </div>
          </div>
        </aside>

        {/* ── CENTER ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: '#0A0A0F' }}>

          {/* Contextual Tool Bar */}
          {(tool === 'pen' || tool === 'eraser' || tool === 'rect' || tool === 'rect_fill' || tool === 'circle' || tool === 'circle_fill' || tool === 'line' || tool === 'text') && (
            <div className="h-10 bg-[#111118] border-b border-[#1E1E2A] flex items-center px-4 gap-4 flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.03)' }}>
              {tool !== 'text' && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold shrink-0">Boyut</span>
                  <input type="range" min="1" max="200" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-24 h-1 accent-[#3B82F6] rounded appearance-none outline-none" style={{ background: `linear-gradient(to right, #3B82F6 ${brushSize / 2}%, #1E1E2A ${brushSize / 2}%)` }} />
                  <input type="number" min={1} max={500} value={brushSize} onChange={e => setBrushSize(Math.max(1, Math.min(500, Number(e.target.value))))}
                    className="w-10 bg-[#18181F] border border-[#2A2A35] rounded-md text-center text-[#C8C8D8] text-[11px] outline-none focus:border-[#3B82F6] py-0.5 font-mono" />
                </div>
              )}
              {(tool === 'pen' || tool === 'eraser') && (
                <>
                  <div className="w-px h-4 bg-[#1E1E2A]" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold shrink-0">Opaklık</span>
                    <input type="range" min="1" max="100" value={brushOpacity} onChange={e => setBrushOpacity(Number(e.target.value))}
                      className="w-24 h-1 accent-[#3B82F6] rounded appearance-none outline-none" style={{ background: `linear-gradient(to right, #3B82F6 ${brushOpacity}%, #1E1E2A ${brushOpacity}%)` }} />
                    <span className="text-[11px] text-[#4A4A5A] font-mono w-8 text-right">{brushOpacity}%</span>
                  </div>
                  <div className="w-px h-4 bg-[#1E1E2A]" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold shrink-0">Sertlik</span>
                    <input type="range" min="0" max="100" value={brushHardness} onChange={e => setBrushHardness(Number(e.target.value))}
                      className="w-24 h-1 accent-[#3B82F6] rounded appearance-none outline-none" style={{ background: `linear-gradient(to right, #3B82F6 ${brushHardness}%, #1E1E2A ${brushHardness}%)` }} />
                    <span className="text-[11px] text-[#4A4A5A] font-mono w-8 text-right">{brushHardness}%</span>
                  </div>
                </>
              )}
              {tool === 'text' && (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold shrink-0">Yazı Tipi</span>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                      className="bg-[#18181F] border border-[#2A2A35] text-[#C8C8D8] rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-[#3B82F6]">
                      {['Plus Jakarta Sans','Arial','Georgia','Times New Roman','Courier New','Verdana','Impact'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`w-7 h-7 rounded-lg text-[12px] font-black transition-all border ${fontWeight === 'bold' ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#60A5FA]' : 'bg-[#18181F] border-[#2A2A35] text-[#4A4A5A] hover:text-[#C8C8D8]'}`}>B</button>
                    <button onClick={() => setFontItalic(v => !v)}
                      className={`w-7 h-7 rounded-lg text-[12px] italic font-serif transition-all border ${fontItalic ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#60A5FA]' : 'bg-[#18181F] border-[#2A2A35] text-[#4A4A5A] hover:text-[#C8C8D8]'}`}>I</button>
                  </div>
                  <div className="w-px h-4 bg-[#1E1E2A]" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold shrink-0">Boyut</span>
                    <input type="range" min="1" max="200" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}
                      className="w-24 h-1 accent-[#3B82F6] rounded appearance-none outline-none" style={{ background: `linear-gradient(to right, #3B82F6 ${brushSize / 2}%, #1E1E2A ${brushSize / 2}%)` }} />
                    <input type="number" min={1} max={500} value={brushSize} onChange={e => setBrushSize(Math.max(1, Math.min(500, Number(e.target.value))))}
                      className="w-10 bg-[#18181F] border border-[#2A2A35] rounded-md text-center text-[#C8C8D8] text-[11px] outline-none focus:border-[#3B82F6] py-0.5 font-mono" />
                  </div>
                </>
              )}
              {/* Current color swatch in contextual bar */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-[#3A3A4A] font-mono">{color.toUpperCase()}</span>
                <div className="w-6 h-6 rounded-lg border border-[#2A2A35] relative overflow-hidden cursor-pointer hover:border-[#3B82F6] transition-colors" style={{ background: color }}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          {/* Rulers */}
          {showRulers && (
            <div className="flex flex-shrink-0" style={{ height: '20px' }}>
              <div style={{ width: '20px', flexShrink: 0 }} className="bg-[#111118] border-r border-b border-[#1E1E2A]" />
              <canvas ref={rulerHRef} height={20} className="border-b border-[#1E1E2A]" style={{ flex: 1, background: '#111118' }} />
            </div>
          )}
          <div className="flex flex-1 overflow-hidden">
            {showRulers && (
              <canvas ref={rulerVRef} width={20} className="border-r border-[#1E1E2A] flex-shrink-0" style={{ background: '#111118' }} />
            )}
          <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center relative"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, #14141E 0%, #0A0A0F 70%)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
              const dataUrl = URL.createObjectURL(file);
              const img = new Image();
              img.onload = () => {
                imageCache.current[dataUrl] = img;
                const rect = canvasRef.current?.getBoundingClientRect();
                let posX = 0, posY = 0;
                if (rect) {
                    const scaleX = canvasSize.w / rect.width;
                    const scaleY = canvasSize.h / rect.height;
                    posX = (e.clientX - rect.left) * scaleX;
                    posY = (e.clientY - rect.top) * scaleY;
                }
                const fit = fitImageToCanvas(img.width, img.height, posX, posY);
                setFloatingImage({ url: dataUrl, ...fit });
              };
              img.src = dataUrl;
            }
          }}>
             <div className="relative overflow-hidden" style={{
               width: `${canvasSize.w * (zoom / 100)}px`,
               height: `${canvasSize.h * (zoom / 100)}px`,
               backgroundImage: 'conic-gradient(#1A1A24 90deg, #131320 90deg 180deg, #1A1A24 180deg 270deg, #131320 270deg)',
               backgroundSize: '20px 20px',
               boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 12px 60px rgba(0,0,0,0.95)',
               borderRadius: '2px',
               transition: 'width 0.15s ease, height 0.15s ease'
             }}>
                <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ imageRendering: zoom > 200 ? 'pixelated' : 'auto' }} />
                <canvas ref={draftCanvasRef} width={canvasSize.w} height={canvasSize.h} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="absolute top-0 left-0 w-full h-full" style={{ imageRendering: zoom > 200 ? 'pixelated' : 'auto', cursor: spaceHeld ? (isDrawing ? 'grabbing' : 'grab') : tool === 'hand' ? (isDrawing ? 'grabbing' : 'grab') : tool === 'move' ? (isDrawing ? 'grabbing' : 'move') : tool === 'select' ? 'crosshair' : tool === 'eyedropper' ? 'crosshair' : tool === 'fill' ? 'cell' : tool === 'text' ? 'text' : 'crosshair' }} />
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: `${32 * (zoom / 100)}px ${32 * (zoom / 100)}px` }} />
                )}
                
                {textInput && textInput.visible && (
                  <div className="absolute z-20" style={{ left: `${textInput.x * (zoom / 100)}px`, top: `${textInput.y * (zoom / 100)}px` }}>
                    <input
                      type="text"
                      autoFocus
                      value={textInput.value}
                      onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.stopPropagation(); commitTextStroke(); }
                        if (e.key === 'Escape') { e.stopPropagation(); setTextInput(null); }
                      }}
                      onBlur={commitTextStroke}
                      placeholder="Yazın…"
                      className="outline-none min-w-[120px] px-1"
                      style={{
                        color,
                        background: 'rgba(0,0,0,0.25)',
                        fontFamily: `'${fontFamily}', sans-serif`,
                        fontSize: `${brushSize * 5 * (zoom / 100)}px`,
                        fontWeight,
                        fontStyle: fontItalic ? 'italic' : 'normal',
                        lineHeight: 1,
                        borderBottom: '2px solid #4ea8de',
                        caretColor: color,
                        backdropFilter: 'blur(2px)',
                      }}
                    />
                    <div className="text-[9px] text-[#4ea8de] mt-0.5 select-none pointer-events-none whitespace-nowrap">Enter · Esc ile iptal</div>
                  </div>
                )}
                
                {floatingImage && (
                  <div className="absolute" style={{ left: `${floatingImage.x * (zoom / 100)}px`, top: `${floatingImage.y * (zoom / 100)}px`, width: `${floatingImage.w * (zoom / 100)}px`, height: `${floatingImage.h * (zoom / 100)}px`, zIndex: 50 }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ border: '2px solid #3B82F6', boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 24px rgba(59,130,246,0.15)' }} />
                    <img src={floatingImage.url} className="w-full h-full pointer-events-none select-none" style={{ display: 'block' }} />
                    <div className="absolute inset-0 cursor-move" onMouseDown={(e) => handleFloatingMouseDown(e)} />
                    {(['nw','ne','sw','se'] as const).map(corner => (
                      <div key={corner} onMouseDown={(e) => handleFloatingMouseDown(e, corner)}
                        className="absolute bg-white border-2 border-[#3B82F6] rounded-sm z-10 shadow-lg"
                        style={{
                          width: 10, height: 10,
                          top: corner.includes('n') ? -5 : undefined, bottom: corner.includes('s') ? -5 : undefined,
                          left: corner.includes('w') ? -5 : undefined, right: corner.includes('e') ? -5 : undefined,
                          cursor: `${corner}-resize`
                        }} />
                    ))}
                    {[
                      { pos: 'n', style: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', width: 18, height: 8 } },
                      { pos: 's', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', width: 18, height: 8 } },
                      { pos: 'w', style: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize', width: 8, height: 18 } },
                      { pos: 'e', style: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize', width: 8, height: 18 } },
                    ].map(({ pos, style }) => (
                      <div key={pos} onMouseDown={(e) => handleFloatingEdgeResize(e, pos)}
                        className="absolute bg-[#3B82F6]/50 border border-[#3B82F6] rounded-sm z-10"
                        style={style as React.CSSProperties} />
                    ))}
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-[#18181F] border border-[#2A2A35] rounded-xl shadow-2xl flex gap-1 p-1.5 whitespace-nowrap" style={{ zIndex: 60 }}>
                      <span className="text-[10px] text-[#4A4A5A] px-1 self-center font-mono">{Math.round(floatingImage.w)}×{Math.round(floatingImage.h)}</span>
                      <div className="w-px bg-[#2A2A35] mx-0.5" />
                      <button onClick={commitFloatingImage} className="px-2.5 py-1 bg-[#3B82F6]/15 text-[#60A5FA] text-[11px] rounded-lg hover:bg-[#3B82F6]/30 flex items-center gap-1 font-semibold transition-colors">
                        <Check size={11}/> Yerleştir
                      </button>
                      <button onClick={() => setFloatingImage(null)} className="px-2.5 py-1 bg-red-500/12 text-red-400 text-[11px] rounded-lg hover:bg-red-500/25 flex items-center gap-1 font-semibold transition-colors">
                        <X size={11}/> İptal
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
          </div>{/* end flex-1 flex row (rulers + canvas) */}

          {/* Bottom: zoom pill */}
          <div className="absolute bottom-5 left-5 bg-[#18181F]/90 border border-[#2A2A35] rounded-2xl h-9 px-3.5 flex items-center gap-2.5 z-10" style={{ backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <button onClick={zoomOut} className="text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors"><ZoomIn size={13} className="rotate-180" /></button>
            {isEditingZoom ? (
              <input
                type="number" autoFocus min={10} max={500}
                value={zoomInputStr}
                onChange={e => setZoomInputStr(e.target.value)}
                onBlur={() => { const v = parseInt(zoomInputStr); if (!isNaN(v)) setZoom(Math.max(10, Math.min(500, v))); setIsEditingZoom(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(zoomInputStr); if (!isNaN(v)) setZoom(Math.max(10, Math.min(500, v))); setIsEditingZoom(false); } if (e.key === 'Escape') setIsEditingZoom(false); }}
                className="text-[11px] font-mono text-white bg-[#111118] border border-[#3B82F6] rounded-lg px-1 text-center outline-none"
                style={{ width: '44px' }}
              />
            ) : (
              <span
                className="text-[11px] font-mono text-[#E4E4EB] min-w-[36px] text-center cursor-text hover:text-[#60A5FA] transition-colors font-semibold"
                title="Tıkla: zoom gir"
                onClick={() => { setZoomInputStr(String(zoom)); setIsEditingZoom(true); }}
              >{zoom}%</span>
            )}
            <button onClick={zoomIn} className="text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors"><ZoomIn size={13} /></button>
            <div className="w-px h-4 bg-[#2A2A35]" />
            <span className="text-[10px] text-[#2A2A3A] font-mono">{canvasSize.w}×{canvasSize.h}</span>
            <div className="w-px h-4 bg-[#2A2A35]" />
            <span className="text-[10px] text-[#2A2A3A] font-mono">X:{Math.round(cursorPos.x)} Y:{Math.round(cursorPos.y)}</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside className="w-[268px] bg-[#111118] border-l border-[#1E1E2A] flex flex-col flex-shrink-0 z-20 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-[#1E1E2A] flex-shrink-0 bg-[#0D0D12]">
            <button
              onClick={() => setRightPanelTab('props')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-all relative ${rightPanelTab === 'props' ? 'text-white bg-[#111118]' : 'text-[#3A3A4A] hover:text-[#8888A0]'}`}
            >
              Özellikler
              {rightPanelTab === 'props' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3B82F6] to-[#6366F1]" />}
            </button>
            <button
              onClick={() => setRightPanelTab('layers')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-all relative ${rightPanelTab === 'layers' ? 'text-white bg-[#111118]' : 'text-[#3A3A4A] hover:text-[#8888A0]'}`}
            >
              <span>Katmanlar</span>
              <span className="ml-1.5 text-[9px] bg-[#1E1E2A] text-[#3A3A4A] px-1.5 py-0.5 rounded-full tabular-nums">{layers.length}</span>
              {rightPanelTab === 'layers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3B82F6] to-[#6366F1]" />}
            </button>
          </div>

          {/* ── PROPERTIES TAB ── */}
          {rightPanelTab === 'props' && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {/* Tool badge */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1E1E2A]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                <span className="text-[10px] font-bold text-[#3A3A4A] uppercase tracking-widest">
                  {tool === 'pen' ? 'Fırça' : tool === 'eraser' ? 'Silgi' : tool === 'rect' ? 'Dikdörtgen' : tool === 'rect_fill' ? 'Dikdörtgen Dolu' : tool === 'circle' ? 'Daire' : tool === 'circle_fill' ? 'Daire Dolu' : tool === 'line' ? 'Çizgi' : tool === 'text' ? 'Metin' : tool === 'fill' ? 'Doldur' : tool === 'eyedropper' ? 'Renk Seçici' : tool === 'crop' ? 'Kırpma' : tool === 'hand' ? 'El Aracı' : tool === 'select' ? 'Seçim' : 'Taşıma'}
                </span>
              </div>

              <div className="p-3 space-y-4">
                {/* Color */}
                <div>
                  <label className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold block mb-2.5">Renk</label>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#2A2A35] hover:border-[#3B82F6] transition-colors cursor-pointer flex-shrink-0 shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.4)]" style={{ background: color }}>
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                    </div>
                    <div className="flex-1 bg-[#18181F] border border-[#2A2A35] rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] font-mono text-[#C8C8D8] uppercase">{color}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-0.5">
                    {presetColors.map(c => (
                      <button key={c} onClick={() => setColor(c)} title={c}
                        className="aspect-square rounded-sm border-2 transition-transform hover:scale-125 active:scale-110"
                        style={{ backgroundColor: c, borderColor: color === c ? '#3B82F6' : 'transparent' }} />
                    ))}
                  </div>
                </div>

                {/* Size */}
                {tool !== 'fill' && tool !== 'eyedropper' && tool !== 'hand' && tool !== 'move' && tool !== 'select' && tool !== 'crop' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold">Boyut</label>
                      <input type="number" min={1} max={500} value={brushSize} onChange={e => setBrushSize(Math.max(1, Math.min(500, Number(e.target.value))))}
                        className="w-12 bg-[#18181F] border border-[#2A2A35] rounded-md text-center text-[#C8C8D8] text-[11px] outline-none focus:border-[#3B82F6] py-0.5 font-mono" />
                    </div>
                    <input type="range" min="1" max="200" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}
                      className="w-full h-1 accent-[#3B82F6] rounded appearance-none outline-none"
                      style={{ background: `linear-gradient(to right, #3B82F6 ${brushSize / 2}%, #1E1E2A ${brushSize / 2}%)` }} />
                  </div>
                )}

                {/* Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold">Opaklık</label>
                    <span className="text-[11px] text-[#6060A0] font-mono">{brushOpacity}%</span>
                  </div>
                  <input type="range" min="1" max="100" value={brushOpacity} onChange={e => setBrushOpacity(Number(e.target.value))}
                    className="w-full h-1 accent-[#3B82F6] rounded appearance-none outline-none"
                    style={{ background: `linear-gradient(to right, #3B82F6 ${brushOpacity}%, #1E1E2A ${brushOpacity}%)` }} />
                </div>

                {/* Hardness */}
                {(tool === 'pen' || tool === 'eraser') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold">Sertlik</label>
                      <span className="text-[11px] text-[#6060A0] font-mono">{brushHardness}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={brushHardness} onChange={e => setBrushHardness(Number(e.target.value))}
                      className="w-full h-1 accent-[#3B82F6] rounded appearance-none outline-none"
                      style={{ background: `linear-gradient(to right, #3B82F6 ${brushHardness}%, #1E1E2A ${brushHardness}%)` }} />
                  </div>
                )}

                {/* Text options */}
                {tool === 'text' && (
                  <div>
                    <label className="text-[10px] text-[#3A3A4A] uppercase tracking-widest font-bold block mb-2.5">Yazı Tipi</label>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                      className="w-full bg-[#18181F] border border-[#2A2A35] text-[#C8C8D8] rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:border-[#3B82F6] mb-2.5">
                      {['Plus Jakarta Sans','Arial','Georgia','Times New Roman','Courier New','Verdana','Impact','Comic Sans MS'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] font-black transition-all border ${fontWeight === 'bold' ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#60A5FA]' : 'bg-[#18181F] border-[#2A2A35] text-[#4A4A5A] hover:text-[#C8C8D8]'}`}>B</button>
                      <button onClick={() => setFontItalic(v => !v)}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] italic font-serif transition-all border ${fontItalic ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#60A5FA]' : 'bg-[#18181F] border-[#2A2A35] text-[#4A4A5A] hover:text-[#C8C8D8]'}`}>I</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LAYERS TAB ── */}
          {rightPanelTab === 'layers' && (
            <div className="flex flex-col flex-1 min-h-0">

              {/* Blend + Opacity */}
              <div className="px-3 py-2.5 border-b border-[#1E1E2A] space-y-2 flex-shrink-0">
                <div className="flex gap-2">
                  <select value={activeLayer?.blendMode || 'source-over'} onChange={e => updateLayerBlendMode(activeLayerId, e.target.value)}
                    className="flex-1 bg-[#18181F] border border-[#2A2A35] text-[#C8C8D8] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#3B82F6]">
                    <option value="source-over">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                    <option value="darken">Darken</option>
                    <option value="lighten">Lighten</option>
                    <option value="color-dodge">Color Dodge</option>
                    <option value="color-burn">Color Burn</option>
                    <option value="soft-light">Soft Light</option>
                    <option value="hard-light">Hard Light</option>
                    <option value="difference">Difference</option>
                    <option value="exclusion">Exclusion</option>
                    <option value="hue">Hue</option>
                    <option value="saturation">Saturation</option>
                    <option value="color">Color</option>
                    <option value="luminosity">Luminosity</option>
                  </select>
                  <div className="flex items-center gap-1 bg-[#18181F] border border-[#2A2A35] rounded-lg px-2 py-1 w-[58px]">
                    <input type="number" min={0} max={100} value={activeLayer?.opacity ?? 100}
                      onChange={e => updateLayerOpacity(activeLayerId, Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-8 bg-transparent text-[#C8C8D8] text-[11px] outline-none text-center font-mono" />
                    <span className="text-[10px] text-[#3A3A4A]">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={activeLayer?.opacity ?? 100}
                  onChange={e => updateLayerOpacity(activeLayerId, Number(e.target.value))}
                  className="w-full h-1 accent-[#3B82F6] rounded appearance-none outline-none"
                  style={{ background: `linear-gradient(to right, #3B82F6 ${activeLayer?.opacity ?? 100}%, #1E1E2A ${activeLayer?.opacity ?? 100}%)` }} />
              </div>

              {/* Layer actions */}
              <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-[#1E1E2A] flex-shrink-0">
                <button onClick={addLayer} title="Yeni Katman (Ctrl+Shift+N)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E1E2A] hover:bg-[#3B82F6]/15 text-[#4A4A5A] hover:text-[#60A5FA] text-[11px] transition-colors font-medium">
                  <Plus size={12} /> Yeni
                </button>
                <button onClick={() => deleteLayer(activeLayerId)} disabled={activeLayer?.locked}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors font-medium ${activeLayer?.locked ? 'bg-[#1E1E2A] text-[#2A2A3A] cursor-not-allowed' : 'bg-[#1E1E2A] hover:bg-red-500/12 text-[#4A4A5A] hover:text-red-400'}`}>
                  <Trash2 size={11} /> Sil
                </button>
                <div className="flex-1" />
                <button onClick={() => moveLayerUp(activeLayerId)} title="Yukarı" className="p-1.5 rounded-lg hover:bg-white/5 text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors">
                  <ArrowDown size={12} className="rotate-180" />
                </button>
                <button onClick={() => moveLayerDown(activeLayerId)} title="Aşağı" className="p-1.5 rounded-lg hover:bg-white/5 text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors">
                  <ArrowDown size={12} />
                </button>
              </div>

              {/* Layer list */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-[#0D0D12]" style={{ scrollbarWidth: 'thin' }}>
                {[...layers].reverse().map((layer, idx, arr) => {
                  const origIdx = arr.length - 1 - idx;
                  const isActive = activeLayerId === layer.id;
                  const isDragOver = dragOverIndex === origIdx;
                  return (
                    <div key={layer.id} draggable
                      onDragStart={e => handleDragStart(e, origIdx)}
                      onDragOver={e => handleDragOver(e, origIdx)}
                      onDrop={e => handleDrop(e, origIdx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`group flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none border-b border-[#111118] transition-all duration-100
                        ${isActive ? 'bg-[#3B82F6]/10 border-l-2 border-l-[#3B82F6]' : 'hover:bg-white/3 border-l-2 border-l-transparent'}
                        ${isDragOver ? 'border-t-2 border-t-[#3B82F6]' : ''}`}>
                      <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                        className={`shrink-0 transition-colors ${layer.visible ? 'text-[#4A4A5A] hover:text-[#C8C8D8]' : 'text-[#1E1E2A] hover:text-[#3A3A4A]'}`}>
                        <Eye size={13} />
                      </button>
                      <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden border border-[#1E1E2A] flex-shrink-0"
                        style={{ background: 'repeating-conic-gradient(#1A1A24 0% 25%, #131320 0% 50%) 0 0 / 8px 8px' }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[8px] font-black text-[#3A3A4A] tracking-tight">{layer.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                      </div>
                      <span className={`flex-1 truncate text-[11px] ${isActive ? 'text-[#E4E4EB] font-semibold' : 'text-[#4A4A5A]'}`}>{layer.name}</span>
                      {layer.strokes.length > 0 && (
                        <span className="text-[9px] text-[#2A2A3A] font-mono tabular-nums shrink-0">{layer.strokes.length}</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                        title={layer.locked ? 'Kilidi Aç' : 'Kilitle'}
                        className={`shrink-0 transition-colors ${layer.locked ? 'text-[#3B82F6]' : 'text-[#1E1E2A] group-hover:text-[#3A3A4A]'}`}>
                        <Lock size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* History strip */}
              <div className="border-t border-[#1E1E2A] flex-shrink-0">
                <div className="flex items-center px-3 py-1.5 border-b border-[#1E1E2A]">
                  <span className="text-[10px] font-bold text-[#2A2A3A] uppercase tracking-widest flex-1">Geçmiş</span>
                  <button onClick={undo} title="Geri Al" className="w-6 h-6 flex items-center justify-center text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors rounded-md hover:bg-white/5"><RotateCcw size={11} /></button>
                  <button onClick={redo} title="Yinele" className="w-6 h-6 flex items-center justify-center text-[#3A3A4A] hover:text-[#C8C8D8] transition-colors rounded-md hover:bg-white/5"><RotateCw size={11} /></button>
                </div>
                <div className="overflow-y-auto bg-[#0A0A0F]" style={{ maxHeight: '80px', scrollbarWidth: 'none' }}>
                  {activeLayer?.strokes.slice(-8).reverse().map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1 text-[10px] text-[#2A2A3A] hover:bg-white/2 transition-colors">
                      <div className="w-1 h-1 rounded-full bg-[#3B82F6]/40 shrink-0" />
                      <span className="truncate">{s.tool === 'pen' ? 'Fırça' : s.tool === 'eraser' ? 'Silgi' : s.tool === 'fill' ? 'Dolgu' : s.tool === 'rect' ? 'Dikdörtgen' : s.tool === 'circle' ? 'Daire' : s.tool === 'text' ? 'Metin' : s.tool === 'line' ? 'Çizgi' : s.tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
      
      {showShortcutsDialog && <ShortcutsModal onClose={() => setShowShortcutsDialog(false)} />}
      {showCurvesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181F] border border-[#2A2A35] rounded-2xl shadow-2xl w-[420px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2A2A35] bg-[#111118] flex justify-between items-center">
              <h2 className="text-white font-semibold text-sm">Eğriler / Seviyeler</h2>
              <button onClick={() => setShowCurvesDialog(false)} className="text-[#4A4A5A] hover:text-white transition-colors"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Channel selector */}
              <div>
                <label className="text-[11px] text-[#888] uppercase tracking-wide block mb-1">Kanal</label>
                <div className="flex gap-2">
                  {(['rgb','r','g','b'] as const).map(ch => (
                    <button key={ch} onClick={() => setCurvesSettings(s => ({ ...s, channel: ch }))}
                      className={`flex-1 py-1.5 rounded text-[11px] font-bold uppercase transition-colors border ${curvesSettings.channel === ch ? 'bg-[#3788D8] border-[#3788D8] text-white' : 'bg-[#1E1E1E] border-[#3F3F46] text-[#888] hover:text-white'}`}>
                      {ch === 'rgb' ? 'RGB' : ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {/* Input levels */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-[#888] uppercase tracking-wide">Giriş Siyah</label>
                  <span className="text-[11px] text-white font-mono">{curvesSettings.inBlack}</span>
                </div>
                <input type="range" min={0} max={254} value={curvesSettings.inBlack}
                  onChange={e => setCurvesSettings(s => ({ ...s, inBlack: Number(e.target.value) }))}
                  className="w-full h-1.5 accent-[#3788D8] bg-[#111] rounded appearance-none outline-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-[#888] uppercase tracking-wide">Giriş Beyaz</label>
                  <span className="text-[11px] text-white font-mono">{curvesSettings.inWhite}</span>
                </div>
                <input type="range" min={1} max={255} value={curvesSettings.inWhite}
                  onChange={e => setCurvesSettings(s => ({ ...s, inWhite: Number(e.target.value) }))}
                  className="w-full h-1.5 accent-[#fff] bg-[#555] rounded appearance-none outline-none" />
              </div>
              {/* Gamma / Midtones */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-[#888] uppercase tracking-wide">Orta Tonlar (Gamma)</label>
                  <span className="text-[11px] text-white font-mono">{curvesSettings.gamma.toFixed(2)}</span>
                </div>
                <input type="range" min={10} max={300} value={Math.round(curvesSettings.gamma * 100)}
                  onChange={e => setCurvesSettings(s => ({ ...s, gamma: Number(e.target.value) / 100 }))}
                  className="w-full h-1.5 accent-[#8B5CF6] bg-[#333] rounded appearance-none outline-none" />
              </div>
              {/* Output levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-[#888]">Çıkış Siyah</label>
                    <span className="text-[11px] text-white font-mono">{curvesSettings.outBlack}</span>
                  </div>
                  <input type="range" min={0} max={254} value={curvesSettings.outBlack}
                    onChange={e => setCurvesSettings(s => ({ ...s, outBlack: Number(e.target.value) }))}
                    className="w-full h-1.5 accent-[#3788D8] bg-[#111] rounded appearance-none outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-[#888]">Çıkış Beyaz</label>
                    <span className="text-[11px] text-white font-mono">{curvesSettings.outWhite}</span>
                  </div>
                  <input type="range" min={1} max={255} value={curvesSettings.outWhite}
                    onChange={e => setCurvesSettings(s => ({ ...s, outWhite: Number(e.target.value) }))}
                    className="w-full h-1.5 accent-[#fff] bg-[#555] rounded appearance-none outline-none" />
                </div>
              </div>
              {/* Preview bar */}
              <div className="h-5 rounded overflow-hidden" style={{
                background: `linear-gradient(to right, rgb(${curvesSettings.outBlack},${curvesSettings.outBlack},${curvesSettings.outBlack}), rgb(${curvesSettings.outWhite},${curvesSettings.outWhite},${curvesSettings.outWhite}))`
              }} />
            </div>
            <div className="p-4 bg-[#1E1E1E] border-t border-[#3F3F46] flex justify-between items-center">
              <button onClick={() => setCurvesSettings({ channel: 'rgb', inBlack: 0, inWhite: 255, gamma: 1.0, outBlack: 0, outWhite: 255 })}
                className="text-[#888] hover:text-white text-xs transition-colors">Sıfırla</button>
              <div className="flex gap-2">
                <button onClick={() => setShowCurvesDialog(false)} className="px-4 py-2 rounded-md hover:bg-[#3A3A3A] text-white text-sm transition-colors">İptal</button>
                <button onClick={applyCurves} className="px-4 py-2 rounded-md bg-[#3788D8] hover:bg-[#2A75C5] text-white text-sm font-medium transition-colors shadow-lg">Uygula</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showMiraAI && (
        <MiraAIModal
          onClose={() => setShowMiraAI(false)}
          onCommand={(cmd) => {
            setAiChat(prev => [...prev, { sender: 'user', text: MIRA_QUICK_CMDS.find(q => q.cmd === cmd)?.label || cmd }]);
            setIsAiProcessing(true);
            setTimeout(() => {
              const success = applyAICommand(cmd);
              setAiChat(prev => [...prev, { sender: 'mira', text: success ? '✨ Tamamlandı! Sonuç yeni bir katman olarak eklendi. Başka ne yapabilirim?' : 'Bu komutu anlayamadım, tekrar deneyin.' }]);
              setIsAiProcessing(false);
            }, 900);
          }}
          chat={aiChat}
          input={aiInput}
          setInput={setAiInput}
          isProcessing={isAiProcessing}
          onSubmit={handleAiSubmit}
        />
      )}
      {showExportDialog && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-[#18181F] border border-[#2A2A35] rounded-2xl shadow-2xl w-[400px] overflow-hidden">
             <div className="px-6 py-4 border-b border-[#2A2A35] bg-[#111118] flex justify-between items-center">
               <h2 className="text-white font-semibold">Dışa Aktar</h2>
               <button onClick={() => setShowExportDialog(false)} className="text-[#4A4A5A] hover:text-white transition-colors"><X size={18}/></button>
             </div>
             <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] text-[#888] uppercase tracking-wide">Format</label>
                  <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="w-full mt-1 bg-[#1E1E1E] border border-[#3F3F46] rounded-md p-2 text-white outline-none focus:border-[#3788D8]">
                    <option value="png">PNG (Şeffaf)</option>
                    <option value="jpeg">JPEG (Yüksek Kalite)</option>
                    <option value="webp">WebP (Sıkıştırılmış)</option>
                    <option value="gef">MirEditor Projesi (.gef)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#888] uppercase tracking-wide">Kalite: {exportQuality}%</label>
                  <input type="range" min="1" max="100" value={exportQuality} onChange={e => setExportQuality(Number(e.target.value))} className="w-full h-1.5 bg-[#1E1E1E] rounded-full appearance-none outline-none accent-[#3788D8] mt-2" />
                </div>
             </div>
             <div className="p-4 bg-[#1E1E1E] border-t border-[#3F3F46] flex justify-end gap-2">
                <button onClick={() => setShowExportDialog(false)} className="px-4 py-2 rounded-md hover:bg-[#3A3A3A] text-white text-sm transition-colors">İptal</button>
                <button onClick={doExport} className="px-4 py-2 rounded-md bg-[#3788D8] hover:bg-[#2A75C5] text-white text-sm font-medium transition-colors shadow-lg">Dışa Aktar</button>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
