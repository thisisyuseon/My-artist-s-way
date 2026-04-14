"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MorningEntry, ArtistDate, CheckinForm, Stats } from "@/types";
import { calcStats, calcWeekFromStartDate, todayStr, fmtDate, rand } from "@/app/lib/utils";
import { PROMPTS, WEEKS } from "@/app/lib/constants";
import { PM, PD, PB, GM, GD, GB, BG, MUT, Tag, Inp, FieldLbl, Card, BackBtn, SaveBtn } from "@/components/ui";
import { MOODS, WEEK_FEELINGS, ARTIST_CATS, TARGET_CHARS } from "@/app/lib/constants";

type Tab = "home" | "write" | "artist-date" | "checkin";

// ── Notion API 클라이언트 헬퍼 ───────────────────────────────────────
async function notionCall(body: Record<string, unknown>) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function App() {
  const [tab, setTab]       = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  // Notion에서 로드한 데이터
  const [mpDates, setMpDates]         = useState<Set<string>>(new Set());
  const [mpContentMap, setMpContentMap] = useState<Record<string, { text: string; mood: string }>>({});
  const [ciDoneWeeks, setCiDoneWeeks] = useState<Set<number>>(new Set());
  const [currentWeek, setCurrentWeek] = useState(5);

  // 모닝페이지 쓰기 state
  const [mpText, setMpText]     = useState("");
  const [mpMood, setMpMood]     = useState("");
  const [mpPrompt, setMpPrompt] = useState(() => rand(PROMPTS));
  const [mpMsg, setMpMsg]       = useState("");
  const [mpSaving, setMpSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // 아티스트 데이트 state
  const [ad, setAd]       = useState<ArtistDate>({ title: "", date: todayStr(), place: "", category: "", alone: true, feeling: "", keywords: "" });
  const [adMsg, setAdMsg] = useState("");
  const [adSaving, setAdSaving] = useState(false);

  // AI 추천 state
  const [aiMood, setAiMood]         = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiRec, setAiRec]           = useState<{ title: string; place: string; category: string; reason: string; tips: string } | null>(null);
  const [aiErr, setAiErr]           = useState("");

  // 체크인 state
  const [ciWeek, setCiWeek]       = useState(5);
  const [ciForm, setCiForm]       = useState<CheckinForm>({ mpDays: 7, adDone: false, readingFast: false, feeling: "", discovery: "", nextWeek: "" });
  const [ciAnswers, setCiAnswers] = useState<string[]>(Array(5).fill(""));
  const [ciMsg, setCiMsg]         = useState("");
  const [ciSaving, setCiSaving]   = useState(false);

  // ── Notion 초기 로드 ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [mpRes, ciRes] = await Promise.all([
          notionCall({ action: "query_morning" }),
          notionCall({ action: "query_checkin" }),
        ]);

        const entries: MorningEntry[] = mpRes.entries ?? [];
        const dates = entries.map((e) => e.date).filter(Boolean);
        const contentMap: Record<string, { text: string; mood: string }> = {};
        entries.forEach((e) => { if (e.date) contentMap[e.date] = { text: e.text, mood: e.mood }; });

        setMpDates(new Set(dates));
        setMpContentMap(contentMap);

        const ciSet = new Set<number>((ciRes.weeks ?? []).map(Number));
        setCiDoneWeeks(ciSet);

        // 캘린더 기반: 환경변수 → 첫 모닝페이지 날짜 순서로 프로그램 시작일 결정
        const sortedDates = [...dates].sort();
        const programStartDate =
          process.env.NEXT_PUBLIC_PROGRAM_START_DATE ||
          (sortedDates.length > 0 ? sortedDates[0] : null);
        const calendarWeek = programStartDate
          ? calcWeekFromStartDate(programStartDate)
          : 1;

        // 체크인 기반: 마지막 완료 주차 + 1
        const checkinWeek = ciSet.size > 0
          ? Math.min(Math.max(...ciSet) + 1, 12)
          : 1;

        // 둘 중 더 큰 값 사용 (이미 완료한 주차보다 뒤로 가지 않도록)
        const resolvedWeek = Math.max(calendarWeek, checkinWeek);
        setCurrentWeek(resolvedWeek);
        setCiWeek(resolvedWeek);
      } catch {
        setLoadErr(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = todayStr();
  const [isSaturday, setIsSaturday] = useState(false);
  useEffect(() => { setIsSaturday(new Date().getDay() === 6); }, []);
  const stats: Stats = calcStats([...mpDates]);
  const { streak, week, weekCount, todayDone } = stats;

  // ── 핸들러: 모닝페이지 저장 ─────────────────────────────────────────
  async function handleMpSave() {
    if (!mpText.trim()) return;
    setMpSaving(true); setMpMsg("저장 중...");
    const res = await notionCall({ action: "create_morning", date: today, text: mpText, mood: mpMood });
    if (!res.error) {
      setMpDates((p) => new Set([...p, today]));
      setMpContentMap((p) => ({ ...p, [today]: { text: mpText, mood: mpMood } }));
      setMpMsg("✓ 노션에 저장됐어요!");
    } else {
      setMpMsg(`저장 실패: ${res.error}`);
    }
    setMpSaving(false);
  }

  // ── 핸들러: AI 아티스트 데이트 추천 ─────────────────────────────────
  async function handleAiRecommend() {
    if (!aiMood) return;
    setAiLoading(true); setAiErr(""); setAiRec(null);
    const w = WEEKS[currentWeek - 1];
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: aiMood, week: currentWeek, theme: w.theme, intro: w.intro }),
    });
    const data = await res.json();
    if (data.recommendation) {
      setAiRec(data.recommendation);
    } else {
      setAiErr("추천을 가져오지 못했어요. 다시 시도해주세요.");
    }
    setAiLoading(false);
  }

  // ── 핸들러: 아티스트 데이트 저장 ────────────────────────────────────
  async function handleAdSave() {
    if (!ad.title.trim()) return;
    setAdSaving(true); setAdMsg("저장 중...");
    const res = await notionCall({ action: "create_artist", ...ad });
    if (!res.error) {
      setAd({ title: "", date: todayStr(), place: "", category: "", alone: true, feeling: "", keywords: "" });
      setAdMsg("✓ 노션에 기록됐어요!");
    } else {
      setAdMsg("저장 실패, 다시 시도해주세요.");
    }
    setAdSaving(false);
  }

  // ── 핸들러: 체크인 저장 ──────────────────────────────────────────────
  async function handleCiSave() {
    if (!ciForm.feeling) return;
    setCiSaving(true); setCiMsg("저장 중...");
    const w = WEEKS[ciWeek - 1];
    const res = await notionCall({
      action: "create_checkin",
      week: ciWeek, theme: w.theme, date: today,
      mpDays: ciForm.mpDays, adDone: ciForm.adDone, readingFast: ciForm.readingFast,
      feeling: ciForm.feeling, answers: ciAnswers, questions: w.questions,
      discovery: ciForm.discovery, nextWeek: ciForm.nextWeek,
    });
    if (!res.error) {
      setCiDoneWeeks((p) => new Set([...p, ciWeek]));
      const next = Math.min(ciWeek + 1, 12);
      setCurrentWeek(next); setCiWeek(next);
      setCiMsg("✓ 노션에 저장됐어요!");
    } else {
      setCiMsg("저장 실패, 다시 시도해주세요.");
    }
    setCiSaving(false);
  }

  // ── 로딩 / 에러 ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${PB}`, borderTopColor: PM, animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: MUT, fontSize: 14 }}>Notion에서 기록을 불러오는 중...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loadErr) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
      <p style={{ fontSize: 32 }}>😅</p>
      <p style={{ color: PD, fontSize: 15, textAlign: "center" }}>Notion 연결에 실패했어요.<br />페이지를 새로고침 해주세요.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: "10px 24px", background: PM, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>다시 시도</button>
    </div>
  );

  // ── 모닝페이지 쓰기 ──────────────────────────────────────────────────
  if (tab === "write") return (
    <div style={{ minHeight: "100vh", background: BG, padding: "24px 20px" }}>
      <BackBtn onClick={() => setTab("home")} />
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: `linear-gradient(135deg,${PB},${GB})`, borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#72243E", fontWeight: 500, letterSpacing: "0.05em" }}>오늘의 프롬프트</p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#27500A", lineHeight: 1.6 }}>{mpPrompt}</p>
        </div>
        <textarea
          ref={textRef} value={mpText}
          onChange={(e) => { setMpText(e.target.value); setMpMsg(""); }}
          placeholder="판단하지 말고, 멈추지 말고, 그냥 써보세요..."
          style={{ width: "100%", minHeight: 320, border: `1.5px solid ${mpText.length >= TARGET_CHARS ? GM : PM}`, borderRadius: 12, padding: 16, fontSize: 16, lineHeight: 1.8, background: "#fff", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.3s" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <div style={{ flex: 1, height: 6, background: "#e8e0e8", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(mpText.length / TARGET_CHARS, 1) * 100}%`, height: "100%", background: mpText.length >= TARGET_CHARS ? GM : PM, borderRadius: 99, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 12, color: MUT, minWidth: 86, textAlign: "right" }}>{mpText.length}/{TARGET_CHARS}자 {mpText.length >= TARGET_CHARS && "✓"}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: MUT, marginBottom: 8 }}>오늘 기분</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MOODS.map((m) => <Tag key={m} label={m} active={mpMood === m} onClick={() => setMpMood(m)} />)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1 }}><SaveBtn onClick={handleMpSave} disabled={!mpText.trim()} saving={mpSaving} msg={mpMsg} label="노션에 저장하기" /></div>
          <button type="button" onClick={() => setMpPrompt(rand(PROMPTS))} style={{ background: "none", border: `1px solid ${PM}`, color: PD, borderRadius: 10, padding: "12px 14px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>다른 프롬프트</button>
        </div>
        <p style={{ fontSize: 12, color: MUT, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>완벽하지 않아도 괜찮아요. 그냥 쓰는 것, 그게 전부예요.</p>
      </div>
    </div>
  );

  // ── 아티스트 데이트 ──────────────────────────────────────────────────
  if (tab === "artist-date") return (
    <div style={{ minHeight: "100vh", background: BG, padding: "24px 20px" }}>
      <BackBtn onClick={() => setTab("home")} />
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: PD, letterSpacing: "0.1em", fontWeight: 500 }}>THE ARTIST'S WAY</p>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500 }}>Artist Date 기록</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: MUT }}>나 혼자 하는 창의적인 나들이를 기록해요</p>

        {/* AI 추천 패널 */}
        <div style={{ background: `linear-gradient(135deg,#FFF5F8,#F5FFF0)`, border: `1.5px solid ${PM}44`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: PD, fontWeight: 500, letterSpacing: "0.05em" }}>✨ AI 아티스트 데이트 추천</p>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: MUT }}>지금 기분을 선택하면 AI가 오늘 딱 맞는 나들이를 추천해줘요</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {MOODS.map((m) => (
              <Tag key={m} label={m} active={aiMood === m} onClick={() => { setAiMood(m); setAiRec(null); setAiErr(""); }} />
            ))}
          </div>
          <button
            type="button"
            onClick={handleAiRecommend}
            disabled={!aiMood || aiLoading}
            style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: aiMood && !aiLoading ? `linear-gradient(135deg,${PM},${GM})` : "#e0d8e0", border: "none", color: aiMood && !aiLoading ? "#fff" : MUT, fontSize: 14, fontWeight: 500, cursor: aiMood && !aiLoading ? "pointer" : "not-allowed", transition: "background 0.3s" }}
          >
            {aiLoading ? "추천 생성 중..." : "🎨 AI 추천 받기"}
          </button>
          {aiErr && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#E24B4A", textAlign: "center" }}>{aiErr}</p>}
          {aiRec && (
            <div style={{ marginTop: 14, background: "#fff", borderRadius: 12, padding: "14px 16px", border: `1px solid ${GM}44` }}>
              <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 500, color: GD }}>{aiRec.title}</p>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: MUT }}>{aiRec.category} · {aiRec.place}</p>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#333", lineHeight: 1.6 }}>{aiRec.reason}</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: MUT, lineHeight: 1.5 }}>💡 {aiRec.tips}</p>
              <button
                type="button"
                onClick={() => setAd((p) => ({ ...p, title: aiRec.title, place: aiRec.place, category: aiRec.category }))}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, background: `linear-gradient(135deg,${GB},${PB})`, border: "none", color: GD, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                이 추천으로 기록 채우기 →
              </button>
            </div>
          )}
        </div>

        <Card bc={GB}>
          <Inp placeholder="제목 (예: 국립현대미술관 나들이)" value={ad.title} onChange={(v) => setAd((p) => ({ ...p, title: v }))} />
          <Inp type="date" value={ad.date} onChange={(v) => setAd((p) => ({ ...p, date: v }))} />
          <Inp placeholder="장소" value={ad.place} onChange={(v) => setAd((p) => ({ ...p, place: v }))} />
          <FieldLbl label="카테고리">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ARTIST_CATS.map((c) => <Tag key={c} label={c} active={ad.category === c} onClick={() => setAd((p) => ({ ...p, category: c }))} ac={GM} bc={GB} />)}
            </div>
          </FieldLbl>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <input type="checkbox" checked={ad.alone} onChange={(e) => setAd((p) => ({ ...p, alone: e.target.checked }))} style={{ accentColor: GM, width: 16, height: 16 }} />
            혼자 갔어요
          </label>
          <Inp placeholder="느낀점" value={ad.feeling} onChange={(v) => setAd((p) => ({ ...p, feeling: v }))} rows={3} />
          <Inp placeholder="영감 키워드 (쉼표로 구분)" value={ad.keywords} onChange={(v) => setAd((p) => ({ ...p, keywords: v }))} />
          <SaveBtn onClick={handleAdSave} disabled={!ad.title.trim()} saving={adSaving} msg={adMsg} label="노션에 기록하기" />
        </Card>
      </div>
    </div>
  );

  // ── 체크인 ────────────────────────────────────────────────────────────
  if (tab === "checkin") {
    const w = WEEKS[ciWeek - 1];
    return (
      <div style={{ minHeight: "100vh", background: BG, padding: "24px 20px" }}>
        <BackBtn onClick={() => setTab("home")} />
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: PD, letterSpacing: "0.1em", fontWeight: 500 }}>THE ARTIST'S WAY</p>
          <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 500 }}>12주 체크인</h2>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
            {WEEKS.map((wk) => (
              <button key={wk.week} type="button"
                onClick={() => { setCiWeek(wk.week); setCiAnswers(Array(5).fill("")); setCiMsg(""); }}
                style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${ciWeek === wk.week ? wk.color : PB + "99"}`, background: ciDoneWeeks.has(wk.week) ? GM : ciWeek === wk.week ? wk.color + "33" : "#fff", color: ciDoneWeeks.has(wk.week) ? GD : ciWeek === wk.week ? PD : MUT, fontSize: 12, fontWeight: ciWeek === wk.week ? 500 : 400, cursor: "pointer" }}>
                {ciDoneWeeks.has(wk.week) ? "✓" : wk.week}
              </button>
            ))}
          </div>
          <div style={{ background: `linear-gradient(135deg,${PB}88,${GB}88)`, borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: PD, fontWeight: 500 }}>Week {w.week} {w.emoji}</p>
            <h3 style={{ margin: "4px 0 6px", fontSize: 18, fontWeight: 500 }}>{w.theme}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>{w.intro}</p>
          </div>
          <Card bc={PB} style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>이번 주 과제 확인</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: MUT, minWidth: 130 }}>모닝페이지 작성 일수</span>
              <input type="number" min={0} max={7} value={ciForm.mpDays} onChange={(e) => setCiForm((p) => ({ ...p, mpDays: +e.target.value }))}
                style={{ width: 56, border: `1px solid ${PB}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, background: "#fff", outline: "none" }} />
              <span style={{ fontSize: 13, color: MUT }}>/ 7일</span>
            </div>
            {([["아티스트 데이트 했나요", "adDone"], ["읽기 금지 했나요 (Week 4~)", "readingFast"]] as const).map(([lbl, key]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <input type="checkbox" checked={ciForm[key]} onChange={(e) => setCiForm((p) => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: GM, width: 16, height: 16 }} />
                {lbl}
              </label>
            ))}
          </Card>
          <Card bc={GB} style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>장 질문에 답해보세요</p>
            {w.questions.map((q, i) => (
              <div key={i}>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: GD, lineHeight: 1.6 }}>Q{i + 1}. {q}</p>
                <Inp placeholder="자유롭게 써보세요..." value={ciAnswers[i]} onChange={(v) => { const a = [...ciAnswers]; a[i] = v; setCiAnswers(a); }} rows={3} />
              </div>
            ))}
          </Card>
          <Card bc={PB} style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>이번 주 되돌아보기</p>
            <FieldLbl label="이번 주 전반적인 느낌">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {WEEK_FEELINGS.map((f) => <Tag key={f} label={f} active={ciForm.feeling === f} onClick={() => setCiForm((p) => ({ ...p, feeling: f }))} />)}
              </div>
            </FieldLbl>
            <FieldLbl label="이번 주 가장 큰 발견">
              <Inp placeholder="이번 주에 새롭게 깨달은 것은?" value={ciForm.discovery} onChange={(v) => setCiForm((p) => ({ ...p, discovery: v }))} rows={2} />
            </FieldLbl>
            <FieldLbl label="다음 주에 가져갈 것">
              <Inp placeholder="다음 주로 이어갈 의도나 다짐은?" value={ciForm.nextWeek} onChange={(v) => setCiForm((p) => ({ ...p, nextWeek: v }))} rows={2} />
            </FieldLbl>
          </Card>
          <SaveBtn onClick={handleCiSave} disabled={!ciForm.feeling} saving={ciSaving} msg={ciMsg} label={`Week ${ciWeek} 체크인 저장하기`} />
        </div>
      </div>
    );
  }

  // ── 홈 ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "28px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: PD, fontWeight: 500 }}>THE ARTIST'S WAY</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 500, lineHeight: 1.2 }}>Morning Pages</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: MUT }}>매일 아침, 검열 없이 씁니다</p>
        </div>
        {/* 현재 주차 배너 */}
        <div style={{ background: `linear-gradient(135deg,${PB}cc,${GB}cc)`, borderRadius: 12, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: PD, fontWeight: 500 }}>현재 진행 중</p>
            <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 500 }}>Week {currentWeek} {WEEKS[currentWeek - 1].emoji} — {WEEKS[currentWeek - 1].theme}</p>
          </div>
          <button type="button" onClick={() => { setCiWeek(currentWeek); setCiMsg(""); setTab("checkin"); }}
            style={{ background: PM, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            체크인 →
          </button>
        </div>
        {/* 통계 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "연속 작성", value: `${streak}일`, c: PM },
            { label: "이번 주", value: `${weekCount}/7`, c: GM },
            { label: "체크인", value: `${ciDoneWeeks.size}/12주`, c: "#7F77DD" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.c}44`, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: s.c }}>{s.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: MUT }}>{s.label}</p>
            </div>
          ))}
        </div>
        {/* 주간 트래커 */}
        <div style={{ background: "#fff", border: `1px solid ${PB}`, borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: MUT, fontWeight: 500 }}>이번 주 모닝페이지</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            {week.map((w) => (
              <div key={w.key} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, margin: "0 auto 4px", background: w.done ? (w.key === today ? PM : GM) : "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center", border: w.key === today ? `2px solid ${PD}` : "none" }}>
                  {w.done && <span style={{ fontSize: 14, color: "#fff" }}>✓</span>}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: w.key === today ? PD : MUT, fontWeight: w.key === today ? 500 : 400 }}>{w.day}</p>
              </div>
            ))}
          </div>
        </div>
        {/* 12주 진행도 */}
        <div style={{ background: "#fff", border: `1px solid ${GB}`, borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: MUT, fontWeight: 500 }}>12주 여정 진행도</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {WEEKS.map((wk) => (
              <div key={wk.week} onClick={() => { setCiWeek(wk.week); setCiMsg(""); setTab("checkin"); }}
                style={{ width: 32, height: 32, borderRadius: 8, background: ciDoneWeeks.has(wk.week) ? GM : wk.week === currentWeek ? PB : "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: wk.week === currentWeek ? `2px solid ${PD}` : "none", fontSize: 11, color: ciDoneWeeks.has(wk.week) ? GD : wk.week === currentWeek ? PD : MUT, fontWeight: wk.week === currentWeek ? 500 : 400 }}>
                {ciDoneWeeks.has(wk.week) ? "✓" : wk.week}
              </div>
            ))}
          </div>
        </div>
        {/* 토요일 AI 추천 배너 */}
        {isSaturday && (
          <div
            onClick={() => setTab("artist-date")}
            style={{ background: `linear-gradient(135deg,${PM}22,${GM}22)`, border: `1.5px solid ${PM}66`, borderRadius: 12, padding: "14px 18px", marginBottom: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, color: PD, fontWeight: 500 }}>🎨 오늘은 토요일!</p>
              <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>AI 아티스트 데이트 추천 받기</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: MUT }}>기분에 맞는 나만의 나들이를 찾아줘요</p>
            </div>
            <span style={{ fontSize: 22 }}>✨</span>
          </div>
        )}

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <button type="button"
            onClick={() => {
              const cached = mpContentMap[today];
              if (cached) { setMpText(cached.text); setMpMood(cached.mood); }
              else { setMpText(""); setMpMood(""); setMpPrompt(rand(PROMPTS)); }
              setMpMsg(""); setTab("write");
              setTimeout(() => textRef.current?.focus(), 100);
            }}
            style={{ width: "100%", padding: "15px 0", borderRadius: 12, background: todayDone ? `linear-gradient(135deg,${GB},${GM})` : `linear-gradient(135deg,${PB},${PM})`, border: "none", color: todayDone ? GD : PD, fontSize: 16, fontWeight: 500, cursor: "pointer" }}>
            {todayDone ? "오늘 페이지 다시 보기 →" : "오늘 모닝페이지 쓰기 →"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => setTab("artist-date")} style={{ padding: "13px 0", borderRadius: 12, background: "#fff", border: `1.5px solid ${GM}`, color: GD, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>🎨 아티스트 데이트</button>
            <button type="button" onClick={() => { setCiWeek(currentWeek); setCiMsg(""); setTab("checkin"); }} style={{ padding: "13px 0", borderRadius: 12, background: "#fff", border: `1.5px solid ${PM}`, color: PD, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>📖 주간 체크인</button>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#ccc" }}>Julia Cameron · The Artist's Way · Notion 연동</p>
      </div>
    </div>
  );
}
