import { GameNode, NODE_TYPE_CONFIG, NODE_WIDTH, NODE_HEIGHT } from '@/types/graph';

const COLOR_MAP: Record<string, string> = {
  'node-action': 'border-node-action/60 bg-node-action/8',
  'node-item': 'border-node-item/60 bg-node-item/8',
  'node-character': 'border-node-character/60 bg-node-character/8',
  'node-goal': 'border-node-goal/60 bg-node-goal/8',
  'node-location': 'border-node-location/60 bg-node-location/8',
};

const PORT_COLOR: Record<string, string> = {
  'node-action': 'bg-node-action',
  'node-item': 'bg-node-item',
  'node-character': 'bg-node-character',
  'node-goal': 'bg-node-goal',
  'node-location': 'bg-node-location',
};

interface Props {
  node: GameNode;
  selected: boolean;
  connecting: boolean;
  extracting?: boolean;
  dragOffset?: { x: number; y: number } | null;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onOutputPortMouseDown: (id: string, e: React.MouseEvent) => void;
  onOutputPortMouseUp: (id: string, e: React.MouseEvent) => void;
  onInputPortMouseDown: (id: string, e: React.MouseEvent) => void;
  onInputPortMouseUp: (id: string, e: React.MouseEvent) => void;
}

export default function CanvasNode({ node, selected, connecting, extracting, dragOffset, onMouseDown, onOutputPortMouseDown, onOutputPortMouseUp, onInputPortMouseDown, onInputPortMouseUp }: Props) {
  const config = NODE_TYPE_CONFIG[node.type];
  const colors = COLOR_MAP[config.colorClass];
  const portColor = PORT_COLOR[config.colorClass];

  const style = dragOffset 
    ? { left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }
    : { left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT };

  return (
    <div
      className={`absolute select-none cursor-grab active:cursor-grabbing border-2 rounded-xl ${dragOffset ? '' : 'transition-all'} ${colors} ${selected ? 'border-primary scale-105' : ''} ${extracting ? 'opacity-60 border-destructive' : ''}`}
      style={style}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(node.id, e); }}
    >
      {/* Input port */}
      <div
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-background ${portColor} cursor-pointer hover:scale-125 transition-transform z-10 ${connecting ? 'animate-pulse scale-125' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onInputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onInputPortMouseUp(node.id, e); }}
      />

      {/* Content */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 h-full">
        <span className="text-xl shrink-0">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{node.title}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{config.label}</p>
        </div>
      </div>

      {/* Output port */}
      <div
        className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-background ${portColor} cursor-crosshair hover:scale-125 transition-transform z-10`}
        onMouseDown={(e) => { e.stopPropagation(); onOutputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onOutputPortMouseUp(node.id, e); }}
      />
    </div>
  );
}
