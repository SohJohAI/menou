import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sourceA, sourceB } = body;

        if (!sourceA || !sourceB) {
            console.error("Missing sourceA or sourceB:", body);
            return NextResponse.json({ error: "Source A and B are required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set");
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-2.5-flash as requested. If fails, try gemini-1.5-flash manually if needed, 
        // but for now strict to 2.5-flash.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
あなたは概念の錬金術師です。
以下の2つの概念（アイデア）を弁証法的に統合し、新しい1つの概念を生成してください。
AとBを単に並べるのではなく、矛盾を解決したり、化学反応を起こして、全く新しいアイデアに昇華させてください。

概念A: "${sourceA}"
概念B: "${sourceB}"

# 命令
- 出力はJSON形式 \`{"result": "合成された短いアイデア"}\` のみ。
- 文字数制限緩和: 40文字以内。
- フォーマット: "概念名\n短い説明" (改行を入れること)。
- 説明は必須。
`;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            });

            const responseText = result.response.text();

            // Try parse using normal JSON.parse
            const parsed = JSON.parse(responseText);
            return NextResponse.json(parsed);

        } catch (genError: any) {
            console.error("Gemini Generation/Parsing Error:", genError);
            console.error("Raw Response Text (if available):", genError.response?.text?.());
            return NextResponse.json({ error: "Failed to generate content from AI.", details: genError.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Synthesis API Logic Error:", error);
        return NextResponse.json({ error: "Internal Server Error in Synthesis API", details: error.message }, { status: 500 });
    }
}
