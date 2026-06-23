"use client";

import { useState } from "react";
import { Bot, Brain, Loader2, Sparkles, X } from "lucide-react";
import type { LearningState } from "@/types";
import { questions } from "@/data/questionCatalog";
import { subjectMap } from "@/data/subjects";

interface AIViewProps {
  state: LearningState;
}

interface GeneratedQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

type Tab = "analyze" | "generate";

export function AIView({ state }: AIViewProps) {
  const [tab, setTab] = useState<Tab>("analyze");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [generatedQ, setGeneratedQ] = useState<GeneratedQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("経済学・経済政策");
  const [topic, setTopic] = useState("");
  const [revealed, setRevealed] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    const weakTopics = state.weakPoints.map((wp) => {
      const q = questions.find((item) => item.id === wp.questionId);
      return q ? { subject: subjectMap[q.subject]?.name ?? q.subject, topic: q.topic, grade: wp.lastGrade } : null;
    }).filter(Boolean);

    const progress = Object.values(state.questionProgress);
    const totalAttempts = progress.reduce((sum, p) => sum + p.attempts, 0);
    const totalCorrect = progress.reduce((sum, p) => sum + p.correctCount, 0);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analyze",
          weakTopics: {
            weakPoints: weakTopics,
            totalAttempts,
            correctRate: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
            weakCount: state.weakPoints.length,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysisResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedQ(null);
    setRevealed(false);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generate", subject, topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedQ(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f6f7fb] pb-24">
      <div className="bg-[#17213a] px-5 pb-6 pt-14">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-500/20">
            <Bot size={20} className="text-blue-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-300">AI アシスタント</p>
            <h1 className="text-lg font-black text-white">AI学習サポート</h1>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-5 flex gap-2 rounded-xl bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("analyze")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-black transition ${tab === "analyze" ? "bg-[#17213a] text-white" : "text-slate-500"}`}
          >
            <Brain size={15} />
            苦手分析
          </button>
          <button
            type="button"
            onClick={() => setTab("generate")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-black transition ${tab === "generate" ? "bg-[#17213a] text-white" : "text-slate-500"}`}
          >
            <Sparkles size={15} />
            問題生成
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <X size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {tab === "analyze" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-black text-slate-800">苦手傾向をAIが分析</h2>
              <p className="mb-4 text-xs leading-5 text-slate-500">
                これまでの学習履歴（正答率・Weak問題 {state.weakPoints.length}件）をもとに、AIが苦手の傾向と対策を教えてくれます。
              </p>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                {loading ? "分析中..." : "苦手を分析する"}
              </button>
            </div>

            {analysisResult && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Bot size={16} className="text-blue-500" />
                  <span className="text-xs font-black text-blue-600">AI分析結果</span>
                </div>
                <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{analysisResult}</p>
              </div>
            )}
          </div>
        )}

        {tab === "generate" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-black text-slate-800">AIが問題を生成</h2>
              <p className="mb-4 text-xs leading-5 text-slate-500">
                科目とテーマを指定すると、本試験レベルの5択問題をAIが作成します。
              </p>

              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">科目</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
                >
                  <option>経済学・経済政策</option>
                  <option>財務・会計</option>
                  <option>企業経営理論</option>
                  <option>運営管理</option>
                  <option>経営法務</option>
                  <option>経営情報システム</option>
                  <option>中小企業経営・政策</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">テーマ</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例: IS-LM分析、損益分岐点、会社法"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? "生成中..." : "問題を生成する"}
              </button>
            </div>

            {generatedQ && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500" />
                  <span className="text-xs font-black text-blue-600">AI生成問題</span>
                </div>
                <p className="mb-4 text-sm font-bold leading-7 text-slate-800">{generatedQ.question}</p>
                <div className="mb-4 space-y-2">
                  {generatedQ.choices.map((choice) => (
                    <div key={choice} className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                      {choice}
                    </div>
                  ))}
                </div>
                {!revealed ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="w-full rounded-xl border-2 border-blue-200 py-2.5 text-sm font-black text-blue-700"
                  >
                    正解・解説を見る
                  </button>
                ) : (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="mb-2 text-xs font-black text-blue-700">正解</p>
                    <p className="mb-3 text-sm font-bold text-blue-900">{generatedQ.answer}</p>
                    <p className="text-xs font-black text-blue-700">解説</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{generatedQ.explanation}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setGeneratedQ(null); setRevealed(false); }}
                  className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-black text-slate-600"
                >
                  別の問題を生成
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
