"use client";

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Flower2,
  Gem,
  Gift,
  Heart,
  Home,
  Leaf,
  Lightbulb,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  MoreVertical,
  Pause,
  RotateCcw,
  Route,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_QUESTION_GROUPS } from "./defaultQuestions";
import styles from "./page.module.css";

type Screen = "splash" | "auth" | "register" | "home" | "daily" | "breath" | "breathRecord" | "archive" | "settings";
type RecordType = "daily" | "breath";
type FontSize = "normal" | "large" | "xlarge";

type User = { id: string; name: string; email: string; createdAt: string };
type ContentImage = { id: string; description: string; version: number; imageUrl: string };
type DailyPrompt = { id: string; question: string; helperText: string; isActive: boolean; image: ContentImage | null };
type BreathQuestion = {
  id?: string;
  typeId: string;
  typeTitle: string;
  typeIndex: number;
  questionIndex: number;
  category: string;
  categoryKey: string;
  categoryIcon: string;
  categoryColor: string;
  question: string;
  image: ContentImage | null;
};
type VoiceRecord = {
  id: string;
  type: RecordType;
  question: string;
  questionId?: string;
  questionTypeIndex?: number;
  questionIndex?: number;
  category?: string;
  questionType?: string;
  questionTypeTitle?: string;
  durationSeconds: number;
  createdAt: string;
  localDate?: string;
  imageId?: string;
  imageVersion?: number;
  imageDescription?: string;
  imageUrl?: string;
  audioUrl: string;
};
type PendingRecord = {
  type: RecordType;
  question: string;
  questionId?: string;
  questionTypeIndex?: number;
  questionIndex?: number;
  category?: string;
  questionType?: string;
  questionTypeTitle?: string;
  imageId?: string;
  createdAt: string;
  durationSeconds: number;
  audioBlob: Blob;
  mimeType: string;
};
type CategoryView = { name: string; key: string; icon: string; color: string };

const FONT_KEY = "breath.fontSize";
const CATEGORY_KEY = "breath.selectedCategory";
const LAST_SCREEN_KEY = "breath.lastStoryScreen";
const CATEGORY_ORDER = ["사건", "시간", "사랑", "장소"];
const CATEGORY_FALLBACKS: Record<string, Omit<CategoryView, "name">> = {
  사건: { key: "event", icon: "calendar-star", color: "#f06a2a" },
  시간: { key: "time", icon: "clock-3", color: "#4f7b48" },
  사랑: { key: "love", icon: "heart", color: "#ed4164" },
  장소: { key: "place", icon: "map-pin", color: "#3488c9" },
};
const FALLBACK_DAILY: DailyPrompt = {
  id: "daily_default",
  question: "지금 날씨는 어때?",
  helperText: "밖의 날씨를 보며 오늘의 기분을 이야기해 주세요.",
  isActive: true,
  image: null,
};

const FALLBACK_QUESTIONS: BreathQuestion[] = DEFAULT_QUESTION_GROUPS.flatMap((group, groupIndex) =>
  group.questions.flatMap((item, questionIndex) => {
    const category = CATEGORY_FALLBACKS[item.category];
    if (!category) return [];
    return [{
      id: `fallback-${group.typeId}-${questionIndex + 1}`,
      typeId: group.typeId,
      typeTitle: group.typeTitle,
      typeIndex: groupIndex + 1,
      questionIndex: questionIndex + 1,
      category: item.category,
      categoryKey: category.key,
      categoryIcon: category.icon,
      categoryColor: category.color,
      question: item.question,
      image: null,
    }];
  }),
);

async function apiJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: init.body instanceof FormData
      ? init.headers
      : { "content-type": "application/json", ...init.headers },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.");
  return data as T;
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [questions, setQuestions] = useState<BreathQuestion[]>(FALLBACK_QUESTIONS);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt>(FALLBACK_DAILY);
  const [breathIntroImage, setBreathIntroImage] = useState<ContentImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [registerMode, setRegisterMode] = useState<"signup" | "login">("signup");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [records],
  );
  const todayKey = getSeoulDateKey(new Date());
  const todayRecord = sortedRecords.find(
    (record) => record.type === "daily" && (record.localDate ?? getSeoulDateKey(record.createdAt)) === todayKey,
  );
  const categories = useMemo(() => getCategories(questions), [questions]);
  const stage = useMemo(() => getQuestionStage(questions, records), [questions, records]);
  const selectedQuestion = useMemo(
    () => stage.questions.find((question) => question.category === selectedCategory) ?? null,
    [selectedCategory, stage.questions],
  );

  useEffect(() => {
    const storedFont = window.localStorage.getItem(FONT_KEY) as FontSize | null;
    if (storedFont) setFontSize(storedFont);
    const storedCategory = window.localStorage.getItem(CATEGORY_KEY);
    if (storedCategory) setSelectedCategory(storedCategory);

    let active = true;
    const startedAt = Date.now();
    async function bootstrap() {
      const [questionResult, contentResult] = await Promise.allSettled([
        apiJson<{ questions: BreathQuestion[] }>("/api/questions"),
        apiJson<{ dailyPrompt: DailyPrompt; breathIntroImage: ContentImage | null }>("/api/content"),
      ]);
      if (active && questionResult.status === "fulfilled" && questionResult.value.questions.length) {
        setQuestions(questionResult.value.questions);
      }
      if (active && contentResult.status === "fulfilled") {
        setDailyPrompt(contentResult.value.dailyPrompt ?? FALLBACK_DAILY);
        setBreathIntroImage(contentResult.value.breathIntroImage);
      }

      let next: Screen = "auth";
      try {
        const me = await apiJson<{ user: User | null }>("/api/auth/me");
        if (me.user) {
          const recordResult = await apiJson<{ records: VoiceRecord[] }>("/api/records");
          if (active) {
            setUser(me.user);
            setNameInput(me.user.name);
            setEmailInput(me.user.email);
            setRecords(recordResult.records);
          }
          const storedScreen = window.localStorage.getItem(LAST_SCREEN_KEY);
          next = storedScreen === "daily" || storedScreen === "breath" || storedScreen === "breathRecord"
            ? storedScreen
            : "home";
        }
      } catch {
        next = "auth";
      }
      const wait = Math.max(0, 3000 - (Date.now() - startedAt));
      window.setTimeout(() => active && setScreen(next), wait);
    }
    bootstrap();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FONT_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (selectedCategory) window.localStorage.setItem(CATEGORY_KEY, selectedCategory);
    else window.localStorage.removeItem(CATEGORY_KEY);
  }, [selectedCategory]);

  useEffect(() => {
    if (!user) return;
    if (screen === "daily" || screen === "breath" || screen === "breathRecord") {
      window.localStorage.setItem(LAST_SCREEN_KEY, screen);
    } else if (screen !== "splash") {
      window.localStorage.removeItem(LAST_SCREEN_KEY);
    }
  }, [screen, user]);

  useEffect(() => {
    if (screen !== "splash") window.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  useEffect(() => {
    const selectedStageQuestion = stage.questions.find((question) => question.category === selectedCategory);
    if (selectedCategory && (!selectedStageQuestion || isQuestionCompleted(selectedStageQuestion, records))) {
      setSelectedCategory(null);
    }
  }, [records, selectedCategory, stage.questions]);

  useEffect(() => {
    if (user && screen === "breathRecord" && !selectedQuestion) setScreen("breath");
  }, [screen, selectedQuestion, user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
    if (registerMode === "signup" && !name) return setAuthError("이름을 입력해 주세요.");
    if (!email || !passwordInput) return setAuthError("이메일과 비밀번호를 입력해 주세요.");
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await apiJson<{ user: User }>(
        registerMode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        { method: "POST", body: JSON.stringify({ name, email, password: passwordInput }) },
      );
      const recordResult = await apiJson<{ records: VoiceRecord[] }>("/api/records");
      setUser(result.user);
      setRecords(recordResult.records);
      setPasswordInput("");
      setScreen("home");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그인을 처리하지 못했어요.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function saveRecord(pending: PendingRecord) {
    const form = new FormData();
    form.append("type", pending.type);
    form.append("question", pending.question);
    form.append("questionId", pending.questionId ?? "");
    form.append("questionTypeIndex", String(pending.questionTypeIndex ?? ""));
    form.append("questionIndex", String(pending.questionIndex ?? ""));
    form.append("category", pending.category ?? "");
    form.append("questionType", pending.questionType ?? "");
    form.append("questionTypeTitle", pending.questionTypeTitle ?? "");
    form.append("imageId", pending.imageId ?? "");
    form.append("createdAt", pending.createdAt);
    form.append("durationSeconds", String(pending.durationSeconds));
    form.append("audio", pending.audioBlob, `${pending.type}-${Date.now()}.${audioExtension(pending.mimeType)}`);
    const result = await apiJson<{ record: VoiceRecord }>("/api/records", { method: "POST", body: form });
    setRecords((current) => [result.record, ...current.filter((record) => record.id !== result.record.id)]);
    return result.record;
  }

  async function deleteRecord(recordId: string) {
    await apiJson<{ ok: boolean }>(`/api/records/${recordId}`, { method: "DELETE" });
    setRecords((current) => current.filter((record) => record.id !== recordId));
  }

  async function logout() {
    await apiJson("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
    window.localStorage.removeItem(LAST_SCREEN_KEY);
    window.localStorage.removeItem(CATEGORY_KEY);
    setUser(null);
    setRecords([]);
    setSelectedCategory(null);
    setScreen("auth");
  }

  const appClass = [styles.app, styles[`${fontSize}Text`]].filter(Boolean).join(" ");
  if (screen === "splash") return <SplashScreen />;
  if (screen === "auth") return <AuthScreen onSignup={() => { setRegisterMode("signup"); setScreen("register"); }} onLogin={() => { setRegisterMode("login"); setScreen("register"); }} />;
  if (screen === "register") return <RegisterScreen mode={registerMode} name={nameInput} email={emailInput} password={passwordInput} busy={authBusy} error={authError} onName={setNameInput} onEmail={setEmailInput} onPassword={setPasswordInput} onSubmit={handleAuth} onBack={() => setScreen("auth")} />;

  return (
    <main className={appClass}>
      {screen === "home" && <HomeScreen userName={user?.name ?? "사용자"} todayComplete={Boolean(todayRecord)} onToday={() => setScreen("daily")} onArchive={() => setScreen("archive")} onSettings={() => setScreen("settings")} />}
      {screen === "daily" && (
        <DailyStoryScreen
          prompt={dailyPrompt}
          existingRecord={todayRecord}
          onSave={saveRecord}
          onNavigate={setScreen}
        />
      )}
      {screen === "breath" && (
        <BreathSelectionScreen
          categories={categories}
          questions={stage.questions}
          selectedCategory={selectedCategory}
          typeIndex={stage.typeIndex}
          introImage={breathIntroImage}
          records={records}
          allCompleted={stage.allCompleted}
          onSelect={setSelectedCategory}
          onReady={() => selectedQuestion && setScreen("breathRecord")}
          onComplete={() => { setSelectedCategory(null); setScreen("home"); }}
          onNavigate={setScreen}
        />
      )}
      {screen === "breathRecord" && selectedQuestion && (
        <BreathRecorderScreen
          question={selectedQuestion}
          onSave={saveRecord}
          onNext={() => { setSelectedCategory(null); setScreen("breath"); }}
          onNavigate={setScreen}
        />
      )}
      {screen === "archive" && <ArchiveScreen userName={user?.name ?? "사용자"} records={sortedRecords.slice(0, 3)} onDelete={deleteRecord} onNavigate={setScreen} />}
      {screen === "settings" && <SettingsScreen fontSize={fontSize} onFontSize={setFontSize} onLogout={logout} onBack={() => setScreen("home")} />}
      {screen === "home" && <BottomNavigation current="home" onNavigate={setScreen} />}
    </main>
  );
}

function SplashScreen() {
  return (
    <main className={styles.splash}>
      <img src="/images/splash-watercolor.webp" alt="햇살이 비추는 들길" />
      <div className={styles.splashCopy}>
        <Leaf aria-hidden="true" />
        <h1>숨결</h1>
        <strong>- 시절이야기 -</strong>
        <p>삶과 목소리를 천천히 남기는 시간</p>
      </div>
      <div className={styles.loadingBlock}>
        <span><i /></span>
        <p>따뜻한 이야기를 준비하고 있어요...</p>
      </div>
    </main>
  );
}

function AuthScreen({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return (
    <main className={styles.authPage}>
      <div className={styles.authBrand}><Leaf /><span>숨결</span><small>시절이야기</small></div>
      <div className={styles.authCopy}><h1>로그인이 되어있지 않아요</h1><p>당신의 이야기를 안전하게 보관하려면 먼저 시작해 주세요.</p></div>
      <div className={styles.authActions}>
        <button className={styles.primaryButton} onClick={onSignup}>간단 회원가입 이후 시작하기</button>
        <button className={styles.outlineButton} onClick={onLogin}>아이디가 있다면 로그인하기</button>
      </div>
    </main>
  );
}

function RegisterScreen(props: {
  mode: "signup" | "login"; name: string; email: string; password: string; busy: boolean; error: string;
  onName: (value: string) => void; onEmail: (value: string) => void; onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void;
}) {
  return (
    <main className={styles.authPage}>
      <button className={styles.backIcon} onClick={props.onBack} aria-label="이전 화면"><ArrowLeft /></button>
      <form className={styles.registerForm} onSubmit={props.onSubmit}>
        <div><h1>{props.mode === "signup" ? "이름을 알려주세요" : "다시 만나 반가워요"}</h1><p>{props.mode === "signup" ? "다음부터는 이 이름으로 반갑게 맞이할게요." : "가입한 이메일과 비밀번호로 이어서 기록해요."}</p></div>
        {props.mode === "signup" && <label>사용자 이름<input value={props.name} onChange={(event) => props.onName(event.target.value)} autoComplete="name" placeholder="홍길동" /></label>}
        <label>이메일 아이디<input value={props.email} onChange={(event) => props.onEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="name@example.com" /></label>
        <label>비밀번호<input type="password" value={props.password} onChange={(event) => props.onPassword(event.target.value)} autoComplete={props.mode === "signup" ? "new-password" : "current-password"} placeholder="8자 이상 입력" /></label>
        {props.error && <p className={styles.errorText}>{props.error}</p>}
        <button className={styles.primaryButton} disabled={props.busy}>{props.busy ? "처리 중" : props.mode === "signup" ? "회원가입하고 시작하기" : "로그인하기"}</button>
      </form>
    </main>
  );
}

function HomeScreen({ userName, todayComplete, onToday, onArchive, onSettings }: { userName: string; todayComplete: boolean; onToday: () => void; onArchive: () => void; onSettings: () => void }) {
  return (
    <section className={styles.homeScreen}>
      <button className={styles.settingsButton} onClick={onSettings} aria-label="설정"><Settings /></button>
      <div className={styles.homeHero}>
        <div className={styles.homeWelcome}><h1><span>{userName}님</span>환영합니다</h1><p>오늘도 당신의 소중한 이야기를 기록해 보세요.</p></div>
        <img src="/images/home-chair.webp" alt="햇살 아래 편안한 의자와 화분" />
      </div>
      <button className={styles.todayCard} onClick={todayComplete ? onArchive : onToday}>
        <img src="/images/today-notebook.webp" alt="차와 노트가 놓인 탁자" />
        <span><strong>{todayComplete ? "오늘 이야기 완료" : "오늘 이야기"}</strong><small>{todayComplete ? "이야기창고에서 다시 들어보세요." : "지금의 나와 하루를 기록해 보세요."}</small></span>
        <i><ArrowRight /></i>
      </button>
      <div className={styles.homeMessage}>
        <span><Leaf /></span>
        <strong>하루에 하나, 당신의 이야기를 들려주세요.</strong>
        <p>작은 기억이 모여, 당신의 삶이 됩니다.</p>
        <hr />
        <em>당신의 목소리는 누군가에게 큰 힘이 될 수 있어요.<br />천천히, 당신의 속도로 기록해 보세요.</em>
      </div>
    </section>
  );
}

function DailyStoryScreen({ prompt, existingRecord, onSave, onNavigate }: { prompt: DailyPrompt; existingRecord?: VoiceRecord; onSave: (record: PendingRecord) => Promise<VoiceRecord>; onNavigate: (screen: Screen) => void }) {
  if (!prompt.isActive) {
    return (
      <section className={styles.storyScreen}>
        <ScreenHeader title="오늘이야기" />
        <div className={styles.completedToday}><Leaf /><h1>오늘이야기는 잠시 쉬어가요</h1><p>숨결이야기에서 마음에 머무는 질문을 만나보세요.</p><button className={styles.primaryButton} onClick={() => onNavigate("breath")}>숨결이야기로 이동하기</button></div>
        <BottomNavigation current="daily" onNavigate={onNavigate} />
      </section>
    );
  }
  if (existingRecord) {
    return (
      <section className={styles.storyScreen}>
        <ScreenHeader title="오늘이야기" />
        <div className={styles.completedToday}><Check /><h1>오늘 이야기를 이미 기록했어요</h1><p>오늘 남긴 목소리는 이야기창고에서 다시 들을 수 있어요.</p><button className={styles.primaryButton} onClick={() => onNavigate("archive")}>이야기창고에서 듣기</button></div>
        <BottomNavigation current="daily" onNavigate={onNavigate} />
      </section>
    );
  }
  return (
    <RecorderExperience
      variant="daily"
      title="오늘이야기"
      eyebrow="오늘의 질문"
      question={prompt.question}
      helper={prompt.helperText}
      imageUrl={prompt.image?.imageUrl ?? "/seed-images/daily-default.webp"}
      imageAlt={prompt.image?.description || "햇살이 비추는 초록 들길"}
      recordMeta={{ type: "daily", question: prompt.question, questionId: prompt.id, imageId: prompt.image?.id }}
      onSave={onSave}
      onNavigate={onNavigate}
      primaryAction="saveDaily"
    />
  );
}

function BreathSelectionScreen(props: {
  categories: CategoryView[]; questions: BreathQuestion[]; selectedCategory: string | null; typeIndex: number | null;
  introImage: ContentImage | null; records: VoiceRecord[]; allCompleted: boolean;
  onSelect: (category: string) => void; onReady: () => void; onComplete: () => void; onNavigate: (screen: Screen) => void;
}) {
  const selected = props.questions.find((question) => question.category === props.selectedCategory) ?? null;
  return (
    <section className={styles.selectionScreen}>
      <ScreenHeader title="숨결이야기" />
      <p className={styles.screenIntro}>카테고리를 선택하면 그에 맞는 질문을 만날 수 있어요.</p>
      <div className={styles.categoryGrid}>
        {props.categories.map((category) => {
          const question = props.questions.find((item) => item.category === category.name);
          const complete = question ? isQuestionCompleted(question, props.records) : true;
          return (
            <button key={category.name} className={`${styles.categoryButton} ${props.selectedCategory === category.name ? styles.categorySelected : ""}`} style={{ "--category": category.color } as CSSProperties} disabled={complete} onClick={() => props.onSelect(category.name)}>
              <CategoryIcon name={category.icon} />
              <span>{category.name}</span>
              {complete && <Check className={styles.categoryCheck} />}
            </button>
          );
        })}
      </div>
      <article className={`${styles.selectionCard} ${selected ? styles.questionSelected : ""}`} style={{ backgroundImage: `linear-gradient(to bottom, rgba(255,250,245,.04), rgba(255,250,245,.2)), url(${selected ? questionImageUrl(selected) : props.introImage?.imageUrl ?? "/seed-images/breath-intro.webp"})` }}>
        <div className={styles.selectionCopy}>
          <span><Leaf /> {props.typeIndex ? `질문유형 ${props.typeIndex}` : "오늘의 질문"} <Leaf /></span>
          <h1>{selected ? selected.question : "오늘은 어떤 숨결이야기를 하고 싶으신가요?"}</h1>
          <p>{selected ? "당신의 기억과 감정을 자유롭게 이야기해 주세요." : "4개의 카테고리 중에서 선택해 주세요."}</p>
        </div>
        {selected && <button className={styles.cardAction} onClick={props.onReady}><Leaf />이 질문으로 할게요<ChevronRight /></button>}
      </article>
      <BottomNavigation current="breath" onNavigate={props.onNavigate} />
      {props.allCompleted && <ConfirmModal title="모든 이야기를 들려주셨어요" description="당신이 들려준 목소리를 소중히 간직할게요." actions={<button className={styles.primaryButton} onClick={props.onComplete}>완료</button>} />}
    </section>
  );
}

function BreathRecorderScreen({ question, onSave, onNext, onNavigate }: { question: BreathQuestion; onSave: (record: PendingRecord) => Promise<VoiceRecord>; onNext: () => void; onNavigate: (screen: Screen) => void }) {
  return (
    <RecorderExperience
      variant="breath"
      title="숨결이야기"
      eyebrow="오늘의 질문"
      question={question.question}
      helper="당신의 기억과 감정을 자유롭게 이야기해 주세요."
      imageUrl={questionImageUrl(question)}
      imageAlt={question.image?.description || `${question.category} 질문을 위한 수채화 풍경`}
      recordMeta={{ type: "breath", question: question.question, questionId: question.id, questionTypeIndex: question.typeIndex, questionIndex: question.questionIndex, category: question.category, questionType: question.typeId, questionTypeTitle: question.typeTitle, imageId: question.image?.id }}
      onSave={onSave}
      onNavigate={onNavigate}
      onNext={onNext}
      primaryAction="nextQuestion"
    />
  );
}

function RecorderExperience(props: {
  variant: "daily" | "breath"; title: string; eyebrow: string; question: string; helper: string; imageUrl: string; imageAlt: string;
  recordMeta: Omit<PendingRecord, "createdAt" | "durationSeconds" | "audioBlob" | "mimeType">;
  onSave: (record: PendingRecord) => Promise<VoiceRecord>; onNavigate: (screen: Screen) => void;
  onNext?: () => void; primaryAction: "saveDaily" | "nextQuestion";
}) {
  const recorder = useAudioRecorder();
  const [pendingMove, setPendingMove] = useState<{ target: Screen | "next"; saveLabel: string; discardLabel: string } | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [abandonOpen, setAbandonOpen] = useState(false);

  const buildRecord = useCallback((blob: Blob): PendingRecord => ({
    ...props.recordMeta,
    createdAt: recorder.createdAt || new Date().toISOString(),
    durationSeconds: Math.max(1, recorder.elapsed),
    audioBlob: blob,
    mimeType: blob.type || recorder.mimeType || "audio/webm",
  }), [props.recordMeta, recorder.createdAt, recorder.elapsed, recorder.mimeType]);

  const moveNow = useCallback((target: Screen | "next") => {
    recorder.discard();
    setPendingMove(null);
    setPendingBlob(null);
    setSaveError("");
    if (target === "next") props.onNext?.();
    else props.onNavigate(target);
  }, [props, recorder]);

  async function requestMove(target: Screen | "next", saveLabel: string, discardLabel: string) {
    const blob = recorder.recording ? await recorder.stop() : recorder.blob;
    if (!blob) return moveNow(target);
    setPendingBlob(blob);
    setPendingMove({ target, saveLabel, discardLabel });
    setSaveError("");
  }

  async function saveAndMove() {
    if (!pendingMove || !pendingBlob) return;
    setSaving(true);
    setSaveError("");
    try {
      await props.onSave(buildRecord(pendingBlob));
      moveNow(pendingMove.target);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "녹음을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDailyNow() {
    const blob = recorder.recording ? await recorder.stop() : recorder.blob;
    if (!blob) return;
    setSaving(true);
    setSaveError("");
    try {
      await props.onSave(buildRecord(blob));
      recorder.discard();
      props.onNavigate("home");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "녹음을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!recorder.recording && !recorder.blob) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recorder.blob, recorder.recording]);

  return (
    <section className={`${styles.recorderScreen} ${props.variant === "daily" ? styles.dailyRecorder : ""}`}>
      <ScreenHeader title={props.title} onBack={() => requestMove(props.variant === "daily" ? "home" : "breath", "저장하고 이동하기", "저장하지 않고 이동하기")} />
      <div className={styles.recordQuestion}><span><Leaf /> {props.eyebrow} <Leaf /></span><h1>{props.question}</h1><p>{props.helper}</p></div>
      <div className={styles.recorderVisual} style={props.variant === "daily" ? { backgroundImage: `url(${props.imageUrl})` } : undefined}>
        {props.variant === "breath" && <img src={props.imageUrl} alt={props.imageAlt} />}
        <div className={styles.waveform} aria-hidden="true">{Array.from({ length: 25 }, (_, index) => <i key={index} />)}</div>
        <button className={`${styles.recordButton} ${recorder.recording ? styles.recording : ""}`} onClick={recorder.recording ? () => recorder.stop() : recorder.start} disabled={saving} aria-label={recorder.recording ? "녹음 중지" : "녹음 시작"}>
          {recorder.recording ? <Pause /> : <Mic />}
        </button>
        <strong className={styles.timer}>{formatDuration(recorder.elapsed)}</strong>
        {recorder.recording && <span className={styles.recordingLabel}>● 녹음 중</span>}
      </div>
      <div className={styles.recordTip}><Lightbulb /><p>천천히, 편안하게 이야기해 주세요.<br />다시 들어보고 수정할 수 있어요.</p></div>
      {recorder.error && <p className={styles.errorText}>{recorder.error}</p>}
      {saveError && !pendingMove && <div className={styles.inlineError}><p>{saveError}</p><button onClick={saveDailyNow}><RotateCcw />재시도</button></div>}
      <div className={styles.recorderActions}>
        {props.variant === "daily" ? (
          <>
            {recorder.blob && <button className={styles.primaryButton} onClick={saveDailyNow} disabled={saving}>{saving ? "저장 중" : "오늘이야기 저장하기"}</button>}
            <button className={styles.skipButton} onClick={() => requestMove("breath", "저장하고 숨결이야기로", "저장하지 않고 넘어가기")}>건너뛰고 숨결이야기로 넘어갈게요<ArrowRight /></button>
          </>
        ) : (
          <>
            <button className={styles.endButton} onClick={() => requestMove("home", "저장하고 홈으로", "저장하지 않고 종료하기")}><Leaf />오늘은 종료할게요</button>
            <button className={styles.primaryButton} onClick={() => requestMove("next", "저장하고 다음 질문으로", "저장하지 않고 넘어가기")}>다음 질문으로 넘어가기<ArrowRight /></button>
          </>
        )}
      </div>
      <BottomNavigation current={props.variant === "daily" ? "daily" : "breathRecord"} onNavigate={(target) => requestMove(target, "저장하고 이동하기", "저장하지 않고 이동하기")} />
      {pendingMove && (
        <ConfirmModal
          title={saveError ? "녹음을 저장하지 못했어요" : "녹음을 저장하시겠습니까?"}
          description={saveError || "지금 남긴 목소리를 저장한 뒤 이동할 수 있어요."}
          actions={saveError ? <><button className={styles.primaryButton} onClick={saveAndMove} disabled={saving}>{saving ? "재시도 중" : "재시도"}</button><button className={styles.dangerButton} onClick={() => setAbandonOpen(true)}>포기하고 넘어가기</button><button className={styles.modalTextButton} onClick={() => { setPendingMove(null); setPendingBlob(null); setSaveError(""); }}>취소</button></> : <><button className={styles.primaryButton} onClick={saveAndMove} disabled={saving}>{saving ? "저장 중" : pendingMove.saveLabel}</button><button className={styles.outlineButton} onClick={() => moveNow(pendingMove.target)}>{pendingMove.discardLabel}</button><button className={styles.modalTextButton} onClick={() => { setPendingMove(null); setPendingBlob(null); }}>취소</button></>}
        />
      )}
      {abandonOpen && <ConfirmModal title="녹음을 포기할까요?" description="저장하지 않은 녹음은 다시 복구할 수 없어요." actions={<><button className={styles.dangerButton} onClick={() => { setAbandonOpen(false); if (pendingMove) moveNow(pendingMove.target); }}>포기하고 넘어가기</button><button className={styles.outlineButton} onClick={() => setAbandonOpen(false)}>돌아가기</button></>} />}
    </section>
  );
}

function ArchiveScreen({ userName, records, onDelete, onNavigate }: { userName: string; records: VoiceRecord[]; onDelete: (id: string) => Promise<void>; onNavigate: (screen: Screen) => void }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VoiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  return (
    <section className={styles.archiveScreen}>
      <div className={styles.archiveHeader}><div><h1>{userName}님</h1><p>최근기록 <strong>{records.length}회</strong></p></div></div>
      <div className={styles.archiveTitle}><Archive /><div><h2>이야기창고</h2><p>당신의 소중한 목소리 기록을 보관하고 있어요.</p></div></div>
      <div className={styles.recordCards}>
        {records.length === 0 && <div className={styles.emptyArchive}><Archive /><strong>아직 담긴 이야기가 없어요</strong><p>오늘의 목소리를 천천히 남겨보세요.</p></div>}
        {records.map((record) => (
          <article className={styles.recordCard} key={record.id}>
            <div className={styles.recordThumb}><img src={record.imageUrl ?? legacyThumbnail(record)} alt={record.imageDescription || "기록과 함께 저장된 수채화 이미지"} /><span style={{ "--record-color": categoryColor(record.category) } as CSSProperties}>{record.category ?? "오늘"}</span></div>
            <div className={styles.recordBody}><h3>{record.question}</h3><p>{formatRecordDate(record.createdAt)}</p><em><Mic />{record.type === "daily" ? "오늘이야기" : "숨결이야기"}</em><audio controls preload="metadata" src={record.audioUrl} /></div>
            <div className={styles.recordMenuWrap}><button className={styles.moreButton} onClick={() => setMenuId(menuId === record.id ? null : record.id)} aria-label="기록 메뉴"><MoreVertical /></button>{menuId === record.id && <div className={styles.recordMenu}><a href={`${record.audioUrl}?download=1`}><Download />다운로드</a><button onClick={() => { setDeleteTarget(record); setMenuId(null); }}><Trash2 />삭제</button></div>}</div>
          </article>
        ))}
      </div>
      <BottomNavigation current="archive" onNavigate={onNavigate} />
      {deleteTarget && <ConfirmModal title="이 녹음을 삭제할까요?" description="삭제한 음성 파일과 기록은 다시 복구할 수 없어요." actions={<><button className={styles.dangerButton} disabled={deleting} onClick={async () => { setDeleting(true); try { await onDelete(deleteTarget.id); setDeleteTarget(null); } finally { setDeleting(false); } }}>{deleting ? "삭제 중" : "영구 삭제"}</button><button className={styles.outlineButton} onClick={() => setDeleteTarget(null)}>취소</button></>} />}
    </section>
  );
}

function SettingsScreen({ fontSize, onFontSize, onLogout, onBack }: { fontSize: FontSize; onFontSize: (value: FontSize) => void; onLogout: () => void; onBack: () => void }) {
  return (
    <section className={styles.settingsScreen}>
      <ScreenHeader title="설정" onBack={onBack} />
      <div className={styles.settingsPanel}><span>읽기와 사용</span><h1>글자 크기</h1><div>{(["normal", "large", "xlarge"] as FontSize[]).map((value, index) => <button key={value} className={fontSize === value ? styles.sizeSelected : ""} onClick={() => onFontSize(value)}>{["보통", "크게", "아주 크게"][index]}</button>)}</div></div>
      <button className={styles.logoutButton} onClick={onLogout}><LogOut />로그아웃</button>
    </section>
  );
}

function BottomNavigation({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
  const items: Array<{ screen: Screen; label: string; icon: ReactNode; active: Screen[] }> = [
    { screen: "home", label: "홈", icon: <Home />, active: ["home"] },
    { screen: "daily", label: "오늘이야기", icon: <MessageCircle />, active: ["daily"] },
    { screen: "breath", label: "숨결이야기", icon: <Heart />, active: ["breath", "breathRecord"] },
    { screen: "archive", label: "이야기창고", icon: <Archive />, active: ["archive"] },
  ];
  return <nav className={styles.bottomNav}>{items.map((item) => <button key={item.screen} className={item.active.includes(current) ? styles.navActive : ""} onClick={() => onNavigate(item.screen)}>{item.icon}<span>{item.label}</span>{item.active.includes(current) && <i />}</button>)}</nav>;
}

function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return <header className={styles.screenHeader}>{onBack ? <button onClick={onBack} aria-label="이전 화면"><ArrowLeft /></button> : <span />}<h1>{title}</h1><span /></header>;
}

function ConfirmModal({ title, description, actions }: { title: string; description: string; actions: ReactNode }) {
  return <div className={styles.modalLayer} role="presentation"><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title"><span className={styles.modalLeaf}><Leaf /></span><h2 id="modal-title">{title}</h2><p>{description}</p><div className={styles.modalActions}>{actions}</div></div></div>;
}

function CategoryIcon({ name }: { name: string }) {
  if (name === "brain") return <Brain />;
  if (name === "user-round") return <UserRound />;
  if (name === "clock-3") return <Clock3 />;
  if (name === "heart") return <Heart />;
  if (name === "map-pin") return <MapPin />;
  if (name === "sparkles") return <Sparkles />;
  if (name === "leaf") return <Leaf />;
  if (name === "route") return <Route />;
  if (name === "gem") return <Gem />;
  if (name === "flower-2") return <Flower2 />;
  if (name === "users-round") return <UsersRound />;
  if (name === "lightbulb") return <Lightbulb />;
  if (name === "book-open") return <BookOpen />;
  if (name === "gift") return <Gift />;
  if (name === "calendar-star") return <CalendarDays />;
  return <Circle />;
}

function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [createdAt, setCreatedAt] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const resolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  const clearMedia = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setError("이 브라우저에서는 녹음을 사용할 수 없어요.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = mediaRecorder;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsed(0);
      setBlob(null);
      setCreatedAt(new Date().toISOString());
      setMimeType(mediaRecorder.mimeType || "audio/webm");
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        clearMedia();
        setRecording(false);
        setBlob(nextBlob.size ? nextBlob : null);
        resolverRef.current?.(nextBlob.size ? nextBlob : null);
        resolverRef.current = null;
      };
      mediaRecorder.start(1000);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= 600 && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      }, 1000);
    } catch {
      clearMedia();
      setError("마이크 권한을 확인한 뒤 다시 시도해 주세요.");
    }
  }, [clearMedia]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(blob);
    return new Promise<Blob | null>((resolve) => {
      resolverRef.current = resolve;
      recorder.stop();
    });
  }, [blob]);

  const discard = useCallback(() => {
    setBlob(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setCreatedAt("");
    setError("");
  }, []);

  useEffect(() => () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    clearMedia();
  }, [clearMedia]);

  return { recording, elapsed, blob, createdAt, mimeType, error, start, stop, discard };
}

function getCategories(questions: BreathQuestion[]) {
  const map = new Map<string, CategoryView>();
  questions.forEach((question) => map.set(question.category, { name: question.category, key: question.categoryKey, icon: question.categoryIcon, color: question.categoryColor }));
  return [...map.values()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name);
    const bi = CATEGORY_ORDER.indexOf(b.name);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.name.localeCompare(b.name, "ko");
  });
}

function getQuestionStage(questions: BreathQuestion[], records: VoiceRecord[]) {
  const typeIndices = [...new Set(questions.map((question) => question.typeIndex))].sort((a, b) => a - b);
  for (const typeIndex of typeIndices) {
    const stageQuestions = questions.filter((question) => question.typeIndex === typeIndex).sort((a, b) => a.questionIndex - b.questionIndex);
    if (stageQuestions.some((question) => !isQuestionCompleted(question, records))) {
      return { typeIndex, questions: stageQuestions, allCompleted: false };
    }
  }
  return { typeIndex: null, questions: [], allCompleted: questions.length > 0 };
}

function isQuestionCompleted(question: BreathQuestion, records: VoiceRecord[]) {
  return records.some((record) => record.type === "breath" && (
    (question.id && record.questionId === question.id) ||
    (!record.questionId && record.questionType === question.typeId && record.category === question.category)
  ));
}

function questionImageUrl(question: BreathQuestion) {
  if (question.image?.imageUrl) return question.image.imageUrl;
  return `/seed-images/${question.typeId}-${question.categoryKey}.webp`;
}

function legacyThumbnail(record: VoiceRecord) {
  if (record.type === "daily") return "/seed-images/daily-default.webp";
  const type = record.questionType || (record.questionTypeIndex === 2 ? "growth" : "childhood");
  const key = record.category ? CATEGORY_FALLBACKS[record.category]?.key : null;
  return key ? `/seed-images/${type}-${key}.webp` : "/images/archive-fallback.webp";
}

function categoryColor(category?: string) {
  return category ? CATEGORY_FALLBACKS[category]?.color ?? "#7c8a73" : "#f06a2a";
}

function getSeoulDateKey(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function formatRecordDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function audioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}
