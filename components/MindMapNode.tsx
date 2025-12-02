"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

export type NodeData = {
  label: string;
  isGhost?: boolean;
  aiQuestion?: string;
};

function MindMapNode({ id, data }: NodeProps) {
  const nodeData = data as NodeData;
  const { setNodes } = useReactFlow();

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newLabel = evt.target.value;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            const currentNodeData = node.data as NodeData;
            return {
              ...node,
              data: {
                ...currentNodeData,
                label: newLabel,
                isGhost: newLabel.length === 0 ? currentNodeData.isGhost : false, // 実体化ロジック
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );

  const isGhost = nodeData.isGhost;
  const aiQuestion = nodeData.aiQuestion;

  const containerClasses = `
    ${isGhost ? "bg-blue-50 border-dashed border-blue-400 rounded-2xl" : "bg-yellow-100 border-yellow-300 rounded-lg"}
    shadow-md p-2 text-slate-800
  `;

  return (
    <div
      className={containerClasses}
      style={{ minWidth: "150px", minHeight: "50px" }}
    >
      <Handle type="target" position={Position.Top} />
      {isGhost && aiQuestion && (
        <p className="text-blue-700 text-sm mb-1">{aiQuestion}</p>
      )}
      <textarea
        id={`text-${id}`}
        name="text"
        onChange={onChange}
        className="nodrag w-full h-full resize-none bg-transparent focus:outline-none"
        value={isGhost ? "" : nodeData.label} // ゴーストモードではテキストエリアを空にする
        placeholder="アイデアを入力..."
        style={{ minWidth: "100px", minHeight: "30px" }}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default MindMapNode;
