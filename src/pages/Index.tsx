import { useRef } from 'react';
import { NodeType, GraphState } from '@/types/graph';
import { useGraphState } from '@/hooks/useGraphState';
import NodePalette from '@/components/puzzle/NodePalette';
import PuzzleCanvas from '@/components/puzzle/PuzzleCanvas';
import NodeDetail from '@/components/puzzle/NodeDetail';

const Index = () => {
  const graph = useGraphState();
  const countRef = useRef(0);

  const handleAddNode = (type: NodeType) => {
    const count = countRef.current++;
    const col = count % 3;
    const row = Math.floor(count / 3);
    graph.addNode(type, 120 + col * 220, 80 + row * 120);
  };

  const handleExport = (): GraphState => ({ nodes: graph.nodes, connections: graph.connections });

  const handleImport = (state: GraphState) => {
    graph.importState(state);
  };

  const inventory = graph.selectedNode ? graph.getInventoryAtNode(graph.selectedNode.id) : [];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <NodePalette onAddNode={handleAddNode} onClear={graph.clearAll} onExport={handleExport} onImport={handleImport} />
      <PuzzleCanvas
        nodes={graph.nodes}
        connections={graph.connections}
        selectedNodeId={graph.selectedNodeId}
        onSelectNode={graph.setSelectedNodeId}
        onMoveNode={graph.moveNode}
        onAddConnection={graph.addConnection}
        onInsertBetween={graph.insertNodeBetween}
      />
      {graph.selectedNode && (
        <NodeDetail
          node={graph.selectedNode}
          inventory={inventory}
          onUpdate={graph.updateNode}
          onDelete={graph.deleteNode}
          onClose={() => graph.setSelectedNodeId(null)}
        />
      )}
    </div>
  );
};

export default Index;
