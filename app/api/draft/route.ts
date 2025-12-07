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
        // 3. モデル指定
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
あなたは敏腕の書籍編集者であり、情熱的なクリエイターです。
以下のマインドマップ（アイデアの種）を元に、出版社に持ち込むための「小説企画書」を作成してください。

# 必須条件
- タイトル案（キャッチーなものを3つ）
- ログライン（一行で内容を表す）
- あらすじ（起承転結）
- 主要キャラクター
- ターゲット読者層
- この作品の「売り」（アピールポイント）

# 文体の指定
- プレゼンテーションで語りかけるような、熱量のある「です・ます」調にしてください。
- 硬いビジネス用語は避け、クリエイターの心に響くエモーショナルな表現を使ってください。
- 読者をワクワクさせるようなトーンで書いてください。

# マインドマップの内容
${treeText}

出力はマークダウン形式のみ。余計な前置きは不要。
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