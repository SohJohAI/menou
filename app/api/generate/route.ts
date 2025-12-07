import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { text, mode = "question" } = await req.json(); // mode defaults to "question"

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

    // Define prompts based on mode
    let systemInstruction = "";
    let exampleResponse = "";

    if (mode === "inspiration") {
      // Inspiration Mode: Crazy Co-author
      systemInstruction = "あなたはクレイジーな共著者です。ユーザーのアイデアに対し、「もし〜なら」の仮定や、逆転の発想、常識を覆すような提案を3つ投げかけてください。1行20文字以内。前置き不要。JSON形式のみ。例: {\"questions\": [\"提案1\", \"提案2\", \"提案3\"]}";
      exampleResponse = "{\"questions\": [\"実は敵が父親だとしたら？\", \"舞台を海中に変えてみる\", \"主人公を殺してしまう\"]}";
    } else {
      // Question Mode (Default): Strict Editor
      systemInstruction = "あなたは厳しいプロの書籍編集者です。ユーザーのアイデアに対し、論理的な穴を突く、詳細を問う、動機を確認するような「短く鋭い問いかけ」を3つ生成してください。1行20文字以内。前置き不要。JSON形式のみ。例: {\"questions\": [\"問いかけ1\", \"問いかけ2\", \"問いかけ3\"]}";
      exampleResponse = "{\"questions\": [\"なぜその武器を選んだ？\", \"矛盾する設定はないか？\", \"主人公の動機が弱い\"]}";
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
