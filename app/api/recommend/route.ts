import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { mood, week, theme, intro } = await req.json();

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `당신은 Julia Cameron의 "아티스트 웨이" 프로그램 전문가입니다.
아티스트 데이트는 내면 아이를 위한 혼자만의 창의적 나들이입니다.

사용자 정보:
- 현재 기분: ${mood}
- 현재 주차: Week ${week} — ${theme}
- 이번 주 주제: ${intro}

이 사람의 기분과 현재 주차 테마에 딱 맞는 토요일 아티스트 데이트를 추천해주세요.

반드시 아래 JSON만 응답하세요 (다른 텍스트 없이):
{
  "title": "짧고 매력적인 제목 (예: 북촌 한옥마을 산책)",
  "place": "구체적인 장소 또는 활동",
  "category": "${["🎨 전시/미술관", "🎬 영화", "📚 책/서점", "🎵 음악/공연", "🚶 산책/자연", "☕ 카페/혼밥", "✏️ 만들기/공방", "🌊 기타"].join(" / ")} 중 하나",
  "reason": "왜 지금 이 사람에게 이 활동이 좋은지 2문장",
  "tips": "실용적인 팁 한 가지"
}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "파싱 실패" }, { status: 500 });

    const recommendation = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ recommendation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
