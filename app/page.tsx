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
import { getContextHistory, buildFullTreeText } from "../lib/mindMapUtils";

// Fix 1: Initial Node
const initialNodes: Node<NodeData>[] = [
  {
    id: "1",
    type: "mindMapNode",
    position: { x: 0, y: 0 },
    data: { label: "テーマを入力...", isGhost: false },
    style: { backgroundColor: "transparent", width: "150px" },
  },
];
const nodeTypes = { mindMapNode: MindMapNode };
const initialEdges: Edge[] = [];

// Use timestamp to avoid ID collisions
const getId = () => `dndnode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition, setCenter } = useReactFlow(); // Added setCenter
  const [userId, setUserId] = useState<string | null>(null);

  // ▼ Selection State (instead of Context Menu)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ▼ 認証とデータ読み込み
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const data = await fetchMindMap(session.user.id);
        if (data && data.flow_data) {
          // If nodes are empty (e.g. user deleted all), restore default node for better UX
          const loadedNodes = data.flow_data.nodes || [];
          if (loadedNodes.length === 0) {
            setNodes(initialNodes);
          } else {
            setNodes(loadedNodes);
          }
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
          const loadedNodes = data.flow_data.nodes || [];
          if (loadedNodes.length === 0) {
            setNodes(initialNodes);
          } else {
            setNodes(loadedNodes);
          }
          setEdges(data.flow_data.edges || []);
        }
      } else {
        setUserId(null);
        // Reset to initial state on logout
        setNodes(initialNodes);
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

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      setSelectedNode(null);

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
      setSelectedNode(node);
    },
    []
  );

  // Fix 2: FAB Handler
  const handleAddRootNode = useCallback(() => {
    const newNodeId = getId();
    const newNode: Node<NodeData> = {
      id: newNodeId,
      type: "mindMapNode",
      position: { x: 0, y: 0 },
      data: { label: "新しいアイデア", isGhost: false },
      style: { backgroundColor: "transparent", width: "150px" },
    };

    setNodes((nds) => nds.concat(newNode));
    // Center view on new node
    setCenter(0, 0, { zoom: 1, duration: 800 });
  }, [setNodes, setCenter]);


  const handleGenerateFromNode = useCallback(async () => {
    if (!selectedNode) return;
    setIsGenerating(true);

    const parentNode = selectedNode as Node<NodeData>;

    try {
      const contextHistory = getContextHistory(parentNode, nodes as Node<NodeData>[], edges);
      setDebugContext(contextHistory);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contextHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate questions");
      }

      const data = await response.json();
      setDebugResponse(data);
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
      setSelectedNode(null); // Clear selection after action
    } catch (err) {
      console.error(err);
      alert("AI生成エラー");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNode, nodes, edges, setNodes, setEdges]); // Added dependencies

  // ▼ 単体削除ロジック
  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    const deleteNodeId = selectedNode.id;
    setNodes((nds) => nds.filter((n) => n.id !== deleteNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== deleteNodeId && e.target !== deleteNodeId));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // ▼▼▼ 追加: 枝ごと（子孫も）削除するロジック ▼▼▼
  const getDescendants = (nodeId: string, currentEdges: Edge[]): string[] => {
    let descendants: string[] = [];
    const children = currentEdges.filter(e => e.source === nodeId);
    for (const child of children) {
      descendants.push(child.target);
      descendants = [...descendants, ...getDescendants(child.target, currentEdges)];
    }
    return descendants;
  };

  const handleDeleteBranch = useCallback(() => {
    if (!selectedNode) return;
    const rootId = selectedNode.id;

    const descendants = getDescendants(rootId, edges);
    const nodesToDelete = [rootId, ...descendants];

    setNodes((nds) => nds.filter((n) => !nodesToDelete.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)));

    setSelectedNode(null);
  }, [selectedNode, edges, setNodes, setEdges]);
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // ▼ Debug Panel Logic
  const [showDebug, setShowDebug] = useState(false);
  const [debugContext, setDebugContext] = useState<string>("");
  const [debugResponse, setDebugResponse] = useState<any>(null);

  // ▼ Proposal Generation Logic
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<string | null>(null);

  const handleCreateProposal = useCallback(async () => {
    setIsDrafting(true);
    try {
      const treeText = buildFullTreeText(nodes as Node<NodeData>[], edges);
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeText }),
      });

      if (!response.ok) {
        throw new Error("Draft generation failed");
      }

      const data = await response.json();
      setDraftResult(data.proposal);
    } catch (error) {
      console.error(error);
      alert("企画書生成エラー");
    } finally {
      setIsDrafting(false);
    }
  }, [nodes, edges]);

  return (
    <>
      {isGenerating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-75 text-white p-4 rounded-lg">
          考え中...
        </div>
      )}

      {/* FAB: Add Root Node */}
      <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
        <button
          onClick={handleAddRootNode}
          className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition hover:scale-105 active:scale-95"
          title="新しいアイデアを追加"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Create Proposal Button - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
        <button
          onClick={handleCreateProposal}
          disabled={isDrafting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow transition disabled:opacity-50"
        >
          {isDrafting ? "生成中..." : "📝 企画書を作成"}
        </button>
      </div>

      {/* Action Bar (Replaces Context Menu) */}
      {selectedNode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center space-x-2 bg-white rounded-full shadow-xl px-4 py-2 border border-gray-100">
          <button
            onClick={handleGenerateFromNode}
            disabled={isGenerating}
            className="flex flex-col items-center justify-center px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition"
          >
            <span className="text-xl mb-1">✨</span>
            <span>広げる</span>
          </button>
          <div className="w-px h-8 bg-gray-200 mx-1"></div>
          <button
            onClick={handleDeleteNode}
            className="flex flex-col items-center justify-center px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="text-xl mb-1">🗑️</span>
            <span>削除</span>
          </button>
          <div className="w-px h-8 bg-gray-200 mx-1"></div>
          <button
            onClick={handleDeleteBranch}
            className="flex flex-col items-center justify-center px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            <span className="text-xl mb-1">🌳</span>
            <span>枝ごと削除</span>
          </button>
        </div>
      )}

      {/* Proposal Result Modal */}
      {draftResult && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-8 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold text-gray-800">小説企画書</h2>
              <button onClick={() => setDraftResult(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded border font-serif leading-relaxed whitespace-pre-wrap text-gray-800">
              {draftResult}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(draftResult)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              >
                コピー
              </button>
              <button
                onClick={() => setDraftResult(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel Toggle (Hidden) */}
      <div className="hidden fixed bottom-4 left-4 z-50 pointer-events-auto">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-mono hover:bg-gray-700 shadow-lg"
        >
          🐞 Debug
        </button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed bottom-12 left-4 z-50 w-96 h-96 bg-black/80 backdrop-blur text-white p-4 rounded-lg text-xs font-mono overflow-auto shadow-2xl border border-gray-700 transform transition-all">
          <div className="mb-4">
            <h3 className="text-green-400 font-bold mb-1 border-b border-gray-600 pb-1">Context Payload</h3>
            <pre className="whitespace-pre-wrap text-gray-300">{debugContext || "No context yet..."}</pre>
          </div>
          <div>
            <h3 className="text-blue-400 font-bold mb-1 border-b border-gray-600 pb-1">Raw Response</h3>
            <pre className="whitespace-pre-wrap text-gray-300">{debugResponse ? JSON.stringify(debugResponse, null, 2) : "No response yet..."}</pre>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onNodeClick={onNodeClick} // Added click handler
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