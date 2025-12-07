"use client";

import { useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

export type NodeData = {
  label: string;
  isGhost?: boolean;
  question?: string;
  variant?: "question" | "inspiration" | "alchemy";
};

function MindMapNode({ id, data }: NodeProps) {
  const nodeData = data as NodeData;
  const { setNodes } = useReactFlow();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize Logic
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [nodeData.label]);

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
                isGhost: newLabel.length === 0 ? currentNodeData.isGhost : false,
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

  let containerClasses = "shadow-md p-2 text-slate-800 transition-all";

  if (variant === "alchemy") {
    containerClasses += " bg-orange-50 border-2 border-orange-500 rounded-lg shadow-xl";
  } else if (variant === "question") {
    containerClasses += " bg-slate-50 border border-blue-300 rounded-lg";
  } else if (variant === "inspiration") {
    containerClasses += " bg-yellow-50 border border-yellow-400 rounded-lg";
  } else if (isGhost) {
    containerClasses += " bg-blue-50 border-dashed border-blue-400 rounded-2xl";
  } else {
    containerClasses += " bg-yellow-100 border-yellow-300 rounded-lg";
  }

  const isAlchemy = variant === "alchemy";

  return (
    <div
      className={containerClasses}
      style={{ minWidth: isAlchemy ? "250px" : "150px", minHeight: isAlchemy ? "80px" : "50px" }}
    >
      <Handle type="target" position={Position.Top} />
      {question && (
        <p className="font-bold text-sm mb-1 text-blue-700">{question}</p>
      )}
      <textarea
        ref={textareaRef}
        id={`text-${id}`}
        name="text"
        onChange={onChange}
        className={`nodrag w-full resize-none bg-transparent focus:outline-none overflow-hidden ${isAlchemy ? "text-lg font-bold" : "text-sm"}`}
        value={nodeData.label}
        placeholder="回答を入力..."
        rows={1}
        style={{ minWidth: "100px" }}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default MindMapNode;
