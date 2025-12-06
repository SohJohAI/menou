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

// ▼▼▼ 必要なコンポーネント ▼▼▼
import AuthButton from "../components/AuthButton";

// ▼▼▼ ここが抜けてた！ これがないと保存できない！ ▼▼▼
// AuthButtonと同じクライアントを使うように修正
import { supabase } from "../lib/supabaseClient"; 
import { saveMindMap, fetchMindMap } from "../lib/supabaseFunctions";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const initialNodes: Node<NodeData>[] = [];
const nodeTypes = { mindMapNode: MindMapNode };
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  // ユーザーID管理
  const [userId, setUserId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: Node;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ▼▼▼ 1. 起動時 & ログイン変更時の処理 ▼▼▼
  useEffect(() => {
    const init = async () => {
      // 起動時に現在のユーザーをチェック
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("User found:", session.user.id);
        setUserId(session.user.id);
        
        // データ読み込み
        const data = await fetchMindMap(session.user.id);
        if (data && data.flow_data) {
          console.log("Restoring data...");
          setNodes(data.flow_data.nodes || []);
          setEdges(data.flow_data.edges || []);
        }
      }
    };
    init();

    // ログイン/ログアウトの監視
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            console.log("Auth changed: Logged In");
            setUserId(session.user.id);
            // ログインしたらデータを取りに行く
            const data = await fetchMindMap(session.user.id);
            if (data && data.flow_data) {
                setNodes(data.flow_data.nodes || []);
                setEdges(data.flow_data.edges || []);
            }
        } else {
            console.log("Auth changed: Logged Out");
            setUserId(null);
            setNodes([]); // ログアウトしたら画面クリア
            setEdges([]);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [setNodes, setEdges]);

  // ▼▼▼ 2. 自動保存ロジック (1秒デバウンス) ▼▼▼
  useEffect(() => {
    if (!userId) return;

    const timer = setTimeout(() => {
      console.log("Auto-saving...");
      saveMindMap(userId, nodes, edges);
    }, 1000);

    return () => clearTimeout(timer);
  }, [nodes, edges, userId]);


  // --- 以下、右クリックメニューなどの処理 ---

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
            style: {
              backgroundColor: "transparent",
              width: "200px",
            },
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
      console.error("AI generation error:", err);
      alert(`AI生成エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [contextMenu, setNodes, setEdges]);

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
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <AuthButton />
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}