"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type AdminQuestion = {
  id?: string;
  category: string;
  question: string;
  sortOrder?: number;
  isActive: boolean;
};

type AdminQuestionGroup = {
  typeId?: string;
  typeTitle: string;
  sortOrder?: number;
  isActive: boolean;
  questions: AdminQuestion[];
};

const PASSWORD_KEY = "breath.adminPassword";

const DEFAULT_GROUPS: AdminQuestionGroup[] = [
  {
    typeId: "childhood",
    typeTitle: "첫기억과 유년의 풍경",
    isActive: true,
    questions: [
      {
        category: "기억",
        question:
          "어릴 적 가장 오래된 기억은 무엇인가요? 그때의 냄새, 소리, 공기의 느낌까지 떠올려보세요.",
        isActive: true,
      },
      {
        category: "사람",
        question:
          "유년 시절, 당신에게 따뜻함을 가르쳐준 사람은 누구였나요? 그 사람에게 어떤 감정을 느꼈나요?",
        isActive: true,
      },
      {
        category: "장소",
        question:
          "마음속에 가장 선명하게 남아 있는 어린 시절의 공간은 어디인가요?",
        isActive: true,
      },
      {
        category: "감정",
        question:
          "유년기에 느꼈던 두려움, 기쁨, 혹은 외로움은 언제 찾아왔나요?",
        isActive: true,
      },
      {
        category: "사건",
        question:
          "어린 시절 잊을 수 없는 사건이 있다면, 그때의 상황을 자세히 떠올려보세요.",
        isActive: true,
      },
      {
        category: "의미",
        question: "그 경험이 지금의 나에게 어떤 의미로 남아 있나요?",
        isActive: true,
      },
      {
        category: "배움",
        question: "어린 시절 실수나 도전에서 배운 삶의 교훈은 무엇인가요?",
        isActive: true,
      },
      {
        category: "전환",
        question: "‘아이’에서 ‘학생’으로 스스로 변했다고 느낀 순간이 있었나요?",
        isActive: true,
      },
      {
        category: "가치",
        question:
          "유년기부터 지금까지 이어져 온 나만의 습관이나 신념은 무엇인가요?",
        isActive: true,
      },
      {
        category: "감사",
        question:
          "어린 시절의 가족이나 주변 사람에게 지금 감사하고 싶은 이유는 무엇인가요?",
        isActive: true,
      },
      {
        category: "관계",
        question:
          "유년기에 만난 한 사람이 지금의 나에게 어떤 영향을 주었나요?",
        isActive: true,
      },
      {
        category: "철학",
        question: "그 시절의 나에게 ‘행복’은 어떤 모습이었나요?",
        isActive: true,
      },
      {
        category: "유산",
        question:
          "어린 시절의 나로부터 지금까지 이어져 온, 나만의 선물 같은 것은 무엇인가요?",
        isActive: true,
      },
    ],
  },
  {
    typeId: "growth",
    typeTitle: "성장기의 고민과 발견",
    isActive: true,
    questions: [
      {
        category: "기억",
        question: "10대 시절, 가장 많이 고민했던 일은 무엇이었나요?",
        isActive: true,
      },
      {
        category: "사람",
        question:
          "그 시절 나를 이끌어준 친구나 선생님은 누구였나요? 어떤 영향을 받았나요?",
        isActive: true,
      },
      {
        category: "장소",
        question:
          "자주 머물던 학교나 동네의 한 공간이 있다면, 그곳은 어떤 의미였나요?",
        isActive: true,
      },
      {
        category: "감정",
        question:
          "청소년기에 자주 느꼈던 외로움이나 기쁨은 어떤 빛깔이었나요?",
        isActive: true,
      },
      {
        category: "사건",
        question: "인생의 방향을 바꿔놓은 결정적인 사건이 있었나요?",
        isActive: true,
      },
      {
        category: "의미",
        question: "그 시절의 고민이 지금의 나에게 어떤 의미를 주었나요?",
        isActive: true,
      },
      {
        category: "배움",
        question:
          "그때의 실패나 도전을 통해 배운 교훈이 있다면 무엇인가요?",
        isActive: true,
      },
      {
        category: "전환",
        question:
          "어린 시절의 나에서 청년으로 바뀌었다고 느낀 순간은 언제였나요?",
        isActive: true,
      },
      {
        category: "가치",
        question: "10대의 나는 어떤 가치를 중요하게 여겼나요?",
        isActive: true,
      },
      {
        category: "감사",
        question: "그 시절의 나에게 “고맙다”고 말하고 싶은 이유는 무엇인가요?",
        isActive: true,
      },
      {
        category: "관계",
        question:
          "그때의 친구 관계가 지금의 인간관계에 어떤 영향을 주었나요?",
        isActive: true,
      },
      {
        category: "철학",
        question: "그 시절 나는 ‘꿈’과 ‘현실’을 어떻게 이해했나요?",
        isActive: true,
      },
      {
        category: "유산",
        question: "지금까지 남아 있는 10대의 나다운 순수함은 무엇인가요?",
        isActive: true,
      },
    ],
  },
];

export default function AdminQuestionsPage() {
  const [password, setPassword] = useState("");
  const [groups, setGroups] = useState<AdminQuestionGroup[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const activeQuestionCount = useMemo(
    () =>
      groups.reduce(
        (total, group) =>
          total + group.questions.filter((question) => question.isActive).length,
        0,
      ),
    [groups],
  );

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem(PASSWORD_KEY);
    if (storedPassword) {
      setPassword(storedPassword);
    }
  }, []);

  async function adminRequest<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-admin-password": password,
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

  async function loadQuestions(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!password) {
      setStatus("관리자 비밀번호를 입력해 주세요.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      window.sessionStorage.setItem(PASSWORD_KEY, password);
      const data = await adminRequest<{ groups: AdminQuestionGroup[] }>(
        "/api/admin/questions",
      );
      setGroups(data.groups);
      setStatus(
        data.groups.length > 0
          ? "DB 질문지를 불러왔어요."
          : "아직 저장된 질문지가 없어요. 기본 질문을 불러와 저장해 주세요.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "질문지를 불러오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestions() {
    if (!password) {
      setStatus("관리자 비밀번호를 입력해 주세요.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      window.sessionStorage.setItem(PASSWORD_KEY, password);
      await adminRequest<{ ok: boolean }>("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          groups: groups.map((group, groupIndex) => ({
            ...group,
            sortOrder: groupIndex,
            questions: group.questions.map((question, questionIndex) => ({
              ...question,
              sortOrder: questionIndex,
            })),
          })),
        }),
      });
      setStatus("질문지를 저장했어요. 앱에서는 새 질문지가 바로 사용됩니다.");
      await loadQuestions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "질문지를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function loadDefaults() {
    setGroups(cloneGroups(DEFAULT_GROUPS));
    setStatus("기본 질문 26개를 화면에 불러왔어요. 저장을 눌러 DB에 반영해 주세요.");
  }

  function addGroup() {
    setGroups((currentGroups) => [
      ...currentGroups,
      {
        typeTitle: "새 질문유형",
        isActive: true,
        questions: [
          {
            category: "기억",
            question: "새 질문을 입력해 주세요.",
            isActive: true,
          },
        ],
      },
    ]);
  }

  function updateGroup(groupIndex: number, patch: Partial<AdminQuestionGroup>) {
    setGroups((currentGroups) =>
      currentGroups.map((group, index) =>
        index === groupIndex ? { ...group, ...patch } : group,
      ),
    );
  }

  function addQuestion(groupIndex: number) {
    setGroups((currentGroups) =>
      currentGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              questions: [
                ...group.questions,
                {
                  category: "기억",
                  question: "",
                  isActive: true,
                },
              ],
            }
          : group,
      ),
    );
  }

  function updateQuestion(
    groupIndex: number,
    questionIndex: number,
    patch: Partial<AdminQuestion>,
  ) {
    setGroups((currentGroups) =>
      currentGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              questions: group.questions.map((question, innerIndex) =>
                innerIndex === questionIndex ? { ...question, ...patch } : question,
              ),
            }
          : group,
      ),
    );
  }

  return (
    <main className={styles.adminPage}>
      <header className={styles.header}>
        <a href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          앱으로
        </a>
        <div>
          <span>숨결의 기록 관리자</span>
          <h1>질문지 관리</h1>
        </div>
        <p>
          질문유형, 카테고리, 질문 문구를 수정하고 저장하면 숨결 기록 화면에서 DB
          질문지가 사용됩니다.
        </p>
      </header>

      <form className={styles.authRow} onSubmit={loadQuestions}>
        <label>
          관리자 비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="ADMIN_PASSWORD"
          />
        </label>
        <button type="submit" disabled={busy}>
          <RefreshCw size={17} />
          불러오기
        </button>
      </form>

      <section className={styles.toolbar}>
        <div>
          <strong>{groups.length}개 질문유형</strong>
          <span>활성 질문 {activeQuestionCount}개</span>
        </div>
        <button type="button" onClick={loadDefaults} disabled={busy}>
          <RefreshCw size={17} />
          기본 질문 불러오기
        </button>
        <button type="button" onClick={addGroup} disabled={busy}>
          <Plus size={17} />
          질문유형 추가
        </button>
        <button
          type="button"
          className={styles.saveButton}
          onClick={saveQuestions}
          disabled={busy || groups.length === 0}
        >
          <Save size={17} />
          저장
        </button>
      </section>

      {status && <p className={styles.status}>{status}</p>}

      <section className={styles.groupList}>
        {groups.length === 0 ? (
          <p className={styles.empty}>
            질문지를 불러오거나 기본 질문을 불러온 뒤 수정해 주세요.
          </p>
        ) : (
          groups.map((group, groupIndex) => (
            <article className={styles.groupPanel} key={group.typeId ?? groupIndex}>
              <div className={styles.groupHeader}>
                <label>
                  질문유형
                  <input
                    value={group.typeTitle}
                    onChange={(event) =>
                      updateGroup(groupIndex, { typeTitle: event.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className={group.isActive ? styles.activeToggle : styles.inactiveToggle}
                  onClick={() =>
                    updateGroup(groupIndex, { isActive: !group.isActive })
                  }
                >
                  {group.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  {group.isActive ? "사용 중" : "숨김"}
                </button>
              </div>

              <div className={styles.questionList}>
                {group.questions.map((question, questionIndex) => (
                  <div
                    className={styles.questionRow}
                    key={question.id ?? `${groupIndex}-${questionIndex}`}
                  >
                    <label>
                      카테고리
                      <input
                        value={question.category}
                        onChange={(event) =>
                          updateQuestion(groupIndex, questionIndex, {
                            category: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      질문
                      <textarea
                        value={question.question}
                        onChange={(event) =>
                          updateQuestion(groupIndex, questionIndex, {
                            question: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={
                        question.isActive ? styles.activeToggle : styles.inactiveToggle
                      }
                      onClick={() =>
                        updateQuestion(groupIndex, questionIndex, {
                          isActive: !question.isActive,
                        })
                      }
                    >
                      {question.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      {question.isActive ? "사용" : "숨김"}
                    </button>
                    {!question.id && (
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() =>
                          updateGroup(groupIndex, {
                            questions: group.questions.filter(
                              (_item, index) => index !== questionIndex,
                            ),
                          })
                        }
                      >
                        <Trash2 size={16} />
                        제거
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={styles.addQuestionButton}
                onClick={() => addQuestion(groupIndex)}
              >
                <Plus size={17} />
                질문 추가
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function cloneGroups(groups: AdminQuestionGroup[]) {
  return groups.map((group) => ({
    ...group,
    questions: group.questions.map((question) => ({ ...question })),
  }));
}
