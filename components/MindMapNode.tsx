"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

function MindMapNode({ id, data }: NodeProps) {
  const nodeData = data as { label: string };
  const { setNodes } = useReactFlow();

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            // it's important that you create a new object here
            // in order to notify React Flow that the node has changed
            return {
              ...node,
              data: {
                ...node.data,
                label: evt.target.value,
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );

  return (
    <div
      className="bg-yellow-100 border border-yellow-300 rounded-lg shadow-md p-2"
      style={{ minWidth: "150px", minHeight: "50px" }}
    >
      <Handle type="target" position={Position.Top} />
      <textarea
        id={`text-${id}`}
        name="text"
        onChange={onChange}
        className="nodrag w-full h-full resize-none bg-transparent focus:outline-none"
        value={nodeData.label}
        style={{ minWidth: "100px", minHeight: "30px" }}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default MindMapNode;
