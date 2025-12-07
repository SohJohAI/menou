import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { sourceA, sourceB } = await req.json();

        if (!sourceA || !sourceB) {
            return NextResponse.json({ error: "Source A and B are required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
あなたは概念の錬金術師です。
以下の2つの概念（アイデア）を弁証法的に統合し、新しい1つの概念を生成してください。
AとBを単に並べるのではなく、矛盾を解決したり、化学反応を起こして、全く新しいアイデアに昇華させてください。

概念A: "${sourceA}"
概念B: "${sourceB}"

# 命令
- 出力はJSON形式 \`{"result": "合成された短いアイデア"}\` のみ。
- 20文字以内。
- 説明不要。
`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Synthesis error:", error);
        return NextResponse.json({ error: "Failed to synthesize" }, { status: 500 });
    }
}
