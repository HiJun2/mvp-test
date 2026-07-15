export type DefaultQuestion = {
  id?: string;
  category: string;
  question: string;
  isActive: boolean;
};

export type DefaultQuestionGroup = {
  typeId: string;
  typeTitle: string;
  isActive: boolean;
  questions: DefaultQuestion[];
};

export const DEFAULT_QUESTION_GROUPS: DefaultQuestionGroup[] = [
  {
    typeId: "childhood",
    typeTitle: "첫기억과 유년의 풍경",
    isActive: true,
    questions: [
      { category: "기억", question: "어릴 적 가장 오래된 기억은 무엇인가요? 그때의 냄새, 소리, 공기의 느낌까지 떠올려보세요.", isActive: true },
      { category: "사람", question: "유년 시절, 당신에게 따뜻함을 가르쳐준 사람은 누구였나요? 그 사람에게 어떤 감정을 느꼈나요?", isActive: true },
      { category: "장소", question: "마음속에 가장 선명하게 남아 있는 어린 시절의 공간은 어디인가요?", isActive: true },
      { category: "감정", question: "유년기에 느꼈던 두려움, 기쁨, 혹은 외로움은 언제 찾아왔나요?", isActive: true },
      { category: "사건", question: "어린 시절 잊을 수 없는 사건이 있다면, 그때의 상황을 자세히 떠올려보세요.", isActive: true },
      { category: "의미", question: "그 경험이 지금의 나에게 어떤 의미로 남아 있나요?", isActive: true },
      { category: "배움", question: "어린 시절 실수나 도전에서 배운 삶의 교훈은 무엇인가요?", isActive: true },
      { category: "전환", question: "‘아이’에서 ‘학생’으로 스스로 변했다고 느낀 순간이 있었나요?", isActive: true },
      { category: "가치", question: "유년기부터 지금까지 이어져 온 나만의 습관이나 신념은 무엇인가요?", isActive: true },
      { category: "감사", question: "어린 시절의 가족이나 주변 사람에게 지금 감사하고 싶은 이유는 무엇인가요?", isActive: true },
      { category: "관계", question: "유년기에 만난 한 사람이 지금의 나에게 어떤 영향을 주었나요?", isActive: true },
      { category: "철학", question: "그 시절의 나에게 ‘행복’은 어떤 모습이었나요?", isActive: true },
      { category: "유산", question: "어린 시절의 나로부터 지금까지 이어져 온, 나만의 선물 같은 것은 무엇인가요?", isActive: true },
      { category: "시간", question: "학창시절 가장 즐거웠던 시간은?", isActive: true },
      { category: "사랑", question: "너의 첫사랑에 대해 얘기해줄래?", isActive: true },
    ],
  },
  {
    typeId: "growth",
    typeTitle: "성장기의 고민과 발견",
    isActive: true,
    questions: [
      { category: "기억", question: "10대 시절, 가장 많이 고민했던 일은 무엇이었나요?", isActive: true },
      { category: "사람", question: "그 시절 나를 이끌어준 친구나 선생님은 누구였나요? 어떤 영향을 받았나요?", isActive: true },
      { category: "장소", question: "자주 머물던 학교나 동네의 한 공간이 있다면, 그곳은 어떤 의미였나요?", isActive: true },
      { category: "감정", question: "청소년기에 자주 느꼈던 외로움이나 기쁨은 어떤 빛깔이었나요?", isActive: true },
      { category: "사건", question: "인생의 방향을 바꿔놓은 결정적인 사건이 있었나요?", isActive: true },
      { category: "의미", question: "그 시절의 고민이 지금의 나에게 어떤 의미를 주었나요?", isActive: true },
      { category: "배움", question: "그때의 실패나 도전을 통해 배운 교훈이 있다면 무엇인가요?", isActive: true },
      { category: "전환", question: "어린 시절의 나에서 청년으로 바뀌었다고 느낀 순간은 언제였나요?", isActive: true },
      { category: "가치", question: "10대의 나는 어떤 가치를 중요하게 여겼나요?", isActive: true },
      { category: "감사", question: "그 시절의 나에게 ‘고맙다’고 말하고 싶은 이유는 무엇인가요?", isActive: true },
      { category: "관계", question: "그때의 친구 관계가 지금의 인간관계에 어떤 영향을 주었나요?", isActive: true },
      { category: "철학", question: "그 시절 나는 ‘꿈’과 ‘현실’을 어떻게 이해했나요?", isActive: true },
      { category: "유산", question: "지금까지 남아 있는 10대의 나다운 순수함은 무엇인가요?", isActive: true },
      { category: "시간", question: "10대 때 가장 기억에 남았던 시간은?", isActive: true },
      { category: "사랑", question: "한 사람 때문에 가슴 아파본 적이 있나요?", isActive: true },
    ],
  },
];
