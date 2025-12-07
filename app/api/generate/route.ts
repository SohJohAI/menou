import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });

    const prompt = `
あなたは厳しいプロの書籍編集者です。
ユーザーのアイデア（ノード）に対し、物語を面白くするための「短く、具体的で、鋭い問いかけ」を3つ投げかけてください。

# 禁止事項
- 「その後どうなりますか？」「具体的には？」のような、曖昧で汎用的な質問は禁止。
- 敬語や丁寧な表現は不要。クリエイターを刺激するトーンで。

# 良い質問の例
ユーザー入力: "勇者が魔王を倒す"
良い質問:
1. "魔王の死後、世界はどう混乱する？"
2. "勇者が払った最大の代償は？"
3. "実は魔王が正しかった可能性は？"

ユーザー入力: "AIと魔法の融合"
良い質問:
1. "魔法使いはAIを差別するか？"
2. "バグった魔法が引き起こす災害は？"
3. "AIに「魂」は宿るか、それとも模倣か？"

# 命令
以下の入力に対して、上記のような鋭い質問を3つ生成し、JSON形式 \`{"questions": ["...", "...", "..."]}\` で出力せよ。余計な会話は一切不要。

入力: ${text}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON using regex to handle potential Markdown code blocks
    const jsonMatch = responseText.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(jsonMatch);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions." },
      { status: 500 }
    );
  }
}
