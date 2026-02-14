import { NodeType, NODE_TYPES, NODE_TYPE_CONFIG, GraphState } from '@/types/graph';
import { Download, Upload } from 'lucide-react';
import styles from './NodePalette.module.css';

const BUTTON_CLASS_MAP: Record<string, string> = {
  'node-action': styles.nodeButtonAction,
  'node-item': styles.nodeButtonItem,
  'node-character': styles.nodeButtonCharacter,
  'node-goal': styles.nodeButtonGoal,
  'node-location': styles.nodeButtonLocation,
};

interface Props {
  onAddNode: (type: NodeType) => void;
  onClear: () => void;
  onExport: () => GraphState;
  onImport: (state: GraphState) => void;
}

export default function NodePalette({ onAddNode, onClear, onExport, onImport }: Props) {
  const handleExport = () => {
    const state = onExport();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puzzle-chart-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const state = JSON.parse(reader.result as string) as GraphState;
          if (state.nodes && state.connections) onImport(state);
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className={styles.palette}>
      <div className={styles.header}>
        <h2 className={styles.title}>Node Library</h2>
        <p className={styles.description}>
          Drag or click to add nodes
        </p>
      </div>
      <div className={styles.nodeList}>
        {NODE_TYPES.map(type => {
          const config = NODE_TYPE_CONFIG[type];
          const buttonClass = `${styles.nodeButton} ${BUTTON_CLASS_MAP[config.colorClass]}`;
          return (
            <button
              key={type}
              draggable
              onClick={() => onAddNode(type)}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/puzzle-node-type', type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={buttonClass}
            >
              <span className={styles.nodeIcon}>{config.icon}</span>
              <span className={styles.nodeLabel}>{config.label}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.footer}>
        <div className={styles.buttonGroup}>
          <button
            onClick={handleExport}
            className={styles.actionButton}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={handleImport}
            className={styles.actionButton}
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
        <p className={styles.autoSaveText}>
          Auto-saved to browser storage
        </p>
        <button
          onClick={onClear}
          className={styles.clearButton}
        >
          Clear All Nodes
        </button>
      </div>
    </div>
  );
}
