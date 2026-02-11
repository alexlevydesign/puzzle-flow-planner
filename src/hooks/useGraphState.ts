import { useState, useCallback, useEffect, useRef } from 'react';
import { GameNode, Connection, GraphState, NodeType, NODE_TYPE_CONFIG } from '@/types/graph';

const STORAGE_KEY = 'puzzle-dep-chart';

let idCounter = Date.now();
function genId() {
  return (idCounter++).toString(36);
}

export function useGraphState() {
  const [nodes, setNodes] = useState<GameNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: GraphState = JSON.parse(saved);
        setNodes(state.nodes || []);
        setConnections(state.connections || []);
      } catch { /* ignore */ }
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, connections }));
  }, [nodes, connections]);

  const addNode = useCallback((type: NodeType, x: number, y: number): string => {
    const id = genId();
    setNodes(prev => [...prev, {
      id, type, title: NODE_TYPE_CONFIG[type].label, description: '', x, y,
    }]);
    return id;
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<GameNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    setSelectedNodeId(prev => prev === id ? null : prev);
  }, []);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setConnections(prev => {
      if (prev.some(c => c.fromId === fromId && c.toId === toId)) return prev;
      return [...prev, { id: genId(), fromId, toId }];
    });
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const insertNodeBetween = useCallback((connectionId: string, type: NodeType) => {
    setConnections(prev => {
      const conn = prev.find(c => c.id === connectionId);
      if (!conn) return prev;

      setNodes(currentNodes => {
        const fromNode = currentNodes.find(n => n.id === conn.fromId);
        const toNode = currentNodes.find(n => n.id === conn.toId);
        if (!fromNode || !toNode) return currentNodes;
        const newId = genId();
        const newNode: GameNode = {
          id: newId, type,
          title: NODE_TYPE_CONFIG[type].label, description: '',
          x: (fromNode.x + toNode.x) / 2, y: (fromNode.y + toNode.y) / 2,
        };
        // We set connections outside after getting the newId
        setTimeout(() => {
          setConnections(p => [
            ...p.filter(c => c.id !== connectionId),
            { id: genId(), fromId: conn.fromId, toId: newId },
            { id: genId(), fromId: newId, toId: conn.toId },
          ]);
        }, 0);
        return [...currentNodes, newNode];
      });

      return prev; // connections updated via setTimeout
    });
  }, []);

  const getInventoryAtNode = useCallback((nodeId: string): GameNode[] => {
    const visited = new Set<string>();
    const items: GameNode[] = [];

    function traverse(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      if (node.type === 'item') items.push(node);
      connections.filter(c => c.toId === id).forEach(c => traverse(c.fromId));
    }

    traverse(nodeId);
    return items;
  }, [nodes, connections]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const importState = useCallback((state: GraphState) => {
    setNodes(state.nodes || []);
    setConnections(state.connections || []);
    setSelectedNodeId(null);
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return {
    nodes, connections, selectedNodeId, selectedNode,
    setSelectedNodeId, addNode, updateNode, deleteNode, moveNode,
    addConnection, deleteConnection, insertNodeBetween,
    getInventoryAtNode, clearAll, importState,
  };
}
