import { NodeType, NODE_TYPES, NODE_TYPE_CONFIG, GraphState } from '@/types/graph';
import { Download, Upload } from 'lucide-react';

const BADGE_COLORS: Record<string, string> = {
  'node-action': 'bg-node-action/10 text-node-action hover:bg-node-action/20 border-node-action/50',
  'node-item': 'bg-node-item/10 text-node-item hover:bg-node-item/20 border-node-item/50',
  'node-character': 'bg-node-character/10 text-node-character hover:bg-node-character/20 border-node-character/50',
  'node-goal': 'bg-node-goal/10 text-node-goal hover:bg-node-goal/20 border-node-goal/50',
  'node-location': 'bg-node-location/10 text-node-location hover:bg-node-location/20 border-node-location/50',
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
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-5 border-b border-border/50">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Node Library</h2>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Drag or click to add nodes
        </p>
      </div>
      <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
        {NODE_TYPES.map(type => {
          const config = NODE_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              draggable
              onClick={() => onAddNode(type)}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/puzzle-node-type', type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-grab active:cursor-grabbing ${BADGE_COLORS[config.colorClass]}`}
            >
              <span className="text-lg shrink-0">{config.icon}</span>
              <span className="text-sm font-medium leading-tight">{config.label}</span>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-border/50 space-y-2.5 bg-card/50">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-md bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-md bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center font-medium">
          Auto-saved to browser storage
        </p>
        <button
          onClick={onClear}
          className="w-full text-xs font-medium py-2 px-3 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 transition-all"
        >
          Clear All Nodes
        </button>
      </div>
    </div>
  );
}
