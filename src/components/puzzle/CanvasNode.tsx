import { GameNode, NODE_TYPE_CONFIG, NODE_WIDTH, NODE_HEIGHT } from '@/types/graph';
import styles from './CanvasNode.module.css';

const NODE_CLASS_MAP: Record<string, string> = {
  'node-action': styles.nodeAction,
  'node-item': styles.nodeItem,
  'node-character': styles.nodeCharacter,
  'node-goal': styles.nodeGoal,
  'node-location': styles.nodeLocation,
};

const PORT_CLASS_MAP: Record<string, string> = {
  'node-action': styles.portAction,
  'node-item': styles.portItem,
  'node-character': styles.portCharacter,
  'node-goal': styles.portGoal,
  'node-location': styles.portLocation,
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
  const nodeColorClass = NODE_CLASS_MAP[config.colorClass];
  const portColorClass = PORT_CLASS_MAP[config.colorClass];

  const style = dragOffset 
    ? { left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }
    : { left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT };

  const nodeClasses = [
    styles.node,
    nodeColorClass,
    !dragOffset && styles.withTransition,
    selected && styles.selected,
    extracting && styles.extracting,
  ].filter(Boolean).join(' ');

  const inputPortClasses = [
    styles.port,
    styles.inputPort,
    portColorClass,
    connecting && styles.connecting,
  ].filter(Boolean).join(' ');

  const outputPortClasses = [
    styles.port,
    styles.outputPort,
    portColorClass,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={nodeClasses}
      style={style}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(node.id, e); }}
    >
      {/* Input port */}
      <div
        className={inputPortClasses}
        onMouseDown={(e) => { e.stopPropagation(); onInputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onInputPortMouseUp(node.id, e); }}
      />

      {/* Content */}
      <div className={styles.content}>
        <span className={styles.icon}>{config.icon}</span>
        <div className={styles.textContainer}>
          <p className={styles.title}>{node.title}</p>
          <p className={styles.label}>{config.label}</p>
        </div>
      </div>

      {/* Output port */}
      <div
        className={outputPortClasses}
        onMouseDown={(e) => { e.stopPropagation(); onOutputPortMouseDown(node.id, e); }}
        onMouseUp={(e) => { e.stopPropagation(); onOutputPortMouseUp(node.id, e); }}
      />
    </div>
  );
}
