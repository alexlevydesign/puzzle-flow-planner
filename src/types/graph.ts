export type NodeType = 'action' | 'item' | 'character' | 'goal' | 'location';

export interface GameNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface GraphState {
  nodes: GameNode[];
  connections: Connection[];
}

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 72;

export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; icon: string; colorClass: string }> = {
  action: { label: 'Player Action', icon: '⚡', colorClass: 'node-action' },
  item: { label: 'Obtain Item', icon: '🎒', colorClass: 'node-item' },
  character: { label: 'Talk to NPC', icon: '💬', colorClass: 'node-character' },
  goal: { label: 'Goal', icon: '🎯', colorClass: 'node-goal' },
  location: { label: 'Location', icon: '📍', colorClass: 'node-location' },
};

export const NODE_TYPES = Object.keys(NODE_TYPE_CONFIG) as NodeType[];
