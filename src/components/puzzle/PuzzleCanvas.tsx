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
  onDeleteConnection: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onInsertBetween: (connectionId: string, type: NodeType) => void;
  onInsertExistingNode: (connectionId: string, nodeId: string) => void;
  onExtractNode: (id: string) => void;
  onDropNodeOnCanvas: (type: NodeType, x: number, y: number) => string;
}

// Sample points along a cubic bezier to check proximity
function distToPath(px: number, py: number, from: GameNode, to: GameNode): number {
  const fx = from.x + NODE_WIDTH / 2;
  const fy = from.y + NODE_HEIGHT;
  const tx = to.x + NODE_WIDTH / 2;
  const ty = to.y;
  const dv = Math.abs(ty - fy) * 0.4 + 30;
  // Control points: (fx, fy+dv) and (tx, ty-dv)
  let minDist = Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const it = 1 - t;
    const x = it ** 3 * fx + 3 * it ** 2 * t * fx + 3 * it * t ** 2 * tx + t ** 3 * tx;
    const y = it ** 3 * fy + 3 * it ** 2 * t * (fy + dv) + 3 * it * t ** 2 * (ty - dv) + t ** 3 * ty;
    const d = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export default function PuzzleCanvas({
  nodes, connections, selectedNodeId, onSelectNode, onMoveNode,
  onAddConnection, onDeleteConnection, onDeleteNode, onInsertBetween,
  onInsertExistingNode, onExtractNode, onDropNodeOnCanvas,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; ox: number; oy: number; metaKey: boolean } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; direction: 'output' | 'input' } | null>(null);
  const [mouseCanvas, setMouseCanvas] = useState({ x: 0, y: 0 });
  const [insertMenu, setInsertMenu] = useState<{ connectionId: string; x: number; y: number } | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

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

  // Keyboard: Escape + Backspace/Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setConnecting(null); setInsertMenu(null); }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        onDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, onDeleteNode]);

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

  // Find which connection a node center is near
  const findConnectionNearNode = useCallback((nodeId: string): string | null => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const cx = node.x + NODE_WIDTH / 2;
    const cy = node.y + NODE_HEIGHT / 2;
    for (const conn of connections) {
      if (conn.fromId === nodeId || conn.toId === nodeId) continue;
      const from = nodes.find(n => n.id === conn.fromId);
      const to = nodes.find(n => n.id === conn.toId);
      if (!from || !to) continue;
      if (distToPath(cx, cy, from, to) < 30) return conn.id;
    }
    return null;
  }, [connections, nodes]);

  const handleMouseUp = (e: React.MouseEvent) => {
    setPanning(null);
    if (dragging) {
      if (dragging.metaKey || e.metaKey) {
        onExtractNode(dragging.nodeId);
      } else {
        // Check if node was dropped on a connection line
        const connId = findConnectionNearNode(dragging.nodeId);
        if (connId) {
          onInsertExistingNode(connId, dragging.nodeId);
        }
      }
      setDragging(null);
    }
    if (connecting) setConnecting(null);
  };

  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    const cp = screenToCanvas(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDragging({ nodeId: id, ox: cp.x - node.x, oy: cp.y - node.y, metaKey: e.metaKey });
    onSelectNode(id);
    setInsertMenu(null);
  };

  const handleOutputPortMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // If there are existing outgoing connections, disconnect them
    const outgoing = connections.filter(c => c.fromId === id);
    outgoing.forEach(c => onDeleteConnection(c.id));
    setConnecting({ fromId: id, direction: 'output' });
  };

  const handleInputPortMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // If there are existing incoming connections, disconnect them and start connecting from the source
    const incoming = connections.filter(c => c.toId === id);
    if (incoming.length > 0) {
      const sourceId = incoming[0].fromId;
      incoming.forEach(c => onDeleteConnection(c.id));
      setConnecting({ fromId: sourceId, direction: 'output' });
    } else {
      setConnecting({ fromId: id, direction: 'input' });
    }
  };

  const handleInputPortMouseUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connecting && connecting.fromId !== id) {
      if (connecting.direction === 'output') {
        onAddConnection(connecting.fromId, id);
      } else {
        onAddConnection(id, connecting.fromId);
      }
    }
    setConnecting(null);
    setDragging(null);
    setPanning(null);
  };

  const handleOutputPortMouseUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connecting && connecting.fromId !== id) {
      if (connecting.direction === 'input') {
        onAddConnection(id, connecting.fromId);
      } else {
        onAddConnection(connecting.fromId, id);
      }
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

  // Find connection at point for palette drag-drop
  const findConnectionAtPoint = useCallback((cx: number, cy: number): string | null => {
    for (const conn of connections) {
      const from = nodes.find(n => n.id === conn.fromId);
      const to = nodes.find(n => n.id === conn.toId);
      if (!from || !to) continue;
      if (distToPath(cx, cy, from, to) < 30) return conn.id;
    }
    return null;
  }, [connections, nodes]);

  // Handle drag-and-drop from palette
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/puzzle-node-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('application/puzzle-node-type') as NodeType;
    if (!type) return;
    e.preventDefault();
    const cp = screenToCanvas(e.clientX, e.clientY);
    const connId = findConnectionAtPoint(cp.x, cp.y);
    if (connId) {
      onInsertBetween(connId, type);
    } else {
      onDropNodeOnCanvas(type, cp.x - NODE_WIDTH / 2, cp.y - NODE_HEIGHT / 2);
    }
  };

  // Connecting line endpoint
  const getConnectingEndpoint = () => {
    if (!connecting) return null;
    const from = nodes.find(n => n.id === connecting.fromId);
    if (!from) return null;
    const fx = from.x + NODE_WIDTH / 2;
    const fy = connecting.direction === 'output' ? from.y + NODE_HEIGHT : from.y;
    return { fx, fy };
  };

  // Determine cursor
  const getCursor = () => {
    if (dragging?.metaKey) return 'cursor-pinch';
    if (connecting) return 'cursor-crosshair';
    if (panning) return 'cursor-grabbing';
    if (hoveredConnectionId) return 'cursor-scissors';
    return 'cursor-grab';
  };

  const connectEndpoint = getConnectingEndpoint();

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden canvas-grid relative ${getCursor()}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
            const isHovered = hoveredConnectionId === conn.id;
            return (
              <g key={conn.id}>
                {/* Invisible wider hitbox for hover/click */}
                <path
                  d={getPath(from, to)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ pointerEvents: 'stroke', cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><text y=\'18\' font-size=\'18\'>✂️</text></svg>") 12 12, pointer' }}
                  onMouseEnter={() => setHoveredConnectionId(conn.id)}
                  onMouseLeave={() => setHoveredConnectionId(null)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConnection(conn.id);
                    setHoveredConnectionId(null);
                  }}
                />
                {/* Visible path */}
                <path
                  d={getPath(from, to)}
                  fill="none"
                  stroke={isHovered ? 'hsl(0, 72%, 55%)' : 'hsl(215, 12%, 40%)'}
                  strokeWidth={isHovered ? 3 : 2}
                  markerEnd={isHovered ? undefined : 'url(#arrow)'}
                  style={{ pointerEvents: 'none', transition: 'stroke 0.15s, stroke-width 0.15s' }}
                />
              </g>
            );
          })}
          {/* Temp connecting line */}
          {connectEndpoint && (() => {
            const { fx, fy } = connectEndpoint;
            const dy = Math.abs(mouseCanvas.y - fy) * 0.4 + 30;
            return (
              <path
                d={`M ${fx} ${fy} C ${fx} ${fy + (connecting!.direction === 'output' ? dy : -dy)}, ${mouseCanvas.x} ${mouseCanvas.y + (connecting!.direction === 'output' ? -dy : dy)}, ${mouseCanvas.x} ${mouseCanvas.y}`}
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
            extracting={dragging?.nodeId === node.id && dragging.metaKey}
            onMouseDown={handleNodeMouseDown}
            onOutputPortMouseDown={handleOutputPortMouseDown}
            onOutputPortMouseUp={handleOutputPortMouseUp}
            onInputPortMouseDown={handleInputPortMouseDown}
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
            <p className="text-muted-foreground text-lg font-medium">Drag nodes from the palette</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Drag ports to connect • Click lines to cut • ⌘+drag to extract • Backspace to delete</p>
          </div>
        </div>
      )}
    </div>
  );
}
