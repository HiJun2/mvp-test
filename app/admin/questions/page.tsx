"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_QUESTION_GROUPS } from "../../defaultQuestions";
import { DEFAULT_BREATH_HELPER_TEXT } from "../../../shared/contentDefaults";
import styles from "./page.module.css";

type AdminImage = { id: string; description: string; version: number; createdAt?: string; imageUrl: string } | null;
type AdminCategory = { key: string; name: string; icon: string; color: string; appVisible: boolean };
type AdminQuestion = { id?: string; category: string; question: string; helperText: string; sortOrder?: number; isActive: boolean; image?: AdminImage };
type AdminQuestionGroup = { typeId?: string; typeTitle: string; sortOrder?: number; isActive: boolean; questions: AdminQuestion[] };
type DailyPrompt = { id: string; question: string; helperText: string; isActive: boolean; image: AdminImage };
type AdminPayload = { categories: AdminCategory[]; dailyPrompt: DailyPrompt | null; breathIntroImage: AdminImage; groups: AdminQuestionGroup[] };

const PASSWORD_KEY = "breath.adminPassword";
const ICON_OPTIONS = [
  ["calendar-star", "달력"], ["clock-3", "시계"], ["heart", "하트"], ["map-pin", "위치"],
  ["brain", "기억"], ["user-round", "사람"], ["sparkles", "반짝임"], ["leaf", "잎"],
  ["book-open", "책"], ["route", "전환"], ["gem", "보석"], ["flower-2", "꽃"],
  ["users-round", "관계"], ["lightbulb", "전구"], ["gift", "선물"], ["circle", "원"],
];
const DEFAULT_IMAGE_FILE = "default-paper.png";

export default function AdminQuestionsPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminPayload>({ categories: [], dailyPrompt: null, breathIntroImage: null, groups: [] });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const visibleCategories = useMemo(() => data.categories.filter((category) => category.appVisible), [data.categories]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(PASSWORD_KEY);
    if (stored) setPassword(stored);
  }, []);

  async function request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: init.body instanceof FormData
        ? { "x-admin-password": password, ...init.headers }
        : { "content-type": "application/json", "x-admin-password": password, ...init.headers },
    });
    const result = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "요청을 처리하지 못했어요.");
    return result as T;
  }

  async function load(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!password) return setStatus("관리자 비밀번호를 입력해 주세요.");
    setBusy(true);
    setStatus("");
    try {
      window.sessionStorage.setItem(PASSWORD_KEY, password);
      const result = await request<AdminPayload>("/api/admin/questions");
      setData(result);
      setStatus("현재 질문과 이미지 설정을 불러왔어요.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "관리 데이터를 불러오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    if (!data.dailyPrompt) return setStatus("오늘이야기 질문을 먼저 불러와 주세요.");
    setBusy(true);
    setStatus("");
    try {
      await request<{ ok: boolean }>("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          categories: data.categories,
          dailyPrompt: {
            id: data.dailyPrompt.id,
            question: data.dailyPrompt.question,
            helperText: data.dailyPrompt.helperText,
            isActive: data.dailyPrompt.isActive,
          },
          groups: data.groups.map((group, groupIndex) => ({
            ...group,
            sortOrder: groupIndex,
            questions: group.questions.map((question, questionIndex) => ({ ...question, sortOrder: questionIndex, image: undefined })),
          })),
        }),
      });
      setStatus("관리 설정을 저장했어요.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "설정을 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function loadDefaults() {
    setData((current) => ({
      ...current,
      groups: DEFAULT_QUESTION_GROUPS.map((group, groupIndex) => {
        const existingGroup = current.groups.find((item) => item.typeId === group.typeId);
        return {
          ...group,
          sortOrder: groupIndex,
          questions: group.questions.map((question, questionIndex) => {
            const existingQuestion = existingGroup?.questions.find((item) => item.category === question.category);
            return {
              ...question,
              helperText: existingQuestion?.helperText?.trim() || question.helperText?.trim() || DEFAULT_BREATH_HELPER_TEXT,
              id: existingQuestion?.id,
              image: existingQuestion?.image ?? null,
              sortOrder: questionIndex,
            };
          }),
        };
      }),
    }));
    setStatus("기본 질문 30개를 화면에 불러왔어요. 저장 버튼을 눌러 DB에 반영해 주세요.");
  }

  function updateCategory(index: number, patch: Partial<AdminCategory>) {
    setData((current) => ({ ...current, categories: current.categories.map((category, inner) => inner === index ? { ...category, ...patch } : category) }));
  }

  function updateGroup(index: number, patch: Partial<AdminQuestionGroup>) {
    setData((current) => ({ ...current, groups: current.groups.map((group, inner) => inner === index ? { ...group, ...patch } : group) }));
  }

  function updateQuestion(groupIndex: number, questionIndex: number, patch: Partial<AdminQuestion>) {
    setData((current) => ({
      ...current,
      groups: current.groups.map((group, inner) => inner === groupIndex ? { ...group, questions: group.questions.map((question, qIndex) => qIndex === questionIndex ? { ...question, ...patch } : question) } : group),
    }));
  }

  async function uploadImage(scope: "daily" | "breath_intro" | "question", file: File, description: string, questionId?: string, reload = true) {
    const key = questionId ?? scope;
    setUploadingKey(key);
    setStatus("");
    try {
      const form = new FormData();
      form.append("scope", scope);
      form.append("description", description);
      if (questionId) form.append("questionId", questionId);
      form.append("image", file);
      await request("/api/admin/images", { method: "POST", body: form });
      setStatus("새 이미지 버전을 R2에 등록했어요.");
      if (reload) await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "이미지를 등록하지 못했어요.");
    } finally {
      setUploadingKey("");
    }
  }

  async function deactivateImage(imageId: string) {
    setUploadingKey(imageId);
    try {
      await request(`/api/admin/images/${imageId}`, { method: "DELETE" });
      setStatus("이미지를 비활성화했어요. R2 원본과 과거 기록 연결은 유지됩니다.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "이미지를 비활성화하지 못했어요.");
    } finally {
      setUploadingKey("");
    }
  }

  async function registerDefaultImages() {
    if (!data.dailyPrompt) return setStatus("관리 데이터를 먼저 불러와 주세요.");
    setBusy(true);
    setStatus("모든 기본 이미지를 새 질감으로 교체하고 있어요...");
    try {
      const jobs: Array<{ scope: "daily" | "breath_intro" | "question"; file: string; description: string; questionId?: string }> = [];
      jobs.push({ scope: "daily", file: DEFAULT_IMAGE_FILE, description: "따뜻한 아이보리 종이 질감의 오늘이야기 배경" });
      jobs.push({ scope: "breath_intro", file: DEFAULT_IMAGE_FILE, description: "따뜻한 아이보리 종이 질감의 숨결이야기 선택 배경" });
      data.groups.forEach((group) => group.questions.forEach((question) => {
        if (question.id) {
          jobs.push({ scope: "question", questionId: question.id, file: DEFAULT_IMAGE_FILE, description: `${group.typeTitle}의 ${question.category} 질문 기본 종이 질감` });
        }
      }));
      for (const job of jobs) {
        const response = await fetch(`/seed-images/${job.file}`);
        if (!response.ok) throw new Error(`${job.file} 기본 이미지를 찾을 수 없어요.`);
        const blob = await response.blob();
        await uploadImage(job.scope, new File([blob], job.file, { type: blob.type || "image/png" }), job.description, job.questionId, false);
      }
      await load();
      setStatus(`기본 이미지 ${jobs.length}개를 새 질감으로 교체했어요.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "기본 이미지를 등록하지 못했어요.");
    } finally {
      setBusy(false);
      setUploadingKey("");
    }
  }

  return (
    <main className={styles.adminPage}>
      <header className={styles.header}><a href="/"><ArrowLeft />앱으로</a><span>숨결 관리자</span><h1>질문과 이미지 관리</h1><p>오늘이야기, 숨결이야기 질문, 카테고리 노출과 R2 이미지 버전을 관리합니다.</p></header>
      <form className={styles.authBar} onSubmit={load}><label>관리자 비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ADMIN_PASSWORD" /></label><button disabled={busy}><RefreshCw />불러오기</button></form>
      <div className={styles.toolbar}><div><strong>노출 카테고리 {visibleCategories.length}개</strong><span>질문유형 {data.groups.length}개</span></div><button onClick={loadDefaults} disabled={busy}><Plus />기본 질문</button><button onClick={registerDefaultImages} disabled={busy || !data.groups.length}><ImagePlus />기본 이미지 전체 적용</button><button className={styles.saveButton} onClick={saveAll} disabled={busy || !data.groups.length}><Save />전체 저장</button></div>
      {status && <p className={styles.status}>{status}</p>}

      <section className={styles.section}><div className={styles.sectionHeading}><div><span>카테고리</span><h2>아이콘, 색상과 앱 노출</h2></div></div><div className={styles.categoryList}>{data.categories.map((category, index) => <article className={styles.categoryCard} key={category.key}><div><strong>{category.name}</strong><small>{category.key}</small></div><label>아이콘<select value={category.icon} onChange={(event) => updateCategory(index, { icon: event.target.value })}>{ICON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>색상<span className={styles.colorField}><input type="color" value={category.color} onChange={(event) => updateCategory(index, { color: event.target.value })} /><code>{category.color}</code></span></label><button className={category.appVisible ? styles.visibleButton : styles.hiddenButton} onClick={() => updateCategory(index, { appVisible: !category.appVisible })}>{category.appVisible ? <Eye /> : <EyeOff />}{category.appVisible ? "앱 노출" : "숨김"}</button></article>)}</div></section>

      {data.dailyPrompt && <section className={styles.section}><div className={styles.sectionHeading}><div><span>오늘이야기</span><h2>질문 세트</h2></div><button className={data.dailyPrompt.isActive ? styles.visibleButton : styles.hiddenButton} onClick={() => setData((current) => ({ ...current, dailyPrompt: current.dailyPrompt ? { ...current.dailyPrompt, isActive: !current.dailyPrompt.isActive } : null }))}>{data.dailyPrompt.isActive ? <Eye /> : <EyeOff />}{data.dailyPrompt.isActive ? "활성" : "비활성"}</button></div><div className={styles.promptGrid}><div className={styles.promptFields}><label>질문<input value={data.dailyPrompt.question} onChange={(event) => setData((current) => ({ ...current, dailyPrompt: current.dailyPrompt ? { ...current.dailyPrompt, question: event.target.value } : null }))} /></label><label>보조 문구<textarea value={data.dailyPrompt.helperText} onChange={(event) => setData((current) => ({ ...current, dailyPrompt: current.dailyPrompt ? { ...current.dailyPrompt, helperText: event.target.value } : null }))} /></label></div><ImageManager title="오늘이야기 배경" image={data.dailyPrompt.image} busy={uploadingKey === "daily" || uploadingKey === data.dailyPrompt.image?.id} onUpload={(file, description) => uploadImage("daily", file, description)} onDeactivate={deactivateImage} /></div></section>}

      <section className={styles.section}><div className={styles.sectionHeading}><div><span>숨결이야기</span><h2>첫 선택 화면 배경</h2></div></div><ImageManager title="카테고리 선택 배경" image={data.breathIntroImage} busy={uploadingKey === "breath_intro" || uploadingKey === data.breathIntroImage?.id} onUpload={(file, description) => uploadImage("breath_intro", file, description)} onDeactivate={deactivateImage} /></section>

      <section className={styles.groupList}>
        {data.groups.map((group, groupIndex) => (
          <details className={styles.groupPanel} key={group.typeId ?? groupIndex} open={groupIndex === 0}>
            <summary><span>질문유형 {groupIndex + 1}</span><strong>{group.typeTitle}</strong><small>{group.questions.length}개 질문</small></summary>
            <div className={styles.groupFields}>
              <label>질문유형 제목<input value={group.typeTitle} onChange={(event) => updateGroup(groupIndex, { typeTitle: event.target.value })} /></label>
              <button className={group.isActive ? styles.visibleButton : styles.hiddenButton} onClick={() => updateGroup(groupIndex, { isActive: !group.isActive })}>{group.isActive ? <Eye /> : <EyeOff />}{group.isActive ? "활성" : "비활성"}</button>
            </div>
            <div className={styles.questionList}>
              {group.questions.map((question, questionIndex) => (
                <article className={styles.questionCard} key={question.id ?? questionIndex}>
                  <div className={styles.questionFields}>
                    <span>질문 {questionIndex + 1}</span>
                    <label>카테고리<input value={question.category} onChange={(event) => updateQuestion(groupIndex, questionIndex, { category: event.target.value })} /></label>
                    <label>질문 문구<textarea value={question.question} onChange={(event) => updateQuestion(groupIndex, questionIndex, { question: event.target.value })} /></label>
                    <label>보조 문구<textarea value={question.helperText} placeholder={DEFAULT_BREATH_HELPER_TEXT} onChange={(event) => updateQuestion(groupIndex, questionIndex, { helperText: event.target.value })} /></label>
                    <button className={question.isActive ? styles.visibleButton : styles.hiddenButton} onClick={() => updateQuestion(groupIndex, questionIndex, { isActive: !question.isActive })}>{question.isActive ? <Eye /> : <EyeOff />}{question.isActive ? "활성" : "비활성"}</button>
                  </div>
                  {question.id && <ImageManager title={`${question.category} 질문 이미지`} image={question.image ?? null} busy={uploadingKey === question.id || uploadingKey === question.image?.id} onUpload={(file, description) => uploadImage("question", file, description, question.id)} onDeactivate={deactivateImage} />}
                </article>
              ))}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

function ImageManager({ title, image, busy, onUpload, onDeactivate }: { title: string; image: AdminImage; busy: boolean; onUpload: (file: File, description: string) => void; onDeactivate: (id: string) => void }) {
  const [description, setDescription] = useState(image?.description ?? title);
  useEffect(() => setDescription(image?.description ?? title), [image?.description, title]);
  return <div className={styles.imageManager}><div className={styles.imagePreview}>{image ? <img src={image.imageUrl} alt={image.description || title} /> : <span><ImagePlus />등록된 이미지가 없어요</span>}</div><div className={styles.imageControls}><div><strong>{title}</strong>{image && <small>버전 {image.version}{image.createdAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(image.createdAt))}` : ""}</small>}</div><label>이미지 설명<input value={description} onChange={(event) => setDescription(event.target.value)} /></label><div><label className={styles.uploadButton}><Upload />{busy ? "처리 중" : image ? "이미지 교체" : "이미지 등록"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, description); event.target.value = ""; }} /></label>{image && <button className={styles.deactivateButton} disabled={busy} onClick={() => onDeactivate(image.id)}><Trash2 />비활성화</button>}</div></div></div>;
}
