import { useRef, useState, useEffect, useCallback } from 'react';
import { GameNode, Connection, NodeType, NODE_TYPE_CONFIG, NODE_TYPES, NODE_WIDTH, NODE_HEIGHT } from '@/types/graph';
import CanvasNode from './CanvasNode';

interface Props {
  nodes: GameNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onAddConnection: (fromId: string, toId: string) => void;
  onInsertBetween: (connectionId: string, type: NodeType) => void;
}

const NODE_COLOR_HEX: Record<string, string> = {
  action: '#f59e0b',
  item: '#10b981',
  character: '#0ea5e9',
  goal: '#ef4444',
  location: '#8b5cf6',
};

export default function PuzzleCanvas({ nodes, connections, selectedNodeId, onSelectNode, onMoveNode, onAddConnection, onInsertBetween }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mouseCanvas, setMouseCanvas] = useState({ x: 0, y: 0 });
  const [insertMenu, setInsertMenu] = useState<{ connectionId: string; x: number; y: number } | null>(null);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (sx - rect.left - pan.x) / zoom, y: (sy - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom(z => Math.min(2.5, Math.max(0.2, z * factor)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setConnecting(null); setInsertMenu(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
    onSelectNode(null);
    setInsertMenu(null);
    setConnecting(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const cp = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvas(cp);

    if (panning) {
      setPan({ x: panning.px + (e.clientX - panning.sx), y: panning.py + (e.clientY - panning.sy) });
    }
    if (dragging) {
      onMoveNode(dragging.nodeId, cp.x - dragging.ox, cp.y - dragging.oy);
    }
  };

  const handleMouseUp = () => {
    setPanning(null);
    if (dragging) setDragging(null);
    if (connecting) setConnecting(null); // cancel if not dropped on port
  };

  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    const cp = screenToCanvas(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDragging({ nodeId: id, ox: cp.x - node.x, oy: cp.y - node.y });
    onSelectNode(id);
    setInsertMenu(null);
  };

  const handleOutputPortMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnecting(id);
  };

  const handleInputPortMouseUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connecting && connecting !== id) {
      onAddConnection(connecting, id);
    }
    setConnecting(null);
    setDragging(null);
    setPanning(null);
  };

  // Connection path
  const getPath = (from: GameNode, to: GameNode) => {
    const fx = from.x + NODE_WIDTH / 2;
    const fy = from.y + NODE_HEIGHT;
    const tx = to.x + NODE_WIDTH / 2;
    const ty = to.y;
    const dy = Math.abs(ty - fy) * 0.4 + 30;
    return `M ${fx} ${fy} C ${fx} ${fy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
  };

  const getMidpoint = (from: GameNode, to: GameNode) => ({
    x: (from.x + to.x) / 2 + NODE_WIDTH / 2,
    y: (from.y + NODE_HEIGHT + to.y) / 2,
  });

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden canvas-grid relative ${connecting ? 'cursor-crosshair' : panning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="absolute inset-0">
        {/* SVG connections */}
        <svg className="absolute" style={{ left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(215, 12%, 50%)" />
            </marker>
          </defs>
          {connections.map(conn => {
            const from = nodes.find(n => n.id === conn.fromId);
            const to = nodes.find(n => n.id === conn.toId);
            if (!from || !to) return null;
            return (
              <path
                key={conn.id}
                d={getPath(from, to)}
                fill="none"
                stroke="hsl(215, 12%, 40%)"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            );
          })}
          {/* Temp connecting line */}
          {connecting && (() => {
            const from = nodes.find(n => n.id === connecting);
            if (!from) return null;
            const fx = from.x + NODE_WIDTH / 2;
            const fy = from.y + NODE_HEIGHT;
            const dy = Math.abs(mouseCanvas.y - fy) * 0.4 + 30;
            return (
              <path
                d={`M ${fx} ${fy} C ${fx} ${fy + dy}, ${mouseCanvas.x} ${mouseCanvas.y - dy}, ${mouseCanvas.x} ${mouseCanvas.y}`}
                fill="none"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.7}
              />
            );
          })()}
        </svg>

        {/* Insert "+" buttons at connection midpoints */}
        {connections.map(conn => {
          const from = nodes.find(n => n.id === conn.fromId);
          const to = nodes.find(n => n.id === conn.toId);
          if (!from || !to) return null;
          const mid = getMidpoint(from, to);
          return (
            <button
              key={`ins-${conn.id}`}
              className="absolute w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-primary hover:border-primary text-xs flex items-center justify-center transition-all hover:scale-125 z-20"
              style={{ left: mid.x - 10, top: mid.y - 10 }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setInsertMenu({ connectionId: conn.id, x: mid.x, y: mid.y });
              }}
            >
              +
            </button>
          );
        })}

        {/* Insert menu popup */}
        {insertMenu && (
          <div
            className="absolute z-30 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{ left: insertMenu.x + 12, top: insertMenu.y - 10 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-1">Insert node</p>
            {NODE_TYPES.map(type => {
              const cfg = NODE_TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    onInsertBetween(insertMenu.connectionId, type);
                    setInsertMenu(null);
                  }}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Nodes */}
        {nodes.map(node => (
          <CanvasNode
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            connecting={!!connecting}
            onMouseDown={handleNodeMouseDown}
            onOutputPortMouseDown={handleOutputPortMouseDown}
            onInputPortMouseUp={handleInputPortMouseUp}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-card/80 backdrop-blur px-2 py-1 rounded border border-border">
        {Math.round(zoom * 100)}%
      </div>

      {/* Help text */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted-foreground text-lg font-medium">Add nodes from the palette</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Drag ports to connect • Scroll to zoom • Drag canvas to pan</p>
          </div>
        </div>
      )}
    </div>
  );
}
