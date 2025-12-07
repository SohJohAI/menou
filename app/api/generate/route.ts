import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { text, mode = "question", depth = 0 } = await req.json(); // mode defaults to "question", depth defaults to 0

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Define prompts based on mode AND depth
    let systemInstruction = "";
    let exampleResponse = "";

    if (mode === "inspiration") {
      // Inspiration Mode: Crazy Co-author (Unchanged by depth for now, or could act crazy differently)
      systemInstruction = "あなたはクレイジーな共著者です。ユーザーのアイデアに対し、「もし〜なら」の仮定や、逆転の発想、常識を覆すような提案を3つ投げかけてください。1行20文字以内。前置き不要。JSON形式のみ。例: {\"questions\": [\"提案1\", \"提案2\", \"提案3\"]}";
      exampleResponse = "{\"questions\": [\"実は敵が父親だとしたら？\", \"舞台を海中に変えてみる\", \"主人公を殺してしまう\"]}";
    } else {
      // Question Mode (Default): Strict Editor - ADAPTIVE
      let phaseInstruction = "";

      if (depth <= 1) {
        // Phase 1: Foundation (Depth 0-1)
        phaseInstruction = "【Phase 1: 基礎構築】物語の土台、ジャンル、主人公の動機、世界観のルールなど、広範な設定を固めるための基本的な質問をしてください。「結末」や「詳細な伏線」はまだ早すぎます。";
      } else if (depth <= 3) {
        // Phase 2: Conflict (Depth 2-3)
        phaseInstruction = "【Phase 2: 展開と対立】具体的なエピソード、敵対者との関係、障害、葛藤、シーンの描写について深掘りしてください。「ジャンル」などの基礎的な質問は今更不要です。";
      } else {
        // Phase 3: Climax (Depth 4+)
        phaseInstruction = "【Phase 3: 詳細と結末】伏線の回収、心理描写の矛盾、意外な結末、隠された真実など、物語の核心を突く鋭い質問をしてください。";
      }

      systemInstruction = `あなたは厳しいプロの書籍編集者です。ユーザーのアイデア（深さ:${depth}）に対し、以下のフェーズ意識を持って、論理的な穴を突く、詳細を問う「短く鋭い問いかけ」を3つ生成してください。\n\n${phaseInstruction}\n\n1行20文字以内。前置き不要。JSON形式のみ。`;
      exampleResponse = "{\"questions\": [\"なぜその武器を選んだ？\", \"矛盾する設定はないか？\", \"主人公の動機が弱い\"]}"; // Example remains generic valid JSON
    }

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemInstruction }],
        },
        {
          role: "model",
          parts: [{ text: exampleResponse }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: mode === "inspiration" ? 1.2 : 0.7, // Higher creativity for inspiration
      },
    });

    const result = await chat.sendMessage(text);
    const responseText = result.response.text();
    const parsedResponse = JSON.parse(responseText);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions." },
      { status: 500 }
    );
  }
}
