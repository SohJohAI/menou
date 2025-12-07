import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    // 1. まずAPIキーの存在確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "API key is missing" },
            { status: 500 }
        );
    }

    try {
        // 2. リクエストボディから treeText を取り出す（これが抜けてた！）
        const { treeText } = await request.json();

        if (!treeText) {
            return NextResponse.json(
                { error: "No text provided" },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // 3. モデル指定（gemini-1.5-pro 推奨だが、なければ flash で）
        // ※ 2.5 は存在しないはずなので 1.5 に修正
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-preview-02-05" });

        const prompt = `
あなたは敏腕の書籍編集者です。
渡された「思考の断片（マインドマップ）」を読み解き、以下のフォーマットで魅力的な「小説企画書」を作成してください。

【思考データ】
${treeText}

【出力フォーマット】
## タイトル案 (3つ)
## ログライン (一言で言うと)
## コンセプト (この物語の売り)
## あらすじ (起承転結)
## 主要キャラクター
## 世界観設定
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ proposal: responseText });

    } catch (error) {
        console.error("Draft API error:", error);
        return NextResponse.json(
            { error: "Failed to generate proposal" },
            { status: 500 }
        );
    }
}