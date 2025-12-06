"use client";

import { useState, useCallback, useEffect } from "react";
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
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MindMapNode, { NodeData } from "../components/MindMapNode";
import AuthButton from "../components/AuthButton";
import { supabase } from "../lib/supabaseClient"; 
import { saveMindMap, fetchMindMap } from "../lib/supabaseFunctions";

const initialNodes: Node<NodeData>[] = [];
const nodeTypes = { mindMapNode: MindMapNode };
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [userId, setUserId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: Node;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ▼ 認証とデータ読み込み
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const data = await fetchMindMap(session.user.id);
        if (data && data.flow_data) {
          setNodes(data.flow_data.nodes || []);
          setEdges(data.flow_data.edges || []);
        }
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            setUserId(session.user.id);
            const data = await fetchMindMap(session.user.id);
            if (data && data.flow_data) {
                setNodes(data.flow_data.nodes || []);
                setEdges(data.flow_data.edges || []);
            }
        } else {
            setUserId(null);
            setNodes([]);
            setEdges([]);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [setNodes, setEdges]);

  // ▼ 自動保存
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      saveMindMap(userId, nodes, edges);
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges, userId]);

  // --- 操作系 ---

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      setContextMenu(null);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node<NodeData> = {
        id: getId(),
        type: "mindMapNode",
        position,
        data: { label: "", question: undefined, isGhost: false },
        style: {
          backgroundColor: "transparent",
          width: "150px",
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
    setContextMenu(null);

    const parentNode = contextMenu.node as Node<NodeData>;
    const parentNodeText = parentNode.data.label || "";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const offsetX = 300;
        const baseY = parentNode.position.y - (questions.length - 1) * 50;

        questions.forEach((question, index) => {
          const newNodeId = getId();
          const randomOffsetY = (Math.random() - 0.5) * 80;
          const newNode: Node<NodeData> = {
            id: newNodeId,
            type: "mindMapNode",
            position: {
              x: parentNode.position.x + offsetX + (index * 20),
              y: baseY + index * 100 + randomOffsetY,
            },
            data: { label: "", isGhost: true, question: question },
            style: { backgroundColor: "transparent", width: "200px" },
          };
          newNodes.push(newNode);
          newEdges.push({
            id: `e${parentNode.id}-${newNodeId}`,
            source: parentNode.id,
            target: newNodeId,
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        });
        setNodes((nds) => nds.concat(newNodes));
        setEdges((eds) => addEdge(newEdges[0], eds).concat(newEdges.slice(1)));
      }
    } catch (err) {
      console.error(err);
      alert("AI生成エラー");
    } finally {
      setIsGenerating(false);
    }
  }, [contextMenu, setNodes, setEdges]);

  // ▼ 単体削除ロジック
  const handleDeleteNode = useCallback(() => {
    if (!contextMenu?.node) return;
    const deleteNodeId = contextMenu.node.id;
    setNodes((nds) => nds.filter((n) => n.id !== deleteNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== deleteNodeId && e.target !== deleteNodeId));
    setContextMenu(null);
  }, [contextMenu, setNodes, setEdges]);

  // ▼▼▼ 追加: 枝ごと（子孫も）削除するロジック ▼▼▼
  const getDescendants = (nodeId: string, currentEdges: Edge[]): string[] => {
    let descendants: string[] = [];
    const children = currentEdges.filter(e => e.source === nodeId);
    for (const child of children) {
        descendants.push(child.target);
        // 再帰的に孫、ひ孫も探す
        descendants = [...descendants, ...getDescendants(child.target, currentEdges)];
    }
    return descendants;
  };

  const handleDeleteBranch = useCallback(() => {
    if (!contextMenu?.node) return;
    const rootId = contextMenu.node.id;
    
    // 自分自身 + 全ての子孫を探し出す
    const descendants = getDescendants(rootId, edges);
    const nodesToDelete = [rootId, ...descendants];

    // まとめて削除
    setNodes((nds) => nds.filter((n) => !nodesToDelete.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)));
    
    setContextMenu(null);
  }, [contextMenu, edges, setNodes, setEdges]);
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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
          className="absolute z-10 bg-white border border-gray-200 rounded shadow-lg p-1 min-w-[180px]"
        >
          <button
            onClick={handleGenerateFromNode}
            disabled={isGenerating}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 border-b border-gray-100"
          >
            ✨ AIに展開する
          </button>
          
          {/* 単体削除 */}
          <button
            onClick={handleDeleteNode}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            🗑️ ノード削除
          </button>

          {/* ▼ 追加: 枝ごと削除 */}
          <button
            onClick={handleDeleteBranch}
            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 font-bold"
          >
            🌳 以降を全て削除
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
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <AuthButton />
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}