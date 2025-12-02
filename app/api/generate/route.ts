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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "あなたは敏腕編集者です。ユーザーのアイデアを具体化し、別視点を与えるための質問を投げかけてください。レスポンスは必ず3つの問いかけをJSON形式で返してください。例: {\"questions\": [\"問いかけ1\", \"問いかけ2\", \"問いかけ3\"]}" }],
        },
        {
          role: "model",
          parts: [{ text: "{\"questions\": [\"そのアイデアの最も革新的な点は何ですか？\", \"ターゲットとするユーザーは誰で、彼らのどのような課題を解決しますか？\", \"このアイデアをさらに発展させるために、どのようなリソースやスキルが必要ですか？\"]}" }],
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
