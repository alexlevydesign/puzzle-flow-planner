import { GameNode, NODE_TYPE_CONFIG } from '@/types/graph';
import styles from './NodeDetail.module.css';

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
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.headerIcon}>{config.icon}</span>
          <h2 className={styles.headerTitle}>{config.label}</h2>
        </div>
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label}>
            Title
          </label>
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            className={styles.input}
            placeholder="Enter node title..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Description
          </label>
          <textarea
            value={node.description}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            rows={4}
            className={styles.textarea}
            placeholder="Describe this step in detail..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.inventoryLabel}>
              Player Inventory
              <span className={styles.inventoryCount}>
                ({inventory.length} {inventory.length === 1 ? 'item' : 'items'})
              </span>
            </span>
          </label>
          <div className={styles.inventoryList}>
            {inventory.length === 0 ? (
              <p className={styles.emptyState}>
                No items collected at this point
              </p>
            ) : (
              inventory.map(item => (
                <div key={item.id} className={styles.inventoryItem}>
                  <span className={styles.inventoryIcon}>🎒</span>
                  <span className={styles.inventoryName}>{item.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          onClick={() => onDelete(node.id)}
          className={styles.deleteButton}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
