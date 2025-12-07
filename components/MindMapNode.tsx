"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

export type NodeData = {
  label: string;
  isGhost?: boolean;
  question?: string;
  variant?: "question" | "inspiration" | "alchemy"; // Added variant
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
  const question = nodeData.question;
  const variant = nodeData.variant;

  let containerClasses = "shadow-md p-2 text-slate-800 transition-all"; // Base classes

  if (variant === "alchemy") {
    containerClasses += " bg-orange-50 border-2 border-orange-500 rounded-lg shadow-xl";
  } else if (variant === "question") {
    containerClasses += " bg-slate-50 border border-blue-300 rounded-lg";
  } else if (variant === "inspiration") {
    containerClasses += " bg-yellow-50 border border-yellow-400 rounded-lg";
  } else if (isGhost) {
    containerClasses += " bg-blue-50 border-dashed border-blue-400 rounded-2xl";
  } else {
    containerClasses += " bg-yellow-100 border-yellow-300 rounded-lg"; // Default existing style
  }

  const isAlchemy = variant === "alchemy";

  return (
    <div
      className={containerClasses}
      style={{ minWidth: isAlchemy ? "250px" : "150px", minHeight: isAlchemy ? "80px" : "50px" }} // Alchemy nodes are bigger
    >
      <Handle type="target" position={Position.Top} />
      {question && ( // Always show question if it exists
        <p className="font-bold text-sm mb-1 text-blue-700">{question}</p>
      )}
      <textarea
        id={`text-${id}`}
        name="text"
        onChange={onChange}
        className={`nodrag w-full h-full resize-none bg-transparent focus:outline-none ${isAlchemy ? "text-lg font-bold" : "text-sm"}`}
        value={nodeData.label} // Always show user's label
        placeholder="回答を入力..."
        style={{ minWidth: "100px", minHeight: "30px" }}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default MindMapNode;
