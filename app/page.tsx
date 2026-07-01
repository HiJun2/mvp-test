"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  LogIn,
  Menu,
  Mic,
  PauseCircle,
  Play,
  RotateCcw,
  Settings,
  Trash2,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

type Screen =
  | "splash"
  | "auth"
  | "register"
  | "welcome"
  | "dailyIntro"
  | "dailyRecord"
  | "breathIntro"
  | "breathRecord"
  | "warehouse"
  | "settings";

type RecordType = "daily" | "breath";
type FontSize = "normal" | "large" | "xlarge";

type BreathQuestion = {
  id?: string;
  typeId: string;
  typeTitle: string;
  typeIndex: number;
  questionIndex: number;
  category: string;
  question: string;
};

type CategoryProgress = {
  category: string;
  completed: number;
  total: number;
  percent: number;
  color: string;
};

type OverallBreathProgress = {
  completed: number;
  goal: number;
  percent: number;
  gradient: string;
  segments: Array<{
    category: string;
    count: number;
    color: string;
  }>;
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
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
  createdAt: string;
  durationSeconds: number;
  audioUrl: string;
};

type PendingVoiceRecord = {
  type: RecordType;
  question: string;
  questionId?: string;
  questionTypeIndex?: number;
  questionIndex?: number;
  category?: string;
  questionType?: string;
  questionTypeTitle?: string;
  createdAt: string;
  durationSeconds: number;
  audioBlob: Blob;
  mimeType: string;
};

const FONT_KEY = "breath.fontSize";
const DEFAULT_BREATH_GOAL = 50;
const DAILY_QUESTION =
  "오늘 하루에 대해서 말씀해 주시겠어요? 있었던 일이나, 현재 기분 등 어떤 것이든 편하게 들려주세요.";
const CATEGORY_COLORS = [
  "#5f8f7b",
  "#a87457",
  "#6f8fb9",
  "#c06f7f",
  "#b89b45",
  "#7b76b9",
  "#4f9a9a",
  "#c0845a",
  "#8a9860",
  "#9b6d9f",
  "#5d83a6",
  "#b56b5f",
  "#6e9a70",
];

const BREATH_QUESTION_GROUPS = [
  {
    typeId: "childhood",
    typeTitle: "첫기억과 유년의 풍경",
    questions: [
      {
        category: "기억",
        question:
          "어릴 적 가장 오래된 기억은 무엇인가요? 그때의 냄새, 소리, 공기의 느낌까지 떠올려보세요.",
      },
      {
        category: "사람",
        question:
          "유년 시절, 당신에게 따뜻함을 가르쳐준 사람은 누구였나요? 그 사람에게 어떤 감정을 느꼈나요?",
      },
      {
        category: "장소",
        question:
          "마음속에 가장 선명하게 남아 있는 어린 시절의 공간은 어디인가요?",
      },
      {
        category: "감정",
        question:
          "유년기에 느꼈던 두려움, 기쁨, 혹은 외로움은 언제 찾아왔나요?",
      },
      {
        category: "사건",
        question:
          "어린 시절 잊을 수 없는 사건이 있다면, 그때의 상황을 자세히 떠올려보세요.",
      },
      {
        category: "의미",
        question: "그 경험이 지금의 나에게 어떤 의미로 남아 있나요?",
      },
      {
        category: "배움",
        question:
          "어린 시절 실수나 도전에서 배운 삶의 교훈은 무엇인가요?",
      },
      {
        category: "전환",
        question:
          "‘아이’에서 ‘학생’으로 스스로 변했다고 느낀 순간이 있었나요?",
      },
      {
        category: "가치",
        question:
          "유년기부터 지금까지 이어져 온 나만의 습관이나 신념은 무엇인가요?",
      },
      {
        category: "감사",
        question:
          "어린 시절의 가족이나 주변 사람에게 지금 감사하고 싶은 이유는 무엇인가요?",
      },
      {
        category: "관계",
        question:
          "유년기에 만난 한 사람이 지금의 나에게 어떤 영향을 주었나요?",
      },
      {
        category: "철학",
        question: "그 시절의 나에게 ‘행복’은 어떤 모습이었나요?",
      },
      {
        category: "유산",
        question:
          "어린 시절의 나로부터 지금까지 이어져 온, 나만의 선물 같은 것은 무엇인가요?",
      },
    ],
  },
  {
    typeId: "growth",
    typeTitle: "성장기의 고민과 발견",
    questions: [
      {
        category: "기억",
        question: "10대 시절, 가장 많이 고민했던 일은 무엇이었나요?",
      },
      {
        category: "사람",
        question:
          "그 시절 나를 이끌어준 친구나 선생님은 누구였나요? 어떤 영향을 받았나요?",
      },
      {
        category: "장소",
        question:
          "자주 머물던 학교나 동네의 한 공간이 있다면, 그곳은 어떤 의미였나요?",
      },
      {
        category: "감정",
        question:
          "청소년기에 자주 느꼈던 외로움이나 기쁨은 어떤 빛깔이었나요?",
      },
      {
        category: "사건",
        question: "인생의 방향을 바꿔놓은 결정적인 사건이 있었나요?",
      },
      {
        category: "의미",
        question:
          "그 시절의 고민이 지금의 나에게 어떤 의미를 주었나요?",
      },
      {
        category: "배움",
        question:
          "그때의 실패나 도전을 통해 배운 교훈이 있다면 무엇인가요?",
      },
      {
        category: "전환",
        question:
          "어린 시절의 나에서 청년으로 바뀌었다고 느낀 순간은 언제였나요?",
      },
      {
        category: "가치",
        question: "10대의 나는 어떤 가치를 중요하게 여겼나요?",
      },
      {
        category: "감사",
        question:
          "그 시절의 나에게 “고맙다”고 말하고 싶은 이유는 무엇인가요?",
      },
      {
        category: "관계",
        question:
          "그때의 친구 관계가 지금의 인간관계에 어떤 영향을 주었나요?",
      },
      {
        category: "철학",
        question: "그 시절 나는 ‘꿈’과 ‘현실’을 어떻게 이해했나요?",
      },
      {
        category: "유산",
        question:
          "지금까지 남아 있는 10대의 나다운 순수함은 무엇인가요?",
      },
    ],
  },
] as const;

const BREATH_QUESTIONS: BreathQuestion[] = BREATH_QUESTION_GROUPS.flatMap(
  (group, groupIndex) =>
    group.questions.map((item, questionIndex) => ({
      typeId: group.typeId,
      typeTitle: group.typeTitle,
      typeIndex: groupIndex + 1,
      questionIndex: questionIndex + 1,
      category: item.category,
      question: item.question,
    })),
);

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatRecordDate(iso: string) {
  const date = new Date(iso);
  const weekday = WEEKDAYS[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${weekday}요일 ${hours}:${minutes}`;
}

function getDateKey(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCategoryProgress(
  questions: BreathQuestion[],
  records: VoiceRecord[],
): CategoryProgress[] {
  const categorySlots = new Map<
    string,
    {
      category: string;
      order: number;
      slots: Array<{
        keys: string[];
      }>;
      color: string;
    }
  >();
  const categoryOrder = new Map<string, number>();

  questions.forEach((question, index) => {
    if (!categoryOrder.has(question.category)) {
      categoryOrder.set(question.category, categoryOrder.size);
    }

    const categoryProgress = categorySlots.get(question.category) ?? {
      category: question.category,
      order: index,
      slots: [],
      color: getCategoryColor(categoryOrder.get(question.category) ?? 0),
    };

    categoryProgress.slots.push({
      keys: getQuestionMatchKeys(question),
    });
    categoryProgress.order = Math.min(categoryProgress.order, index);
    categorySlots.set(question.category, categoryProgress);
  });

  const completedSlots = new Set(
    records
      .filter(
        (record) =>
          record.type === "breath" && record.category && record.questionType,
      )
      .flatMap(getRecordMatchKeys),
  );

  const progressItems = Array.from(categorySlots.values())
    .map((item) => {
      const completed = item.slots.filter((slot) =>
        slot.keys.some((key) => completedSlots.has(key)),
      ).length;
      return {
        category: item.category,
        completed,
        total: item.slots.length,
        percent:
          item.slots.length > 0
            ? Math.round((completed / item.slots.length) * 100)
            : 0,
        color: item.color,
        order: item.order,
      };
    })
    .sort((left, right) => left.order - right.order);

  return progressItems.map((item) => ({
    category: item.category,
    completed: item.completed,
    total: item.total,
    percent: item.percent,
    color: item.color,
  }));
}

function getOverallBreathProgress(
  records: VoiceRecord[],
  progressItems: CategoryProgress[],
  breathGoal: number,
): OverallBreathProgress {
  const safeGoal = Math.max(1, Math.round(breathGoal || DEFAULT_BREATH_GOAL));
  const breathRecords = records.filter((record) => record.type === "breath");
  const colorByCategory = new Map(
    progressItems.map((item) => [item.category, item.color]),
  );
  const categoryOrder = new Map(
    progressItems.map((item, index) => [item.category, index]),
  );
  const counts = new Map<string, number>();

  breathRecords.forEach((record) => {
    const category = record.category ?? "기타";
    counts.set(category, (counts.get(category) ?? 0) + 1);
    if (!colorByCategory.has(category)) {
      colorByCategory.set(category, getCategoryColor(colorByCategory.size));
    }
  });

  const segments = Array.from(counts.entries())
    .sort(
      ([leftCategory], [rightCategory]) =>
        (categoryOrder.get(leftCategory) ?? 999) -
        (categoryOrder.get(rightCategory) ?? 999),
    )
    .reduce<OverallBreathProgress["segments"]>((items, [category, count]) => {
      const usedCount = items.reduce((total, item) => total + item.count, 0);
      const remaining = safeGoal - usedCount;
      if (remaining <= 0) {
        return items;
      }
      return [
        ...items,
        {
          category,
          count: Math.min(count, remaining),
          color: colorByCategory.get(category) ?? getCategoryColor(items.length),
        },
      ];
    }, []);

  return {
    completed: breathRecords.length,
    goal: safeGoal,
    percent: Math.min(100, Math.round((breathRecords.length / safeGoal) * 100)),
    gradient: getOverallProgressGradient(segments, safeGoal),
    segments,
  };
}

function getQuestionMatchKeys(question: BreathQuestion) {
  return [
    question.id ? `id:${question.id}` : "",
    `indexed:${question.typeId}:${question.questionIndex}`,
    `legacy:${question.typeId}:${question.category}`,
  ].filter(Boolean);
}

function getRecordMatchKeys(record: VoiceRecord) {
  return [
    record.questionId ? `id:${record.questionId}` : "",
    record.questionType && record.questionIndex
      ? `indexed:${record.questionType}:${record.questionIndex}`
      : "",
    record.questionType && record.category
      ? `legacy:${record.questionType}:${record.category}`
      : "",
  ].filter(Boolean);
}

function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function getOverallProgressGradient(
  segments: OverallBreathProgress["segments"],
  goal: number,
) {
  let cursor = 0;
  const parts = segments.map((segment) => {
    const start = (cursor / goal) * 100;
    cursor += segment.count;
    const end = (cursor / goal) * 100;
    return `${segment.color} ${start}% ${end}%`;
  });
  const emptyStart = Math.min(100, (cursor / goal) * 100);
  parts.push(`#e7ddd2 ${emptyStart}% 100%`);
  return `conic-gradient(${parts.join(", ")})`;
}

async function apiJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers:
      init.body instanceof FormData
        ? init.headers
        : {
            "content-type": "application/json",
            ...init.headers,
          },
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "요청을 처리하지 못했어요.");
  }

  return data as T;
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState<"signup" | "login">("signup");
  const [selectedBreathQuestion, setSelectedBreathQuestion] =
    useState<BreathQuestion | null>(null);
  const [breathQuestions, setBreathQuestions] =
    useState<BreathQuestion[]>(BREATH_QUESTIONS);
  const [questionChanged, setQuestionChanged] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [selectedDate, setSelectedDate] = useState("2026-06-23");
  const [playingRecordId, setPlayingRecordId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [breathGoal, setBreathGoal] = useState(DEFAULT_BREATH_GOAL);

  const dailyCount = records.filter((record) => record.type === "daily").length;
  const breathCount = records.filter((record) => record.type === "breath").length;
  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [records],
  );
  const categoryProgress = useMemo(
    () => getCategoryProgress(breathQuestions, records),
    [breathQuestions, records],
  );
  const overallBreathProgress = useMemo(
    () => getOverallBreathProgress(records, categoryProgress, breathGoal),
    [records, categoryProgress, breathGoal],
  );

  useEffect(() => {
    const storedFontSize = window.localStorage.getItem(FONT_KEY) as FontSize | null;

    if (storedFontSize) {
      setFontSize(storedFontSize);
    }

    let active = true;
    let bootstrapFinished = false;
    const splashStartedAt = Date.now();
    const splashFallback = window.setTimeout(() => {
      if (active && !bootstrapFinished) {
        setHydrated(true);
        setScreen("auth");
      }
    }, 3200);

    async function bootstrap() {
      let nextScreen: Screen = "auth";
      try {
        const me = await apiJson<{ user: User | null }>("/api/auth/me");
        if (me.user) {
          setUser(me.user);
          setUserName(me.user.name);
          setNameInput(me.user.name);
          const recordsResponse = await apiJson<{ records: VoiceRecord[] }>(
            "/api/records",
          );
          setRecords(recordsResponse.records);
          nextScreen = "welcome";
        }
      } catch {
        nextScreen = "auth";
      } finally {
        bootstrapFinished = true;
        window.clearTimeout(splashFallback);
        const elapsed = Date.now() - splashStartedAt;
        window.setTimeout(
          () => {
            if (active) {
              setHydrated(true);
              setScreen(nextScreen);
            }
          },
          Math.max(0, 3000 - elapsed),
        );
      }
    }

    bootstrap();

    return () => {
      active = false;
      window.clearTimeout(splashFallback);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadQuestions() {
      try {
        const response = await apiJson<{ questions: BreathQuestion[] }>(
          "/api/questions",
        );
        if (active && response.questions.length > 0) {
          setBreathQuestions(response.questions);
          setSelectedBreathQuestion((currentQuestion) => {
            if (
              currentQuestion &&
              response.questions.some(
                (question) =>
                  question.id === currentQuestion.id ||
                  (question.typeId === currentQuestion.typeId &&
                    question.category === currentQuestion.category &&
                    question.question === currentQuestion.question),
              )
            ) {
              return currentQuestion;
            }
            return null;
          });
        }
      } catch {
        // 기본 질문지를 그대로 사용한다.
      }
    }

    loadQuestions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await apiJson<{ breathGoal: number }>("/api/settings");
        if (active && Number.isFinite(response.breathGoal) && response.breathGoal > 0) {
          setBreathGoal(Math.round(response.breathGoal));
        }
      } catch {
        setBreathGoal(DEFAULT_BREATH_GOAL);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== "welcome") {
      return;
    }

    const welcomeTimer = window.setTimeout(() => {
      setScreen("dailyIntro");
    }, 2300);

    return () => window.clearTimeout(welcomeTimer);
  }, [screen]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(FONT_KEY, fontSize);
  }, [fontSize, hydrated]);

  useEffect(() => {
    if (screen === "breathIntro") {
      chooseBreathQuestion(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, breathQuestions]);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim().toLowerCase();

    if (registerMode === "signup" && !trimmedName) {
      setAuthError("이름을 입력해 주세요.");
      return;
    }
    if (!trimmedEmail || !passwordInput) {
      setAuthError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    try {
      const endpoint =
        registerMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await apiJson<{ user: User }>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password: passwordInput,
        }),
      });

      setUser(response.user);
      setUserName(response.user.name);
      setNameInput(response.user.name);
      setEmailInput(response.user.email);
      setPasswordInput("");
      const recordsResponse = await apiJson<{ records: VoiceRecord[] }>(
        "/api/records",
      );
      setRecords(recordsResponse.records);
      setScreen("welcome");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "로그인을 처리하지 못했어요.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await apiJson<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => null);
    setUser(null);
    setUserName("");
    setNameInput("");
    setEmailInput("");
    setPasswordInput("");
    setRecords([]);
    setDrawerOpen(false);
    setScreen("auth");
  }

  async function saveRecord(record: PendingVoiceRecord) {
    const form = new FormData();
    form.append("type", record.type);
    form.append("question", record.question);
    form.append("questionId", record.questionId ?? "");
    form.append("questionTypeIndex", String(record.questionTypeIndex ?? ""));
    form.append("questionIndex", String(record.questionIndex ?? ""));
    form.append("category", record.category ?? "");
    form.append("questionType", record.questionType ?? "");
    form.append("questionTypeTitle", record.questionTypeTitle ?? "");
    form.append("createdAt", record.createdAt);
    form.append("durationSeconds", String(record.durationSeconds));
    form.append(
      "audio",
      record.audioBlob,
      `${record.type}-${Date.now()}.${record.mimeType.includes("mp4") ? "mp4" : "webm"}`,
    );

    const response = await apiJson<{ record: VoiceRecord }>("/api/records", {
      method: "POST",
      body: form,
    });
    const savedRecord = response.record;
    putRecordAtTop(savedRecord);
    focusRecordDate(savedRecord);

    void apiJson<{ records: VoiceRecord[] }>("/api/records")
      .then((recordsResponse) => {
        setRecords(recordsResponse.records);
        const refreshedRecord =
          recordsResponse.records.find((recordItem) => recordItem.id === savedRecord.id) ??
          savedRecord;
        focusRecordDate(refreshedRecord);
      })
      .catch(() => null);

    return savedRecord;
  }

  async function deleteRecord(recordId: string) {
    await apiJson<{ ok: boolean }>(`/api/records/${recordId}`, {
      method: "DELETE",
    });
    setRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== recordId),
    );
    setPlayingRecordId((currentId) => (currentId === recordId ? null : currentId));
  }

  function openWarehouse() {
    setDrawerOpen(false);
    setScreen("warehouse");
  }

  function openSettings() {
    setDrawerOpen(false);
    setScreen("settings");
  }

  function focusRecordDate(record: VoiceRecord) {
    const recordDate = new Date(record.createdAt);
    if (recordDate.getFullYear() !== 2026) {
      return;
    }

    setSelectedMonth(recordDate.getMonth());
    setSelectedDate(getDateKey(record.createdAt));
  }

  function putRecordAtTop(record: VoiceRecord) {
    setRecords((currentRecords) => [
      record,
      ...currentRecords.filter((currentRecord) => currentRecord.id !== record.id),
    ]);
  }

  function chooseBreathQuestion(keepCategory: boolean) {
    if (breathQuestions.length === 0) {
      setSelectedBreathQuestion(null);
      return;
    }

    const recordedQuestionKeys = new Set(
      records
        .filter((record) => record.type === "breath" && record.category)
        .flatMap(getRecordMatchKeys),
    );
    const categoryCompletion = new Map<
      string,
      {
        completed: number;
        total: number;
      }
    >();

    breathQuestions.forEach((question) => {
      const currentProgress = categoryCompletion.get(question.category) ?? {
        completed: 0,
        total: 0,
      };
      currentProgress.total += 1;
      if (getQuestionMatchKeys(question).some((key) => recordedQuestionKeys.has(key))) {
        currentProgress.completed += 1;
      }
      categoryCompletion.set(question.category, currentProgress);
    });

    let category = selectedBreathQuestion?.category;

    if (!keepCategory || !category) {
      const openCategories = Array.from(categoryCompletion.entries())
        .filter(([, progress]) => progress.completed < progress.total)
        .map(([questionCategory]) => questionCategory);
      category = getRandomItem(
        openCategories.length > 0
          ? openCategories
          : Array.from(new Set(breathQuestions.map((question) => question.category))),
      );
    }

    const availableQuestions = breathQuestions.filter(
      (question) =>
        question.category === category &&
        !getQuestionMatchKeys(question).some((key) => recordedQuestionKeys.has(key)) &&
        (!keepCategory ||
          !selectedBreathQuestion ||
          question.typeId !== selectedBreathQuestion.typeId),
    );
    const fallbackQuestions = breathQuestions.filter(
      (question) =>
        question.category === category &&
        (!keepCategory ||
          !selectedBreathQuestion ||
          question.typeId !== selectedBreathQuestion.typeId),
    );
    const selectableQuestions =
      availableQuestions.length > 0 ? availableQuestions : fallbackQuestions;

    if (selectableQuestions.length === 0) {
      setSelectedBreathQuestion(null);
      return;
    }

    setSelectedBreathQuestion(getRandomItem(selectableQuestions));
    setQuestionChanged(keepCategory);
  }

  const appClassName = [
    styles.app,
    fontSize === "large" ? styles.largeText : "",
    fontSize === "xlarge" ? styles.xlargeText : "",
  ]
    .filter(Boolean)
    .join(" ");
  const showAppChrome =
    screen !== "auth" && screen !== "register" && screen !== "welcome";

  if (screen === "splash") {
    return <SplashScreen />;
  }

  return (
    <main className={appClassName}>
      {showAppChrome && (
        <TopBar
          title={getScreenTitle(screen)}
          onMenu={() => setDrawerOpen(true)}
          onHome={() => setScreen("dailyIntro")}
        />
      )}

      {screen === "auth" && (
        <AuthScreen
          onSignup={() => {
            setRegisterMode("signup");
            setScreen("register");
          }}
          onLogin={() => {
            setRegisterMode("login");
            setScreen("register");
          }}
        />
      )}

      {screen === "register" && (
        <RegisterScreen
          mode={registerMode}
          nameInput={nameInput}
          setNameInput={setNameInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          authError={authError}
          authBusy={authBusy}
          onSubmit={handleNameSubmit}
          onBack={() => setScreen("auth")}
        />
      )}

      {screen === "welcome" && <WelcomeScreen userName={userName} />}

      {screen === "dailyIntro" && (
        <DailyIntroScreen
          onDailyRecord={() => setScreen("dailyRecord")}
          onBreathRecord={() => setScreen("breathIntro")}
        />
      )}

      {screen === "dailyRecord" && (
        <RecordingScreen
          title="일상 기록"
          eyebrow="일상 기록"
          question={DAILY_QUESTION}
          recordType="daily"
          onSave={saveRecord}
          onComplete={() => setScreen("breathIntro")}
          onBack={() => setScreen("dailyIntro")}
        />
      )}

      {screen === "breathIntro" && selectedBreathQuestion && (
        <BreathIntroScreen
          question={selectedBreathQuestion}
          questionChanged={questionChanged}
          onChangeQuestion={() => chooseBreathQuestion(true)}
          onRest={() => setScreen("dailyIntro")}
          onReady={() => setScreen("breathRecord")}
        />
      )}

      {screen === "breathRecord" && selectedBreathQuestion && (
        <RecordingScreen
          title="숨결 기록"
          eyebrow={selectedBreathQuestion.category}
          question={selectedBreathQuestion.question}
          questionId={selectedBreathQuestion.id}
          questionTypeIndex={selectedBreathQuestion.typeIndex}
          questionIndex={selectedBreathQuestion.questionIndex}
          questionType={selectedBreathQuestion.typeId}
          questionTypeTitle={selectedBreathQuestion.typeTitle}
          category={selectedBreathQuestion.category}
          recordType="breath"
          onSave={saveRecord}
          onComplete={() => {
            chooseBreathQuestion(false);
            setScreen("breathIntro");
          }}
          onBack={() => setScreen("breathIntro")}
        />
      )}

      {screen === "warehouse" && (
        <WarehouseScreen
          records={sortedRecords}
          categoryProgress={categoryProgress}
          overallBreathProgress={overallBreathProgress}
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          playingRecordId={playingRecordId}
          onMonthChange={setSelectedMonth}
          onDateSelect={setSelectedDate}
          onPlayToggle={setPlayingRecordId}
          onDelete={deleteRecord}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          onLogout={handleLogout}
        />
      )}

      {showAppChrome && (
        <>
          <NavigationBar
            currentScreen={screen}
            onDaily={() => setScreen("dailyIntro")}
            onBreath={() => setScreen("breathIntro")}
            onWarehouse={openWarehouse}
            onSettings={openSettings}
          />

          {drawerOpen && (
            <Drawer
              open={drawerOpen}
              userName={userName}
              dailyCount={dailyCount}
              breathCount={breathCount}
              breathGoal={breathGoal}
              records={sortedRecords}
              playingRecordId={playingRecordId}
              onClose={() => setDrawerOpen(false)}
              onWarehouse={openWarehouse}
              onSettings={openSettings}
              onPlayToggle={setPlayingRecordId}
              onDelete={deleteRecord}
            />
          )}
        </>
      )}
    </main>
  );
}

function SplashScreen() {
  return (
    <main className={styles.splash}>
      <div className={styles.splashMark} aria-hidden="true">
        <Mic size={32} />
      </div>
      <h1>숨결의 기록</h1>
      <p>삶과 목소리를 천천히 남기는 시간</p>
    </main>
  );
}

function AuthScreen({
  onSignup,
  onLogin,
}: {
  onSignup: () => void;
  onLogin: () => void;
}) {
  return (
    <section className={`${styles.screen} ${styles.centerScreen}`}>
      <div className={styles.brandBlock}>
        <span className={styles.brandIcon}>
          <Mic size={28} />
        </span>
        <p>숨결의 기록</p>
      </div>
      <div className={styles.copyStack}>
        <h1>로그인이 되어있지 않아요</h1>
        <p>이름만 남기고 오늘의 목소리를 천천히 시작해 보세요.</p>
      </div>
      <div className={styles.actionStack}>
        <button className={styles.primaryButton} onClick={onSignup}>
          <UserRound size={19} />
          간단 회원가입 이후 시작하기
        </button>
        <button className={styles.secondaryButton} onClick={onLogin}>
          <LogIn size={19} />
          아이디가 있다면 로그인 하기
        </button>
      </div>
    </section>
  );
}

function RegisterScreen({
  mode,
  nameInput,
  setNameInput,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  authError,
  authBusy,
  onSubmit,
  onBack,
}: {
  mode: "signup" | "login";
  nameInput: string;
  setNameInput: (value: string) => void;
  emailInput: string;
  setEmailInput: (value: string) => void;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  authError: string;
  authBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  const isSignup = mode === "signup";

  return (
    <section className={styles.screen}>
      <form className={styles.formScreen} onSubmit={onSubmit}>
        <div className={styles.copyStack}>
          <h1>{isSignup ? "이름을 알려주세요" : "다시 만나 반가워요"}</h1>
          <p>
            {isSignup
              ? "다음부터는 이 이름으로 반갑게 맞이할게요."
              : "가입한 이메일과 비밀번호로 이어서 기록해요."}
          </p>
        </div>

        {isSignup && (
          <>
            <label className={styles.inputLabel} htmlFor="user-name">
              사용자 이름
            </label>
            <input
              id="user-name"
              className={styles.nameInput}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="홍길동"
              autoComplete="name"
              autoFocus
            />
          </>
        )}

        <label className={styles.inputLabel} htmlFor="user-email">
          이메일 아이디
        </label>
        <input
          id="user-email"
          className={styles.nameInput}
          value={emailInput}
          onChange={(event) => setEmailInput(event.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          inputMode="email"
          autoFocus={!isSignup}
        />

        <label className={styles.inputLabel} htmlFor="user-password">
          비밀번호
        </label>
        <input
          id="user-password"
          className={styles.nameInput}
          value={passwordInput}
          onChange={(event) => setPasswordInput(event.target.value)}
          placeholder="8자 이상 입력"
          autoComplete={isSignup ? "new-password" : "current-password"}
          type="password"
        />

        {authError && <p className={styles.errorText}>{authError}</p>}

        <button className={styles.primaryButton} type="submit" disabled={authBusy}>
          <Check size={19} />
          {authBusy
            ? "처리 중"
            : isSignup
              ? "회원가입하고 시작하기"
              : "로그인하기"}
        </button>
        <button className={styles.textButton} type="button" onClick={onBack}>
          이전으로
        </button>
      </form>
    </section>
  );
}

function WelcomeScreen({ userName }: { userName: string }) {
  return (
    <section className={`${styles.screen} ${styles.centerScreen}`}>
      <div className={styles.welcomeCircle}>
        <Mic size={36} />
      </div>
      <div className={styles.copyStack}>
        <h1>{userName}님, 환영합니다.</h1>
        <p>
          목소리는 오늘을 기억하는 가장 따뜻한 방법입니다.
          <br />
          오늘도 서두르지 않고
          <br />
          천천히 시작해 볼까요?
        </p>
      </div>
    </section>
  );
}

function DailyIntroScreen({
  onDailyRecord,
  onBreathRecord,
}: {
  onDailyRecord: () => void;
  onBreathRecord: () => void;
}) {
  return (
    <section className={styles.screen}>
      <ScreenLabel title="일상 기록" tone="blue" />
      <div className={styles.questionPanel}>
        <span className={styles.kicker}>일상 질문</span>
        <h1>오늘 하루에 대해서 말씀해 주시겠어요?</h1>
        <p>있었던 일이나, 현재 기분 등 어떤 것이든 편하게 들려주세요.</p>
      </div>
      <div className={styles.actionStack}>
        <button className={styles.primaryButton} onClick={onDailyRecord}>
          <Mic size={19} />
          네, 일상 기록을 남길래요
        </button>
        <button className={styles.secondaryButton} onClick={onBreathRecord}>
          <ChevronRight size={19} />
          아니요. 숨결기록으로 넘어갈게요
        </button>
      </div>
    </section>
  );
}

function BreathIntroScreen({
  question,
  questionChanged,
  onChangeQuestion,
  onRest,
  onReady,
}: {
  question: BreathQuestion;
  questionChanged: boolean;
  onChangeQuestion: () => void;
  onRest: () => void;
  onReady: () => void;
}) {
  return (
    <section className={styles.screen}>
      <ScreenLabel title="숨결 기록" tone="sage" />
      <div className={styles.questionPanel}>
        <div className={styles.questionMeta}>
          <span>유형 {question.typeIndex}</span>
          <span>질문 {question.questionIndex}</span>
          <span>{question.category}</span>
          <span>{question.typeTitle}</span>
        </div>
        <h1>{question.question}</h1>
      </div>
      <div className={styles.actionStack}>
        <button className={styles.primaryButton} onClick={onReady}>
          <Mic size={19} />이 질문으로 녹음 준비
        </button>
        {!questionChanged ? (
          <button className={styles.secondaryButton} onClick={onChangeQuestion}>
            <RotateCcw size={19} />이 질문은 건너뛸게요
          </button>
        ) : (
          <button className={styles.secondaryButton} onClick={onRest}>
            <PauseCircle size={19} />
            오늘은 쉬어갈게요
          </button>
        )}
      </div>
    </section>
  );
}

function RecordingScreen({
  title,
  eyebrow,
  question,
  recordType,
  questionId,
  questionTypeIndex,
  questionIndex,
  category,
  questionType,
  questionTypeTitle,
  onSave,
  onComplete,
  onBack,
}: {
  title: string;
  eyebrow: string;
  question: string;
  recordType: RecordType;
  questionId?: string;
  questionTypeIndex?: number;
  questionIndex?: number;
  category?: string;
  questionType?: string;
  questionTypeTitle?: string;
  onSave: (record: PendingVoiceRecord) => Promise<VoiceRecord>;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<string>("");
  const durationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    setErrorMessage("");
    setSavedRecordId(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("이 브라우저에서는 녹음을 사용할 수 없어요.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = new Date().toISOString();
      durationRef.current = 0;
      setDurationSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setIsSaving(true);
        try {
          const savedRecord = await onSave({
            type: recordType,
            question,
            questionId,
            questionTypeIndex,
            questionIndex,
            category,
            questionType,
            questionTypeTitle,
            createdAt: startedAtRef.current || new Date().toISOString(),
            durationSeconds: Math.max(1, durationRef.current),
            audioBlob: blob,
            mimeType: blob.type || "audio/webm",
          });
          setSavedRecordId(savedRecord.id);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "기록을 저장하지 못했어요. 다시 시도해 주세요.",
          );
        } finally {
          setIsSaving(false);
        }
        setIsRecording(false);
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setDurationSeconds((currentSeconds) => {
          const nextSeconds = currentSeconds + 1;
          durationRef.current = nextSeconds;
          return nextSeconds;
        });
      }, 1000);
    } catch {
      setErrorMessage("마이크 권한을 확인한 뒤 다시 시도해 주세요.");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  return (
    <section className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        <ArrowLeft size={18} />
        이전
      </button>
      <ScreenLabel title={title} tone={recordType === "daily" ? "blue" : "sage"} />
      <div className={styles.questionPanel}>
        <div className={styles.questionMeta}>
          <span>{eyebrow}</span>
          {questionTypeTitle && <span>{questionTypeTitle}</span>}
        </div>
        <h1>{question}</h1>
      </div>

      <div className={styles.recorderPanel}>
        <button
          className={`${styles.recordButton} ${isRecording ? styles.recording : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          aria-label={isRecording ? "녹음 중지" : "녹음 시작"}
        >
          {isRecording ? <PauseCircle size={42} /> : <Mic size={42} />}
        </button>
        <div className={styles.timerLine}>
          <span className={isRecording ? styles.liveDot : styles.readyDot} />
          <strong>
            {isRecording
              ? "녹음 중"
              : isSaving
                ? "저장 중"
                : savedRecordId
                  ? "저장 완료"
                  : "녹음 준비"}
          </strong>
          <span>{formatDuration(durationSeconds)}</span>
        </div>
      </div>

      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

      {savedRecordId && (
        <div className={styles.actionStack}>
          <button className={styles.primaryButton} onClick={onComplete}>
            <Check size={19} />
            기록 저장 완료
          </button>
        </div>
      )}
    </section>
  );
}

function WarehouseScreen({
  records,
  categoryProgress,
  overallBreathProgress,
  selectedDate,
  selectedMonth,
  playingRecordId,
  onMonthChange,
  onDateSelect,
  onPlayToggle,
  onDelete,
}: {
  records: VoiceRecord[];
  categoryProgress: CategoryProgress[];
  overallBreathProgress: OverallBreathProgress;
  selectedDate: string;
  selectedMonth: number;
  playingRecordId: string | null;
  onMonthChange: (month: number) => void;
  onDateSelect: (date: string) => void;
  onPlayToggle: (recordId: string | null) => void;
  onDelete: (recordId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"calendar" | "recent">("calendar");
  const recordsByDate = useMemo(() => {
    return records.reduce<Record<string, VoiceRecord[]>>((acc, record) => {
      const key = getDateKey(record.createdAt);
      acc[key] = [...(acc[key] ?? []), record];
      return acc;
    }, {});
  }, [records]);
  const selectedRecords = recordsByDate[selectedDate] ?? [];

  return (
    <section className={styles.screen}>
      <div className={styles.sectionHeader}>
        <ScreenLabel title="숨결창고" tone="sage" />
        <div className={styles.segmented} role="tablist" aria-label="숨결창고 보기">
          <button
            className={viewMode === "calendar" ? styles.activeSegment : ""}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays size={16} />
            달력
          </button>
          <button
            className={viewMode === "recent" ? styles.activeSegment : ""}
            onClick={() => setViewMode("recent")}
          >
            <Clock3 size={16} />
            최근
          </button>
        </div>
      </div>

      <OverallProgressPanel progress={overallBreathProgress} />
      <CategoryProgressPanel progressItems={categoryProgress} />

      {viewMode === "calendar" ? (
        <>
          <Calendar2026
            month={selectedMonth}
            selectedDate={selectedDate}
            recordsByDate={recordsByDate}
            onMonthChange={onMonthChange}
            onDateSelect={onDateSelect}
          />
          <RecordList
            title="선택한 날짜의 기록"
            records={selectedRecords}
            emptyText="이 날짜에는 아직 남긴 목소리가 없어요."
            playingRecordId={playingRecordId}
            onPlayToggle={onPlayToggle}
            onDelete={onDelete}
          />
        </>
      ) : (
        <RecordList
          title="최근 기록"
          records={records}
          emptyText="아직 저장된 기록이 없어요."
          playingRecordId={playingRecordId}
          onPlayToggle={onPlayToggle}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}

function OverallProgressPanel({
  progress,
}: {
  progress: OverallBreathProgress;
}) {
  const progressStyle = {
    "--overall-progress": progress.gradient,
  } as CSSProperties;

  return (
    <section className={styles.overallProgressPanel} aria-label="전체 숨결 성취도">
      <div
        className={styles.overallProgressRing}
        style={progressStyle}
        aria-label={`전체 숨결 기록 ${progress.completed}/${progress.goal} 완료`}
      >
        <span>{progress.percent}%</span>
      </div>
      <div className={styles.overallProgressCopy}>
        <span className={styles.kicker}>통합 성취도</span>
        <h2>
          {progress.completed}/{progress.goal}개의 답변
        </h2>
        <div className={styles.segmentLegend}>
          {progress.segments.length === 0 ? (
            <span>아직 완료한 숨결 기록이 없어요.</span>
          ) : (
            progress.segments.map((segment) => (
              <span key={segment.category}>
                <i style={{ background: segment.color }} />
                {segment.category} {segment.count}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryProgressPanel({
  progressItems,
}: {
  progressItems: CategoryProgress[];
}) {
  return (
    <section className={styles.progressPanel} aria-label="카테고리별 숨결 완성률">
      <div className={styles.progressHeader}>
        <div>
          <span className={styles.kicker}>카테고리 완성률</span>
          <h2>숨결 기록 진행</h2>
        </div>
        <strong>
          {progressItems.reduce((total, item) => total + item.completed, 0)}/
          {progressItems.reduce((total, item) => total + item.total, 0)}
        </strong>
      </div>
      <div className={styles.progressGrid}>
        {progressItems.map((item) => {
          const progressStyle = {
            "--progress": `${item.percent}%`,
            "--category-color": item.color,
          } as CSSProperties;

          return (
            <article className={styles.progressCard} key={item.category}>
              <div
                className={styles.progressRing}
                style={progressStyle}
                aria-label={`${item.category} ${item.completed}/${item.total} 완료`}
              >
                <span>{item.percent}%</span>
              </div>
              <div>
                <strong>{item.category}</strong>
                <span>
                  {item.completed}/{item.total} 완료
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Calendar2026({
  month,
  selectedDate,
  recordsByDate,
  onMonthChange,
  onDateSelect,
}: {
  month: number;
  selectedDate: string;
  recordsByDate: Record<string, VoiceRecord[]>;
  onMonthChange: (month: number) => void;
  onDateSelect: (date: string) => void;
}) {
  const firstDay = new Date(2026, month, 1).getDay();
  const daysInMonth = new Date(2026, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthTitle = `${month + 1}월`;

  return (
    <div className={styles.calendarPanel}>
      <div className={styles.calendarTop}>
        <button
          className={styles.iconButton}
          onClick={() => onMonthChange(Math.max(0, month - 1))}
          aria-label="이전 달"
        >
          <ChevronLeft size={18} />
        </button>
        <strong>2026년 {monthTitle}</strong>
        <button
          className={styles.iconButton}
          onClick={() => onMonthChange(Math.min(11, month + 1))}
          aria-label="다음 달"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className={styles.weekGrid}>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className={styles.dayGrid}>
        {cells.map((day, index) => {
          if (!day) {
            return <span key={`empty-${index}`} />;
          }
          const key = `2026-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasRecord = Boolean(recordsByDate[key]?.length);
          const selected = selectedDate === key;
          return (
            <button
              key={key}
              className={`${styles.dayButton} ${selected ? styles.selectedDay : ""}`}
              onClick={() => onDateSelect(key)}
            >
              <span>{day}</span>
              {hasRecord && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingsScreen({
  fontSize,
  onFontSizeChange,
  onLogout,
}: {
  fontSize: FontSize;
  onFontSizeChange: (fontSize: FontSize) => void;
  onLogout: () => void;
}) {
  return (
    <section className={styles.screen}>
      <ScreenLabel title="설정" tone="blue" />
      <div className={styles.settingsGroup}>
        <span className={styles.kicker}>읽기와 사용</span>
        <h1>글자 크기</h1>
        <div className={styles.sizeOptions}>
          {[
            ["normal", "보통"],
            ["large", "크게"],
            ["xlarge", "아주 크게"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={fontSize === value ? styles.selectedSize : ""}
              onClick={() => onFontSizeChange(value as FontSize)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.secondaryButton} onClick={onLogout}>
        <LogIn size={19} />
        로그아웃
      </button>
    </section>
  );
}

function TopBar({
  title,
  onMenu,
  onHome,
}: {
  title: string;
  onMenu: () => void;
  onHome: () => void;
}) {
  return (
    <header className={styles.topBar}>
      <button className={styles.iconButton} onClick={onMenu} aria-label="메뉴 열기">
        <Menu size={22} />
      </button>
      <strong>{title}</strong>
      <button className={styles.iconButton} onClick={onHome} aria-label="홈으로">
        <Home size={20} />
      </button>
    </header>
  );
}

function NavigationBar({
  currentScreen,
  onDaily,
  onBreath,
  onWarehouse,
  onSettings,
}: {
  currentScreen: Screen;
  onDaily: () => void;
  onBreath: () => void;
  onWarehouse: () => void;
  onSettings: () => void;
}) {
  if (
    currentScreen === "auth" ||
    currentScreen === "register" ||
    currentScreen === "welcome" ||
    currentScreen === "splash"
  ) {
    return null;
  }

  return (
    <nav className={styles.bottomNav} aria-label="하단 이동">
      <button
        className={currentScreen === "dailyIntro" ? styles.activeNav : ""}
        onClick={onDaily}
      >
        <Mic size={19} />
        일상
      </button>
      <button
        className={
          currentScreen === "breathIntro" || currentScreen === "breathRecord"
            ? styles.activeNav
            : ""
        }
        onClick={onBreath}
      >
        <Play size={19} />
        숨결
      </button>
      <button
        className={currentScreen === "warehouse" ? styles.activeNav : ""}
        onClick={onWarehouse}
      >
        <Warehouse size={19} />
        창고
      </button>
      <button
        className={currentScreen === "settings" ? styles.activeNav : ""}
        onClick={onSettings}
      >
        <Settings size={19} />
        설정
      </button>
    </nav>
  );
}

function Drawer({
  open,
  userName,
  dailyCount,
  breathCount,
  breathGoal,
  records,
  playingRecordId,
  onClose,
  onWarehouse,
  onSettings,
  onPlayToggle,
  onDelete,
}: {
  open: boolean;
  userName: string;
  dailyCount: number;
  breathCount: number;
  breathGoal: number;
  records: VoiceRecord[];
  playingRecordId: string | null;
  onClose: () => void;
  onWarehouse: () => void;
  onSettings: () => void;
  onPlayToggle: (recordId: string | null) => void;
  onDelete: (recordId: string) => void;
}) {
  const recentRecords = records.slice(0, 5);

  return (
    <div className={`${styles.drawerLayer} ${open ? styles.openDrawer : ""}`}>
      <button
        className={styles.drawerScrim}
        onClick={onClose}
        aria-label="메뉴 닫기"
      />
      <aside className={styles.drawerPanel} aria-hidden={!open}>
        <div className={styles.drawerHeader}>
          <div>
            <strong>{userName || "사용자"}님</strong>
            <span>플래티넘 회원</span>
          </div>
          <button className={styles.iconButton} onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <button className={styles.storageSummary} onClick={onWarehouse}>
          <span>숨결창고</span>
          <strong>일상 기록 횟수 {dailyCount}회</strong>
          <strong>숨결 기록 횟수 {breathCount}/{breathGoal}회</strong>
        </button>
        <div className={styles.drawerActions}>
          <button onClick={onWarehouse}>
            <Warehouse size={17} />
            숨결창고
          </button>
          <button onClick={onSettings}>
            <Settings size={17} />
            설정
          </button>
        </div>
        <div className={styles.drawerLists}>
          <RecordList
            compact
            title="최근 기록"
            titleAction={
              <button className={styles.moreButton} onClick={onWarehouse}>
                더보기
              </button>
            }
            records={recentRecords}
            emptyText="아직 저장된 기록이 없어요."
            playingRecordId={playingRecordId}
            onPlayToggle={onPlayToggle}
            onDelete={onDelete}
          />
        </div>
      </aside>
    </div>
  );
}

function RecordList({
  title,
  titleAction,
  records,
  emptyText,
  compact = false,
  playingRecordId,
  onPlayToggle,
  onDelete,
}: {
  title: string;
  titleAction?: ReactNode;
  records: VoiceRecord[];
  emptyText: string;
  compact?: boolean;
  playingRecordId: string | null;
  onPlayToggle: (recordId: string | null) => void;
  onDelete: (recordId: string) => void;
}) {
  return (
    <div className={compact ? styles.compactList : styles.recordList}>
      <div className={styles.listHeader}>
        <h2>{title}</h2>
        {titleAction}
      </div>
      {records.length === 0 ? (
        <p className={styles.emptyText}>{emptyText}</p>
      ) : (
        records.map((record) => {
          const isPlaying = playingRecordId === record.id;
          return (
            <article className={styles.recordItem} key={record.id}>
              <div className={styles.recordTopline}>
                <span>{record.type === "daily" ? "일상 기록" : "숨결 기록"}</span>
                <span>{formatDuration(record.durationSeconds)}</span>
              </div>
              <strong>{formatRecordDate(record.createdAt)}</strong>
              <p>{record.question}</p>
              {isPlaying && (
                <audio className={styles.audioPlayer} controls src={record.audioUrl} />
              )}
              <div className={styles.recordActions}>
                <button
                  onClick={() => onPlayToggle(isPlaying ? null : record.id)}
                >
                  <Play size={15} />
                  다시 확인하기
                </button>
                <button onClick={() => onDelete(record.id)}>
                  <Trash2 size={15} />
                  삭제
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function ScreenLabel({
  title,
  tone,
}: {
  title: string;
  tone: "blue" | "sage";
}) {
  return (
    <div className={`${styles.screenLabel} ${tone === "sage" ? styles.sage : ""}`}>
      <span>{title}</span>
    </div>
  );
}

function getScreenTitle(screen: Screen) {
  switch (screen) {
    case "dailyIntro":
    case "dailyRecord":
      return "일상 기록";
    case "breathIntro":
    case "breathRecord":
      return "숨결 기록";
    case "warehouse":
      return "숨결창고";
    case "settings":
      return "설정";
    default:
      return "숨결의 기록";
  }
}
