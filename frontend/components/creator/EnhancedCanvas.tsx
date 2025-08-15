'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Image, Text, Rect, Circle, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import { motion } from 'framer-motion';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Move,
  Square,
  Circle as CircleIcon,
  Type,
  Brush,
  Eraser,
  Download,
  Upload,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Palette
} from 'lucide-react';
import useImage from 'use-image';

interface CanvasLayer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape' | 'drawing';
  visible: boolean;
  locked: boolean;
  opacity: number;
  data: any;
  zIndex: number;
  blendMode?: string;
}

interface EnhancedCanvasProps {
  width?: number;
  height?: number;
  onExport?: (dataUrl: string) => void;
}

export default function EnhancedCanvas({
  width = 800,
  height = 600,
  onExport
}: EnhancedCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [history, setHistory] = useState<CanvasLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<number[]>([]);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [textInput, setTextInput] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);

  const tools = [
    { id: 'select', icon: Move, name: 'Select' },
    { id: 'text', icon: Type, name: 'Text' },
    { id: 'rectangle', icon: Square, name: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, name: 'Circle' },
    { id: 'brush', icon: Brush, name: 'Brush' },
    { id: 'eraser', icon: Eraser, name: 'Eraser' }
  ];

  // Add layer
  const addLayer = useCallback((type: CanvasLayer['type'], data: any) => {
    const newLayer: CanvasLayer = {
      id: `layer-${Date.now()}`,
      name: `${type} Layer ${layers.length + 1}`,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      data,
      zIndex: layers.length
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    saveToHistory();
  }, [layers]);

  // Remove layer
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    saveToHistory();
  }, [selectedLayerId]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
    ));
  }, []);

  // Duplicate layer
  const duplicateLayer = useCallback((layerId: string) => {
    const layerToDuplicate = layers.find(l => l.id === layerId);
    if (layerToDuplicate) {
      const newLayer: CanvasLayer = {
        ...layerToDuplicate,
        id: `layer-${Date.now()}`,
        name: `${layerToDuplicate.name} Copy`,
        zIndex: layers.length
      };
      setLayers(prev => [...prev, newLayer]);
      saveToHistory();
    }
  }, [layers]);

  // Move layer order
  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index === -1) return prev;
      
      const newLayers = [...prev];
      const targetIndex = direction === 'up' ? index + 1 : index - 1;
      
      if (targetIndex >= 0 && targetIndex < newLayers.length) {
        [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
        
        // Update z-indexes
        newLayers.forEach((layer, i) => {
          layer.zIndex = i;
        });
      }
      
      return newLayers;
    });
    saveToHistory();
  }, []);

  // History management
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(layers)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [layers, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setLayers(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setLayers(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [historyIndex, history]);

  // Handle tool actions
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    switch (selectedTool) {
      case 'text':
        setShowTextModal(true);
        break;
      case 'rectangle':
        addLayer('shape', {
          type: 'rectangle',
          x: pointerPosition.x,
          y: pointerPosition.y,
          width: 100,
          height: 100,
          fill: brushColor,
          stroke: '#000000',
          strokeWidth: 2
        });
        break;
      case 'circle':
        addLayer('shape', {
          type: 'circle',
          x: pointerPosition.x,
          y: pointerPosition.y,
          radius: 50,
          fill: brushColor,
          stroke: '#000000',
          strokeWidth: 2
        });
        break;
    }
  }, [selectedTool, brushColor, addLayer]);

  // Drawing functionality
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectedTool !== 'brush' && selectedTool !== 'eraser') return;
    
    setIsDrawing(true);
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (pos) {
      setDrawingPath([pos.x, pos.y]);
    }
  }, [selectedTool]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (pos) {
      setDrawingPath(prev => [...prev, pos.x, pos.y]);
    }
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    if (drawingPath.length > 2) {
      addLayer('drawing', {
        points: drawingPath,
        stroke: selectedTool === 'eraser' ? '#FFFFFF' : brushColor,
        strokeWidth: brushSize,
        globalCompositeOperation: selectedTool === 'eraser' ? 'destination-out' : 'source-over'
      });
    }
    setDrawingPath([]);
  }, [isDrawing, drawingPath, selectedTool, brushColor, brushSize, addLayer]);

  // Export canvas
  const exportCanvas = useCallback(() => {
    const stage = stageRef.current;
    if (stage) {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      if (onExport) {
        onExport(dataUrl);
      } else {
        // Download the image
        const link = document.createElement('a');
        link.download = 'canvas-export.png';
        link.href = dataUrl;
        link.click();
      }
    }
  }, [onExport]);

  // Add text layer
  const addTextLayer = useCallback(() => {
    if (textInput.trim()) {
      addLayer('text', {
        text: textInput,
        x: width / 2,
        y: height / 2,
        fontSize: 24,
        fontFamily: 'Arial',
        fill: brushColor,
        align: 'center'
      });
      setTextInput('');
      setShowTextModal(false);
    }
  }, [textInput, width, height, brushColor, addLayer]);

  return (
    <div className="flex gap-4">
      {/* Toolbar */}
      <div className="w-16 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2">
        <div className="space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`
                  w-full aspect-square rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${selectedTool === tool.id
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400/50'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }
                  border backdrop-blur-xl group
                `}
                title={tool.name}
              >
                <Icon className="w-5 h-5 text-white" />
              </button>
            );
          })}
          
          <div className="h-px bg-white/10 my-2" />
          
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
            className="w-full aspect-square rounded-xl bg-white/5 hover:bg-white/10 
                     border border-white/10 flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom * 0.8, 0.3))}
            className="w-full aspect-square rounded-xl bg-white/5 hover:bg-white/10 
                     border border-white/10 flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-full aspect-square rounded-xl bg-white/5 hover:bg-white/10 
                     border border-white/10 flex items-center justify-center"
            title="Reset Zoom"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
          
          <div className="h-px bg-white/10 my-2" />
          
          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`
              w-full aspect-square rounded-xl flex items-center justify-center
              transition-all duration-200
              ${showGrid
                ? 'bg-purple-500/30 border-purple-400/50'
                : 'bg-white/5 hover:bg-white/10 border-white/10'
              }
              border
            `}
            title="Toggle Grid"
          >
            <Grid className="w-5 h-5 text-white" />
          </button>
          
          <div className="h-px bg-white/10 my-2" />
          
          {/* History controls */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="w-full aspect-square rounded-xl bg-white/5 hover:bg-white/10 
                     border border-white/10 flex items-center justify-center
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="w-full aspect-square rounded-xl bg-white/5 hover:bg-white/10 
                     border border-white/10 flex items-center justify-center
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-5 h-5 text-white" />
          </button>
          
          <div className="h-px bg-white/10 my-2" />
          
          {/* Export */}
          <button
            onClick={exportCanvas}
            className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30
                     border border-purple-400/50 flex items-center justify-center"
            title="Export"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={zoom}
          scaleY={zoom}
          onClick={handleStageClick}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          className="cursor-crosshair"
        >
          {/* Grid Layer */}
          {showGrid && (
            <Layer>
              {Array.from({ length: Math.ceil(width / 50) }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * 50, 0, i * 50, height]}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.ceil(height / 50) }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * 50, width, i * 50]}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
              ))}
            </Layer>
          )}
          
          {/* Content Layers */}
          <Layer>
            {layers
              .filter(layer => layer.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((layer) => {
                switch (layer.type) {
                  case 'shape':
                    if (layer.data.type === 'rectangle') {
                      return (
                        <Rect
                          key={layer.id}
                          {...layer.data}
                          opacity={layer.opacity}
                          draggable={!layer.locked}
                          onClick={() => setSelectedLayerId(layer.id)}
                        />
                      );
                    } else if (layer.data.type === 'circle') {
                      return (
                        <Circle
                          key={layer.id}
                          {...layer.data}
                          opacity={layer.opacity}
                          draggable={!layer.locked}
                          onClick={() => setSelectedLayerId(layer.id)}
                        />
                      );
                    }
                    break;
                  case 'text':
                    return (
                      <Text
                        key={layer.id}
                        {...layer.data}
                        opacity={layer.opacity}
                        draggable={!layer.locked}
                        onClick={() => setSelectedLayerId(layer.id)}
                      />
                    );
                  case 'drawing':
                    return (
                      <Line
                        key={layer.id}
                        {...layer.data}
                        opacity={layer.opacity}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                }
                return null;
              })}
            
            {/* Active drawing path */}
            {isDrawing && drawingPath.length > 0 && (
              <Line
                points={drawingPath}
                stroke={selectedTool === 'eraser' ? '#FFFFFF' : brushColor}
                strokeWidth={brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={selectedTool === 'eraser' ? 'destination-out' : 'source-over'}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Layers Panel */}
      <div className="w-64 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </h3>
          <span className="text-xs text-white/60">{layers.length}</span>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {layers
            .sort((a, b) => b.zIndex - a.zIndex)
            .map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`
                  p-3 rounded-lg transition-all cursor-pointer
                  ${selectedLayerId === layer.id
                    ? 'bg-purple-500/20 border-purple-400/50'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }
                  border backdrop-blur-xl
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white truncate flex-1">
                    {layer.name}
                  </span>
                  <span className="text-xs text-white/40 capitalize">
                    {layer.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-3 h-3 text-white/60" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-white/30" />
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layer.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-white/60" />
                    ) : (
                      <Unlock className="w-3 h-3 text-white/30" />
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <Copy className="w-3 h-3 text-white/60" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(layer.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
                
                {/* Opacity slider */}
                <div className="mt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) => {
                      const newOpacity = parseInt(e.target.value) / 100;
                      setLayers(prev => prev.map(l =>
                        l.id === layer.id ? { ...l, opacity: newOpacity } : l
                      ));
                    }}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ))}
        </div>
        
        {/* Brush Settings */}
        {(selectedTool === 'brush' || selectedTool === 'eraser') && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-xs font-medium text-white/60 mb-2">Brush Settings</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40">Size: {brushSize}px</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {selectedTool === 'brush' && (
                <div>
                  <label className="text-xs text-white/40">Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-8 h-8 rounded border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 
                               text-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Text Input Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/20 p-6 w-96"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text..."
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 
                       text-white placeholder-white/40 backdrop-blur-xl
                       focus:outline-none focus:border-purple-400/50"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={addTextLayer}
                className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 
                         text-white font-medium"
              >
                Add Text
              </button>
              <button
                onClick={() => {
                  setShowTextModal(false);
                  setTextInput('');
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-white/10 
                         text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}