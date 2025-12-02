"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType, // Import MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MindMapNode, { NodeData } from "../components/MindMapNode";

// Initial nodes and edges
const initialNodes: Node<NodeData>[] = [];

const nodeTypes = { mindMapNode: MindMapNode };
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition, getNodes } = useReactFlow();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: Node;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      setContextMenu(null); // Close any open node context menu

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node<NodeData> = {
        id: getId(),
        type: "mindMapNode",
        position,
        data: { label: "", question: undefined, isGhost: false }, // Initialize question as undefined
        style: {
          backgroundColor: "transparent", // Remove extra white background
          width: "150px", // Fixed width for better layout
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node,
      });
    },
    [setContextMenu]
  );

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  const handleGenerateFromNode = useCallback(async () => {
    if (!contextMenu?.node) return;

    setIsGenerating(true);
    setContextMenu(null); // Close context menu

    const parentNode = contextMenu.node as Node<NodeData>; // Cast to Node<NodeData>
    const parentNodeId = parentNode.id;
    const parentNodeText = parentNode.data.label || "";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: parentNodeText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate questions");
      }

      const data = await response.json();
      const questions: string[] = data.questions || [];

      if (questions.length > 0) {
        const newNodes: Node<NodeData>[] = [];
        const newEdges: Edge[] = [];
        const offsetX = 300; // Horizontal spacing
        const baseY = parentNode.position.y - (questions.length - 1) * 50; // Start higher for spread

        questions.forEach((question, index) => {
          const newNodeId = getId();
          const randomOffsetY = (Math.random() - 0.5) * 80; // +/- 40px random Y offset

          const newNode: Node<NodeData> = {
            id: newNodeId,
            type: "mindMapNode",
            position: {
              x: parentNode.position.x + offsetX + (index * 20), // Slight fanning
              y: baseY + index * 100 + randomOffsetY,
            },
            data: { label: "", isGhost: true, question: question }, // Use 'question' now
            style: {
              backgroundColor: "transparent", // Handled by MindMapNode component
              width: "200px",
            },
          };
          newNodes.push(newNode);

          newEdges.push({
            id: `e${parentNodeId}-${newNodeId}`,
            source: parentNodeId,
            target: newNodeId,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        });

        setNodes((nds) => nds.concat(newNodes));
        setEdges((eds) => addEdge(newEdges[0], eds).concat(newEdges.slice(1))); // Add all new edges
      }
    } catch (err) {
      console.error("AI generation error:", err);
      // Implement toast notification here if desired
      alert(`AI生成中にエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [contextMenu, setNodes, setEdges, addEdge]);

  return (
    <>
      {isGenerating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-75 text-white p-4 rounded-lg">
          考え中...
        </div>
      )}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="absolute z-10 bg-white border border-gray-200 rounded shadow-lg p-1"
        >
          <button
            onClick={handleGenerateFromNode}
            disabled={isGenerating}
            className="block w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            AIに展開する
          </button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </>
  );
}

export default function Home() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
