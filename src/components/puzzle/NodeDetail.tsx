import { GameNode, NODE_TYPE_CONFIG } from '@/types/graph';

interface Props {
  node: GameNode;
  inventory: GameNode[];
  onUpdate: (id: string, updates: Partial<GameNode>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NodeDetail({ node, inventory, onUpdate, onDelete, onClose }: Props) {
  const config = NODE_TYPE_CONFIG[node.type];

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{config.icon}</span>
          <h2 className="text-base font-semibold text-foreground">{config.label}</h2>
        </div>
        <button 
          onClick={onClose} 
          className="text-muted-foreground hover:text-foreground text-2xl leading-none transition-colors hover:scale-110"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">
            Title
          </label>
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            className="w-full bg-input border-2 border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            placeholder="Enter node title..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">
            Description
          </label>
          <textarea
            value={node.description}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            rows={4}
            className="w-full bg-input border-2 border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none leading-relaxed"
            placeholder="Describe this step in detail..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">
            Player Inventory
            <span className="ml-2 text-muted-foreground font-normal">({inventory.length} {inventory.length === 1 ? 'item' : 'items'})</span>
          </label>
          <div className="mt-2.5 space-y-2">
            {inventory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3 py-4 bg-muted/30 rounded-lg text-center">
                No items collected at this point
              </p>
            ) : (
              inventory.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-node-item/15 border-2 border-node-item/30 rounded-lg hover:bg-node-item/20 transition-colors">
                  <span className="text-base">🎒</span>
                  <span className="text-sm text-foreground font-medium">{item.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-border/50 bg-card/50">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full text-sm font-medium py-2.5 px-4 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 border-2 border-destructive/30 transition-all"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
