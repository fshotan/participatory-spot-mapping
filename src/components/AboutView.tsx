"use client";

import { useState } from "react";

/** Minimal, dependency-free renderer for a small subset of Markdown. */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={key++}>
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={key++}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h1 key={key++}>{line.slice(2)}</h1>);
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={key++}>{line}</p>);
    }
  }
  flushList();
  return blocks;
}

export default function AboutView({
  initialContent,
  isAdmin,
}: {
  initialContent: string;
  isAdmin: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      setContent(data.content);
      setEditing(false);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="about-body">
        {error && <p className="form-error">{error}</p>}
        <textarea
          className="about-editor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={18}
        />
        <p className="about-hint">
          `# 見出し` `## 小見出し` `- 箇条書き` が使えます。
        </p>
        <div className="sheet-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDraft(content);
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
          >
            キャンセル
          </button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="about-body">
      <div className="about-content">{renderMarkdown(content)}</div>
      {isAdmin && (
        <button
          className="btn btn-ghost"
          onClick={() => {
            setDraft(content);
            setEditing(true);
          }}
        >
          編集
        </button>
      )}
    </div>
  );
}
