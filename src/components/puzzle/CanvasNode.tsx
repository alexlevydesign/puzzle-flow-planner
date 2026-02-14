import { GameNode, NODE_TYPE_CONFIG, NODE_WIDTH, NODE_HEIGHT } from '@/types/graph';

const COLOR_MAP: Record<string, string> = {
  'node-action': 'border-node-action bg-node-action/10 shadow-node-action/20',
  'node-item': 'border-node-item bg-node-item/10 shadow-node-item/20',
  'node-character': 'border-node-character bg-node-character/10 shadow-node-character/20',
  'node-goal': 'border-node-goal bg-node-goal/10 shadow-node-goal/20',
  'node-location': 'border-node-location bg-node-location/10 shadow-node-location/20',
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
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onOutputPortMouseDown: (id: string, e: React.MouseEvent) => void;
  onOutputPortMouseUp: (id: string, e: React.MouseEvent) => void;
  onInputPortMouseDown: (id: string, e: React.MouseEvent) => void;
  onInputPortMouseUp: (id: string, e: React.MouseEvent) => void;
}

export default function CanvasNode({ node, selected, connecting, extracting, onMouseDown, onOutputPortMouseDown, onOutputPortMouseUp, onInputPortMouseDown, onInputPortMouseUp }: Props) {
  const config = NODE_TYPE_CONFIG[node.type];
  const colors = COLOR_MAP[config.colorClass];
  const portColor = PORT_COLOR[config.colorClass];

  return (
    <div
      className={`absolute select-none cursor-grab active:cursor-grabbing border-2 rounded-lg shadow-lg transition-shadow ${colors} ${selected ? 'ring-2 ring-primary shadow-xl' : ''} ${extracting ? 'opacity-60 ring-2 ring-destructive' : ''}`}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(node.id, e); }}
    >
      {/* Input port */}
      <div
        className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-card ${portColor} cursor-pointer hover:scale-125 transition-transform z-10 ${connecting ? 'animate-pulse scale-125' : ''}`}
        onMouseDown={(e) => { e.stopPropagation(); onInputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onInputPortMouseUp(node.id, e); }}
      />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2 h-full">
        <span className="text-lg">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{node.title}</p>
          <p className="text-xs text-muted-foreground truncate">{config.label}</p>
        </div>
      </div>

      {/* Output port */}
      <div
        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-card ${portColor} cursor-crosshair hover:scale-125 transition-transform z-10`}
        onMouseDown={(e) => { e.stopPropagation(); onOutputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onOutputPortMouseUp(node.id, e); }}
      />
    </div>
  );
}
