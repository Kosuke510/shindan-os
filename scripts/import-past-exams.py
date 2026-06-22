#!/usr/bin/env python3
"""
中小企業診断士 第1次試験 過去問インポートスクリプト
=========================================================
JF-CMCA 公式サイト (https://www.jf-cmca.jp/) から
第1次試験の問題PDF と正解PDFを取得し、
PrivateQuestionSeed 形式の JSON を生成します。

使用法:
  pip install requests pdfminer.six
  python scripts/import-past-exams.py

オプション:
  --years   処理する年度 (例: R7,R6,R5) デフォルト: 全10年度
  --subjects 処理する科目 (例: ec,fa,mc) デフォルト: 全7科目
  --out      出力先 (デフォルト: src/data/questions/private/questions.past-exams.json)
  --skip-figures  図参照問題をスキップ（デフォルト: 含める）
  --dry-run  DLせずURLリストのみ表示

注意:
  - 個人学習目的のみで使用してください
  - 生成ファイルは .gitignore 対象 (Git 管理外)
  - 解説(explanation)は正解から生成した仮のもので、随時加筆してください
"""

import argparse
import json
import re
import sys
import time
from io import BytesIO
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent  # プロジェクトルート

# ─────────────────────────────────────────────────────────
# URL カタログ
# ─────────────────────────────────────────────────────────
BASE = "https://www.jf-cmca.jp/attach/test"

SUBJECT_META = {
    "economics":   {"prefix": "ec",  "jp": "経済学・経済政策",           "letter": "a"},
    "finance":     {"prefix": "fa",  "jp": "財務・会計",                 "letter": "b"},
    "management":  {"prefix": "mc",  "jp": "企業経営理論",               "letter": "c"},
    "operations":  {"prefix": "om",  "jp": "運営管理（オペレーション・マネジメント）", "letter": "d"},
    "law":         {"prefix": "bl",  "jp": "経営法務",                   "letter": "e"},
    "information": {"prefix": "is",  "jp": "経営情報システム",           "letter": "f"},
    "policy":      {"prefix": "sm",  "jp": "中小企業経営・中小企業政策", "letter": "g"},
}
SUBJECT_IDS = list(SUBJECT_META.keys())

# 年度定義: key → (jp_label, 問題PDF URL dict, 正解PDF URL dict)
# 正解PDF は修正版がある場合それを使用
def _q(year_dir, prefix, year_suffix):
    """標準的な問題PDF URL を生成"""
    return {
        sid: f"{BASE}/shikenmondai/{year_dir}/{prefix}{SUBJECT_META[sid]['letter'].upper()}1{prefix}{year_suffix}.pdf"
        for sid in SUBJECT_IDS
    }

def _q_lower(year_dir, year_suffix):
    """小文字ファイル名の問題PDF URL を生成 (H29, H28...)"""
    return {
        sid: f"{BASE}/shikenmondai/{year_dir}/{SUBJECT_META[sid]['letter']}1ji{year_suffix}.pdf"
        for sid in SUBJECT_IDS
    }

def _a_std(base_path, year, overrides=None):
    """標準的な正解PDF URL を生成 (例: 2025a.pdf)"""
    urls = {
        sid: f"{BASE}/{base_path}/{year}{SUBJECT_META[sid]['letter']}.pdf"
        for sid in SUBJECT_IDS
    }
    if overrides:
        urls.update(overrides)
    return urls

def _a_rev(base_path, year, overrides=None):
    """逆順ファイル名の正解PDF URL を生成 (例: a2018.pdf)"""
    urls = {
        sid: f"{BASE}/{base_path}/{SUBJECT_META[sid]['letter']}{year}.pdf"
        for sid in SUBJECT_IDS
    }
    if overrides:
        urls.update(overrides)
    return urls

EXAM_CATALOG = {
    "R7": {
        "jp": "令和7年度",
        "year_str": "2025",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2025/{SUBJECT_META[sid]['letter'].upper()}1JI2025.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r07/1ji_seikai", "2025", {
            "operations":  f"{BASE}/r07/1ji_seikai/d_v2_20250902.pdf",
            "information": f"{BASE}/r07/1ji_seikai/f_v2_20250902.pdf",
        }),
    },
    "R6": {
        "jp": "令和6年度",
        "year_str": "2024",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2024/{SUBJECT_META[sid]['letter'].upper()}1JI2024.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r06/1ji_seikai", "2024", {
            "operations":  f"{BASE}/r06/1ji_seikai/Dv2_20240903.pdf",
            "information": f"{BASE}/r06/1ji_seikai/Fv2_20240903.pdf",
        }),
    },
    "R5": {
        "jp": "令和5年度",
        "year_str": "2023",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2023/{SUBJECT_META[sid]['letter'].upper()}1JI2023.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r05/1ji_seikai", "2023", {
            "operations":  f"{BASE}/r05/1ji_seikai/2023dv2.pdf",
        }),
    },
    "R5再": {
        "jp": "令和5年度（再試験）",
        "year_str": "2023sai",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji(sai)2023/{SUBJECT_META[sid]['letter'].upper()}1JI2023-2.pdf"
            for sid in SUBJECT_IDS
        },
        # 再試験の正解は別ページ要確認のため、まず標準パスを試みる
        "answers": _a_std("r05sai/1ji_seikai", "2023-2"),
    },
    "R4": {
        "jp": "令和4年度",
        "year_str": "2022",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2022/{SUBJECT_META[sid]['letter']}1ji2022.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r04/1j_seikai", "2022", {
            "operations":  f"{BASE}/r04/1j_seikai/2022dv2.pdf",
            "information": f"{BASE}/r04/1j_seikai/2022fv2.pdf",
        }),
    },
    "R3": {
        "jp": "令和3年度",
        "year_str": "2021",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2021/{SUBJECT_META[sid]['letter']}1ji2021.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r03/1j_seikai", "2021", {
            "policy": f"{BASE}/r03/1j_seikai/2021g_teisei.pdf",
        }),
    },
    "R2": {
        "jp": "令和2年度",
        "year_str": "2020",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2020/{SUBJECT_META[sid]['letter']}1ji2020.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("r02/1j_seikai", "2020"),
    },
    "R1": {
        "jp": "令和元年度",
        "year_str": "2019",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2019/{SUBJECT_META[sid]['letter']}1ji2019.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_std("h31/1j_seikai", "2019"),
    },
    "H30": {
        "jp": "平成30年度",
        "year_str": "2018",
        "questions": {
            sid: f"{BASE}/shikenmondai/1ji2018/{SUBJECT_META[sid]['letter'].upper()}1ji2018.pdf"
            for sid in SUBJECT_IDS
        },
        "answers": _a_rev("h30/1j_seikai", "2018"),
    },
    "H29": {
        "jp": "平成29年度",
        "year_str": "2017",
        "questions": _q_lower("1ji2017", "2017"),
        "answers": _a_rev("h29/1j_seikai", "2017"),
    },
}

YEAR_KEYS = ["R7", "R6", "R5", "R5再", "R4", "R3", "R2", "R1", "H30", "H29"]
SUBJECT_PREFIX_MAP = {v["prefix"]: k for k, v in SUBJECT_META.items()}

# ─────────────────────────────────────────────────────────
# PDF ダウンロード & テキスト抽出
# ─────────────────────────────────────────────────────────
def fetch_pdf_text(url: str, session, retries=3) -> str | None:
    """PDF を取得してテキストを抽出する"""
    try:
        from pdfminer.high_level import extract_text
        from pdfminer.layout import LAParams
    except ImportError:
        print("ERROR: pdfminer.six が見つかりません。pip install pdfminer.six を実行してください。")
        sys.exit(1)

    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            bio = BytesIO(resp.content)
            laparams = LAParams(line_margin=0.5, word_margin=0.1)
            text = extract_text(bio, laparams=laparams)
            return text
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"  WARN: 取得失敗 {url}: {e}")
                return None

# ─────────────────────────────────────────────────────────
# テキスト正規化
# ─────────────────────────────────────────────────────────
FULLWIDTH_NUMS = str.maketrans("０１２３４５６７８９", "0123456789")
FULLWIDTH_ALPHA = str.maketrans(
    "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ",
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
)

def normalize(text: str) -> str:
    text = text.translate(FULLWIDTH_NUMS)
    text = text.translate(FULLWIDTH_ALPHA)
    text = text.replace("　", " ")  # 全角スペース
    # 孤立した数字スペース（PDF extraction artifact）の削除を試みない
    # (問題文中の計算式等を壊さないため)
    return text

# ─────────────────────────────────────────────────────────
# 正解キーのパース
# ─────────────────────────────────────────────────────────
def parse_answer_key(text: str) -> dict:
    """
    正解PDF テキストから {(問番号: int, 設問: str|None): 正解: str} を返す
    """
    text = normalize(text)
    answers: dict = {}
    current_q: int | None = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # "第N問 設問|設問1|- 正解 配点" のパターン
        m = re.match(
            r'第\s*(\d+)\s*問\s+(-|設問\s*\d+)\s+([アイウエオ])\s+\d',
            line
        )
        if m:
            current_q = int(m.group(1))
            setsumon_raw = m.group(2).strip()
            ans = m.group(3)
            setsumon = None if setsumon_raw == '-' else re.sub(r'\s+', '', setsumon_raw)
            answers[(current_q, setsumon)] = ans
            continue
        # 続行行: "設問N 正解 配点"
        m2 = re.match(r'(設問\s*\d+)\s+([アイウエオ])\s+\d', line)
        if m2 and current_q is not None:
            setsumon = re.sub(r'\s+', '', m2.group(1))
            ans = m2.group(2)
            answers[(current_q, setsumon)] = ans
            continue

    return answers

# ─────────────────────────────────────────────────────────
# 問題テキストのパース
# ─────────────────────────────────────────────────────────
CHOICE_LABELS = "アイウエオ"

def split_choices(text: str) -> tuple[str, list[dict]]:
    """本文と選択肢を分離して返す"""
    if "〔解答群〕" in text:
        body, choice_raw = text.split("〔解答群〕", 1)
    else:
        lines = text.splitlines()
        choice_start = next(
            (i for i, ln in enumerate(lines)
             if re.match(rf'^[{CHOICE_LABELS}][\s　]', ln.strip())),
            None
        )
        if choice_start is None:
            return text.strip(), []
        body = "\n".join(lines[:choice_start])
        choice_raw = "\n".join(lines[choice_start:])

    choices = []
    # 各選択肢を行ごとに収集（複数行にまたがる場合も対応）
    current_label = None
    current_parts: list[str] = []
    for ln in choice_raw.splitlines():
        ln = ln.strip()
        m = re.match(rf'^([{CHOICE_LABELS}])[\s　]+(.+)', ln)
        if m:
            if current_label:
                choices.append({"label": current_label, "text": " ".join(current_parts).strip()})
            current_label = m.group(1)
            current_parts = [m.group(2).strip()]
        elif current_label and ln:
            current_parts.append(ln)
    if current_label:
        choices.append({"label": current_label, "text": " ".join(current_parts).strip()})

    return body.strip(), choices


def parse_questions(text: str) -> list[dict]:
    """
    問題PDFテキストを解析し、問題ブロックのリストを返す。
    各要素: {qnum, setsumon (None|"設問1"|"設問2"), body, choices, has_figure}
    """
    text = normalize(text)
    # 第 N 問 の区切りで分割
    raw_blocks = re.split(r'\n(?=第\s*\d+\s*問)', text)
    results: list[dict] = []

    for block in raw_blocks:
        block = block.strip()
        m_q = re.match(r'第\s*(\d+)\s*問', block)
        if not m_q:
            continue
        qnum = int(m_q.group(1))
        body_all = block[m_q.end():].strip()

        # ページ番号行（数字のみの行）を除去
        body_all = re.sub(r'^\d+\s*$', '', body_all, flags=re.MULTILINE)
        body_all = body_all.strip()

        has_figure = bool(re.search(r'下図|図中|上図|右図|左図|グラフ|以下の図', body_all))

        # 設問 がある場合は分割 (半角数字1/2/3 で検索 - normalize済み)
        setsumon_pat = r'\n(?=（設問\s*[123]）)'
        setsumon_blocks = re.split(setsumon_pat, body_all)

        if len(setsumon_blocks) == 1:
            # 設問なし
            body, choices = split_choices(body_all)
            results.append({
                "qnum": qnum, "setsumon": None,
                "body": body, "choices": choices,
                "has_figure": has_figure,
            })
        else:
            # 設問あり
            common_text = setsumon_blocks[0].strip()
            for s_block in setsumon_blocks[1:]:
                sm = re.match(r'（設問\s*([123])）', s_block)
                if not sm:
                    continue
                snum = sm.group(1)
                s_inner = s_block[sm.end():].strip()
                body, choices = split_choices(s_inner)
                full_body = (common_text + "\n" + body).strip() if common_text else body.strip()
                results.append({
                    "qnum": qnum, "setsumon": f"設問{snum}",
                    "body": full_body, "choices": choices,
                    "has_figure": has_figure,
                })

    return results

# ─────────────────────────────────────────────────────────
# PrivateQuestionSeed への変換
# ─────────────────────────────────────────────────────────
def build_seed(
    qnum: int, setsumon: str | None,
    body: str, choices: list[dict], has_figure: bool,
    correct_ans: str | None,
    subject_id: str, year_key: str, year_str: str,
    skip_figures: bool,
) -> dict | None:
    """PrivateQuestionSeed dict を生成する"""

    if skip_figures and has_figure:
        return None  # 図問題スキップ

    meta = SUBJECT_META[subject_id]
    prefix = meta["prefix"]
    jp_subject = meta["jp"]

    # ID 生成
    year_short = year_key.lower().replace("再", "sai")
    setsumon_suffix = "" if setsumon is None else f"-{setsumon[-1]}"  # "設問1" → "-1"
    question_id = f"{prefix}-{year_short}-{qnum:02d}{setsumon_suffix}"

    # 本文整形（図参照の場合は注記追加）
    if has_figure:
        figure_note = "\n\n※ この問題は図・グラフを参照します。問題PDFの図を確認してください。"
        question_text = body + figure_note
    else:
        question_text = body

    # 正解
    if correct_ans is None:
        answer_text = "（正解不明 - 正解データを手動で入力してください）"
    elif choices:
        match = next((c["text"] for c in choices if c["label"] == correct_ans), None)
        answer_text = f"{correct_ans}：{match}" if match else correct_ans
    else:
        answer_text = correct_ans

    # 解説（仮生成 - 後で加筆してください）
    setsumon_str = f"（{setsumon}）" if setsumon else ""
    explanation = (
        f"正解は「{correct_ans}」です。\n"
        f"（{year_key}年度 {jp_subject} 第{qnum}問{setsumon_str} — "
        f"詳細な解説は後で追記してください）"
        if correct_ans else
        "解説未入力"
    )

    # 問題タイプ判定
    if re.search(r'計算|公式|求め[よろ]|いくら|何[%％]|金額', body):
        q_type = "計算"
    elif choices:
        q_type = "4択"
    else:
        q_type = "一問一答"

    # rank は後で ABC マッピングで上書きされるため仮値
    rank = "A"

    seed: dict = {
        "id": question_id,
        "subject": subject_id,
        "coreName": jp_subject,
        "field": jp_subject,
        "topic": body[:40].strip().replace("\n", " "),
        "rank": rank,
        "difficulty": "標準",
        "type": q_type,
        "question": question_text,
        "answer": answer_text,
        "explanation": explanation,
        "commonMistake": "（後で追記してください）",
        "examPoint": "（後で追記してください）",
        "relatedTopics": [],
        "source": "過去問",
        "sourceYear": year_str,
        "sourceSubject": jp_subject,
        "sourceQuestionNumber": f"第{qnum}問{setsumon_str}",
        "sourceNote": f"{meta['jp']} {year_key}年度 第{qnum}問{setsumon_str}",
    }

    if choices:
        seed["choices"] = choices

    return seed

# ─────────────────────────────────────────────────────────
# メイン処理
# ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="過去問インポートスクリプト")
    parser.add_argument("--years", default=",".join(YEAR_KEYS),
                        help="処理する年度 (カンマ区切り, 例: R7,R6,R5)")
    parser.add_argument("--subjects", default=",".join(SUBJECT_META.keys()),
                        help="処理する科目 (カンマ区切り, 例: economics,finance)")
    parser.add_argument("--out", default=str(BASE_DIR / "src/data/questions/private/questions.past-exams.json"),
                        help="出力先 JSON ファイル")
    parser.add_argument("--skip-figures", action="store_true",
                        help="図参照問題をスキップ")
    parser.add_argument("--dry-run", action="store_true",
                        help="URL リストのみ表示してダウンロードしない")
    args = parser.parse_args()

    years = [y.strip() for y in args.years.split(",")]
    subjects = [s.strip() for s in args.subjects.split(",")]

    # 入力検証
    invalid_years = [y for y in years if y not in EXAM_CATALOG]
    invalid_subjects = [s for s in subjects if s not in SUBJECT_META]
    if invalid_years:
        print(f"ERROR: 不正な年度 {invalid_years}. 有効値: {YEAR_KEYS}")
        sys.exit(1)
    if invalid_subjects:
        print(f"ERROR: 不正な科目 {invalid_subjects}. 有効値: {list(SUBJECT_META.keys())}")
        sys.exit(1)

    if args.dry_run:
        print("=== DRY RUN: URL 一覧 ===")
        for year_key in years:
            exam = EXAM_CATALOG[year_key]
            print(f"\n【{exam['jp']}】")
            for sid in subjects:
                print(f"  問題: {exam['questions'][sid]}")
                print(f"  正解: {exam['answers'][sid]}")
        return

    try:
        import requests
    except ImportError:
        print("ERROR: requests が見つかりません。pip install requests を実行してください。")
        sys.exit(1)

    try:
        from pdfminer.high_level import extract_text  # noqa: F401
    except ImportError:
        print("ERROR: pdfminer.six が見つかりません。pip install pdfminer.six を実行してください。")
        sys.exit(1)

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (compatible; Shindan-OS-import/1.0)"

    all_seeds: list[dict] = []
    stats = {"total": 0, "ok": 0, "no_answer": 0, "figure": 0, "error": 0}

    for year_key in years:
        exam = EXAM_CATALOG[year_key]
        jp_year = exam["jp"]
        year_str = exam["year_str"]
        print(f"\n{'='*60}")
        print(f"  {jp_year} ({year_key}) 処理中...")
        print(f"{'='*60}")

        for sid in subjects:
            meta = SUBJECT_META[sid]
            print(f"\n  ■ {meta['jp']}")

            # 問題取得
            q_url = exam["questions"][sid]
            print(f"    問題 URL: {q_url}")
            q_text = fetch_pdf_text(q_url, session)
            if not q_text:
                print(f"    WARN: 問題PDF 取得失敗 → スキップ")
                stats["error"] += 1
                continue

            # 正解取得
            a_url = exam["answers"][sid]
            print(f"    正解 URL: {a_url}")
            a_text = fetch_pdf_text(a_url, session)
            answers: dict = {}
            if a_text:
                answers = parse_answer_key(a_text)
                print(f"    正解 {len(answers)} 件取得")
            else:
                print(f"    WARN: 正解PDF 取得失敗 → 正解なしで続行")

            # 問題パース
            questions = parse_questions(q_text)
            print(f"    問題 {len(questions)} 件パース")

            for q in questions:
                stats["total"] += 1
                qnum = q["qnum"]
                setsumon = q["setsumon"]

                # 正解を探す
                ans_key = (qnum, None) if setsumon is None else (qnum, re.sub(r'\s+', '', setsumon))
                correct = answers.get(ans_key)
                if correct is None and setsumon:
                    # フォールバック: 数字の形式が違う場合
                    for k, v in answers.items():
                        if k[0] == qnum and k[1] is not None:
                            correct = v
                            break

                if correct is None:
                    stats["no_answer"] += 1

                if q["has_figure"]:
                    stats["figure"] += 1

                seed = build_seed(
                    q["qnum"], q["setsumon"],
                    q["body"], q["choices"], q["has_figure"],
                    correct,
                    sid, year_key, year_str,
                    args.skip_figures,
                )
                if seed:
                    all_seeds.append(seed)
                    stats["ok"] += 1

            time.sleep(0.5)  # サーバー負荷軽減

    # 既存ファイルとのマージ (ID 重複を避ける)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    existing: list[dict] = []
    if out_path.exists():
        try:
            with open(out_path, encoding="utf-8") as f:
                existing = json.load(f)
            existing_ids = {q["id"] for q in existing}
            new_seeds = [s for s in all_seeds if s["id"] not in existing_ids]
            merged = existing + new_seeds
            print(f"\n既存 {len(existing)} 件 + 新規 {len(new_seeds)} 件 = 合計 {len(merged)} 件")
        except Exception as e:
            print(f"WARN: 既存ファイル読込エラー ({e}) → 上書き")
            merged = all_seeds
    else:
        merged = all_seeds

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"  完了！出力先: {out_path}")
    print(f"{'='*60}")
    print(f"  処理問題数:  {stats['total']}")
    print(f"  生成成功:    {stats['ok']}")
    print(f"  正解なし:    {stats['no_answer']}")
    print(f"  図参照問題:  {stats['figure']}")
    print(f"  エラー:      {stats['error']}")
    print()
    print("  次のステップ:")
    print("    1. explanation / commonMistake / examPoint を加筆")
    print("    2. pnpm validate:questions で動作確認")
    print("    3. 図参照問題 (has_figure=true) は問題文に手動で図の内容を追記")


if __name__ == "__main__":
    main()
