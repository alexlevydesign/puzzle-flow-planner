import { NodeType, NODE_TYPES, NODE_TYPE_CONFIG, GraphState } from '@/types/graph';
import { Download, Upload } from 'lucide-react';

const BADGE_COLORS: Record<string, string> = {
  'node-action': 'bg-node-action/20 text-node-action border-node-action/30',
  'node-item': 'bg-node-item/20 text-node-item border-node-item/30',
  'node-character': 'bg-node-character/20 text-node-character border-node-character/30',
  'node-goal': 'bg-node-goal/20 text-node-goal border-node-goal/30',
  'node-location': 'bg-node-location/20 text-node-location border-node-location/30',
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
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">Nodes</h2>
        <p className="text-xs text-muted-foreground mt-1">Click to add to canvas</p>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {NODE_TYPES.map(type => {
          const config = NODE_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${BADGE_COLORS[config.colorClass]}`}
            >
              <span className="text-base">{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Auto-saved to browser</p>
        <button
          onClick={onClear}
          className="w-full text-xs py-1.5 px-3 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
