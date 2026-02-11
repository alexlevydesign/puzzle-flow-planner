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
    <div className="w-72 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <h2 className="text-sm font-bold text-foreground">{config.label}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
          <textarea
            value={node.description}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            rows={3}
            className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Describe this step..."
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Player Inventory ({inventory.length} items)
          </label>
          <div className="mt-2 space-y-1.5">
            {inventory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No items collected at this point</p>
            ) : (
              inventory.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-node-item/10 border border-node-item/20 rounded-md">
                  <span className="text-sm">🎒</span>
                  <span className="text-xs text-foreground">{item.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full text-sm py-2 px-3 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
