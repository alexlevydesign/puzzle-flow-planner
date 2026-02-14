import { useRef, useState, useEffect, useCallback } from 'react';
import { GameNode, Connection, NodeType, NODE_TYPE_CONFIG, NODE_TYPES, NODE_WIDTH, NODE_HEIGHT } from '@/types/graph';
import CanvasNode from './CanvasNode';
import styles from './PuzzleCanvas.module.css';

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
  const [dragging, setDragging] = useState<{ nodeId: string; ox: number; oy: number; metaKey: boolean; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; direction: 'output' | 'input' } | null>(null);
  const [mouseCanvas, setMouseCanvas] = useState({ x: 0, y: 0 });
  const [insertMenu, setInsertMenu] = useState<{ connectionId: string; x: number; y: number } | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [hoveredInsertButtonId, setHoveredInsertButtonId] = useState<string | null>(null);

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
      const newX = cp.x - dragging.ox;
      const newY = cp.y - dragging.oy;
      setDragging(prev => prev ? { ...prev, currentX: newX, currentY: newY } : null);
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
      // Apply final position
      onMoveNode(dragging.nodeId, dragging.currentX, dragging.currentY);
      
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
    setDragging({ 
      nodeId: id, 
      ox: cp.x - node.x, 
      oy: cp.y - node.y, 
      metaKey: e.metaKey,
      startX: node.x,
      startY: node.y,
      currentX: node.x,
      currentY: node.y
    });
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
    if (dragging?.metaKey) return styles.cursorPinch;
    if (connecting) return styles.cursorCrosshair;
    if (panning) return styles.cursorGrabbing;
    if (hoveredConnectionId) return styles.cursorScissors;
    return styles.cursorGrab;
  };

  const connectEndpoint = getConnectingEndpoint();

  return (
    <div
      ref={containerRef}
      className={`${styles.canvas} ${getCursor()}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className={styles.transformWrapper}>
        {/* SVG connections */}
        <svg className={styles.svg} style={{ left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" className={styles.arrowMarker} />
            </marker>
          </defs>
          {connections.map(conn => {
            const from = nodes.find(n => n.id === conn.fromId);
            const to = nodes.find(n => n.id === conn.toId);
            if (!from || !to) return null;
            const isHovered = hoveredConnectionId === conn.id;
            return (
              <g 
                key={conn.id}
                onMouseEnter={() => setHoveredConnectionId(conn.id)}
                onMouseLeave={() => setHoveredConnectionId(null)}
              >
                {/* Invisible wider hitbox for hover/click */}
                <path
                  d={getPath(from, to)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  className={styles.connectionHitbox}
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
                  stroke={isHovered ? 'hsl(0, 84%, 60%)' : 'hsl(215, 16%, 47%)'}
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  markerEnd={isHovered ? undefined : 'url(#arrow)'}
                  className={styles.connectionPath}
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
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2.5}
                strokeDasharray="8 5"
                opacity={0.8}
                className={styles.connectingLine}
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
          const isVisible = hoveredConnectionId === conn.id || hoveredInsertButtonId === conn.id || insertMenu?.connectionId === conn.id;
          return (
            <button
              key={`ins-${conn.id}`}
              className={styles.insertButton}
              style={{ 
                left: mid.x - 14, 
                top: mid.y - 14,
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none'
              }}
              onMouseEnter={() => setHoveredInsertButtonId(conn.id)}
              onMouseLeave={() => setHoveredInsertButtonId(null)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setInsertMenu({ connectionId: conn.id, x: mid.x, y: mid.y });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="rgba(255, 255, 255, 1.00)" d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/></svg>
            </button>
          );
        })}

        {/* Insert menu popup */}
        {insertMenu && (
          <div
            className={styles.insertMenu}
            style={{ left: insertMenu.x + 12, top: insertMenu.y - 10 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className={styles.insertMenuLabel}>Insert node</p>
            {NODE_TYPES.map(type => {
              const cfg = NODE_TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  className={styles.insertMenuItem}
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
        {nodes.map(node => {
          const isDragging = dragging?.nodeId === node.id;
          const dragOffset = isDragging && dragging 
            ? { x: dragging.currentX - dragging.startX, y: dragging.currentY - dragging.startY }
            : null;
          
          return (
            <CanvasNode
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              connecting={!!connecting}
              extracting={dragging?.nodeId === node.id && dragging.metaKey}
              dragOffset={dragOffset}
              onMouseDown={handleNodeMouseDown}
              onOutputPortMouseDown={handleOutputPortMouseDown}
              onOutputPortMouseUp={handleOutputPortMouseUp}
              onInputPortMouseDown={handleInputPortMouseDown}
              onInputPortMouseUp={handleInputPortMouseUp}
            />
          );
        })}
      </div>

      {/* Zoom indicator */}
      <div className={styles.zoomIndicator}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Help text */}
      {nodes.length === 0 && (
        <div className={styles.helpOverlay}>
          <div className={styles.helpText}>
            <p className={styles.helpTitle}>Drag nodes from the palette</p>
            <p className={styles.helpSubtitle}>Drag ports to connect • Click lines to cut • ⌘+drag to extract • Backspace to delete</p>
          </div>
        </div>
      )}
    </div>
  );
}
