import { Node, Edge, Position } from "@xyflow/react";
import { NodeData } from "../components/MindMapNode";
import dagre from "dagre";

export const getContextHistory = (node: Node<NodeData>, nodes: Node<NodeData>[], edges: Edge[]): string => {
    let steps: { question?: string; answer?: string }[] = [];
    let currentNode: Node<NodeData> | undefined = node;

    while (currentNode) {
        const question = currentNode.data.question;
        const answer = currentNode.data.label;

        steps.push({ question, answer });

        // Find the parent node
        const edge = edges.find((e) => e.target === currentNode?.id);
        if (!edge) {
            currentNode = undefined;
        } else {
            currentNode = nodes.find((n) => n.id === edge.source);
        }
    }

    // Reverse to chronological order (Root -> Leaf)
    steps = steps.reverse();

    return steps
        .map((step, index) => {
            let stepText = `[Step ${index + 1}]`;
            if (step.question) stepText += `\nQ: ${step.question}`;
            if (step.answer) stepText += `\nA: ${step.answer}`;
            return stepText;
        })
        .join("\n\n");
};

export const buildFullTreeText = (nodes: Node<NodeData>[], edges: Edge[]): string => {
    const getChildren = (nodeId: string): Node<NodeData>[] => {
        return edges
            .filter((e) => e.source === nodeId)
            .map((e) => nodes.find((n) => n.id === e.target))
            .filter((n): n is Node<NodeData> => n !== undefined);
    };

    const traverse = (node: Node<NodeData>, depth: number): string => {
        const indent = "  ".repeat(depth);
        let text = "";

        // Root node usually just has a label, but let's handle q/a if present
        const q = node.data.question;
        const a = node.data.label;

        if (depth === 0) {
            text += `${indent}- (Root) ${a}\n`;
        } else {
            const parts = [];
            if (q) parts.push(`Q: ${q}`);
            if (a) parts.push(`A: ${a}`);
            text += `${indent}- ${parts.join(" ")}\n`;
        }

        const children = getChildren(node.id);
        for (const child of children) {
            text += traverse(child, depth + 1);
        }
        return text;
    };

    // Find root nodes (no incoming edges)
    const rootNodes = nodes.filter((n) => !edges.some((e) => e.target === n.id));

    return rootNodes.map((root) => traverse(root, 0)).join("\n");
};

export const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction = "LR"
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

