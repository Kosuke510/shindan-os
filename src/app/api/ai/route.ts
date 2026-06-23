import { NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  const body = await request.json();
  const { type, weakTopics, subject, topic } = body;

  let systemPrompt = "";
  let userPrompt = "";

  if (type === "analyze") {
    systemPrompt = `あなたは中小企業診断士一次試験の学習コーチです。
学習者の苦手分野を分析し、具体的な改善アドバイスを日本語で提供してください。
回答は箇条書きを使わず、自然な文章で300字以内にまとめてください。`;
    userPrompt = `以下の苦手問題データを分析してください：
${JSON.stringify(weakTopics, null, 2)}

1. 苦手の傾向（どの科目・分野が多いか）
2. 優先的に取り組むべき分野
3. 学習のアドバイス
を日本語で教えてください。`;
  } else if (type === "generate") {
    systemPrompt = `あなたは中小企業診断士一次試験の問題作成専門家です。
指定された科目・テーマで、本試験レベルの5択問題を1問作成してください。
必ずJSON形式のみで返答してください。他のテキストは不要です。
フォーマット:
{
  "question": "問題文",
  "choices": ["ア: 選択肢1", "イ: 選択肢2", "ウ: 選択肢3", "エ: 選択肢4", "オ: 選択肢5"],
  "answer": "正解の選択肢（例: ウ: 選択肢3）",
  "explanation": "解説（200字以内）"
}`;
    userPrompt = `科目: ${subject}\nテーマ: ${topic}\n\nこの内容で中小企業診断士一次試験レベルの5択問題を1問作成してください。`;
  } else {
    return NextResponse.json({ error: "不明なリクエストタイプです" }, { status: 400 });
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error?.message ?? "OpenAI APIエラー" }, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? "";

  if (type === "generate") {
    try {
      const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return NextResponse.json({ result: parsed });
    } catch {
      return NextResponse.json({ error: "問題の生成に失敗しました。もう一度お試しください。" }, { status: 500 });
    }
  }

  return NextResponse.json({ result: content });
}
