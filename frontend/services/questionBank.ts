// Long-answer descriptive question bank — 5 questions for the ExamShield
// hackathon demo. Each question is open-ended so students write multi-paragraph
// essay responses. This deliberately generates substantial typing activity so
// the behavioral monitoring pipeline (keystroke rhythm, paste detection, idle
// time, tab switching) has meaningful signals to analyse during the demo.

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type QuestionType =
  | 'conceptual' | 'code-output' | 'debugging' | 'algorithm'
  | 'db-query' | 'numerical' | 'scenario' | 'long-answer'

export interface ExamQuestion {
  id: string
  category: string
  difficulty: QuestionDifficulty
  type: QuestionType
  question: string
  /** Placeholder text shown inside the answer textarea. */
  placeholder: string
  /** Not used for long-answer questions — preserved for interface compatibility. */
  acceptableAnswers?: string[]
}

export const EXAM_NAME = 'Computer Science & Data Science Assessment'
export const EXAM_DURATION_MINUTES = 30
export const QUESTIONS_TOTAL = 5

export const QUESTION_BANK: ExamQuestion[] = [
  {
    id: 'q-1',
    category: 'Data Science',
    difficulty: 'hard',
    type: 'long-answer',
    question:
      'Design an end-to-end machine-learning solution for predicting student performance. ' +
      'Explain data collection, preprocessing, feature engineering, model selection, ' +
      'evaluation metrics, and how you would prevent overfitting.',
    placeholder:
      'Describe your approach to data collection and labeling, preprocessing steps ' +
      '(handling missing values, encoding, scaling), relevant features, your choice of model ' +
      'and why, the metrics you would use to evaluate it, and specific techniques to reduce overfitting…',
  },
  {
    id: 'q-2',
    category: 'Machine Learning',
    difficulty: 'hard',
    type: 'long-answer',
    question:
      'A binary classification model achieves 95% accuracy, but only 60% recall for the ' +
      'positive class. Explain why accuracy may be misleading, which metrics you would ' +
      'investigate, and how you would improve the model.',
    placeholder:
      'Explain the role of class imbalance, which alternative metrics (precision, recall, F1, ' +
      'AUC-ROC, etc.) you would prioritise and why, and concrete steps to improve recall — ' +
      'such as resampling, threshold adjustment, or algorithm changes…',
  },
  {
    id: 'q-3',
    category: 'DBMS',
    difficulty: 'hard',
    type: 'long-answer',
    question:
      'Design a database for an online examination platform. Explain the entities, ' +
      'relationships, primary/foreign keys, normalization strategy, and how you would ' +
      'maintain data integrity when thousands of students take exams simultaneously.',
    placeholder:
      'List the core entities (students, exams, questions, answers, sessions, etc.), ' +
      'describe their relationships and keys, the normal form you would target and why, ' +
      'and how transactions, locking, and constraints would ensure consistency under load…',
  },
  {
    id: 'q-4',
    category: 'Algorithms',
    difficulty: 'hard',
    type: 'long-answer',
    question:
      'Explain how you would design an algorithm to detect duplicate or highly similar ' +
      'answers submitted by students. Discuss the algorithmic approach, time complexity, ' +
      'and how you would handle large numbers of submissions.',
    placeholder:
      'Describe the similarity measure you would use (edit distance, cosine similarity, ' +
      'hashing, shingling, etc.), how you would structure the comparison to avoid O(n²) cost, ' +
      'any preprocessing needed, and how you would handle the scale of thousands of submissions…',
  },
  {
    id: 'q-5',
    category: 'AI & Ethics',
    difficulty: 'hard',
    type: 'long-answer',
    question:
      'An AI-based examination monitoring system detects that a student may be cheating ' +
      'based on unusual typing and browsing behavior. Explain how the system should make its ' +
      'decision, what evidence should be considered, how false positives should be handled, ' +
      'and what privacy protections should be provided to students.',
    placeholder:
      'Discuss what behavioral signals constitute meaningful evidence vs. noise, how confidence ' +
      'thresholds and human review should be incorporated, what recourse a student should have ' +
      'if falsely flagged, and what data minimisation and transparency obligations the system should meet…',
  },
]

/** Fisher-Yates shuffle — returns a new array, never mutates the input. */
export function shuffleQuestions<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Normalises a raw typed answer for comparison — kept for interface compatibility. */
export function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.+$/, '')
}

/** Always returns false for long-answer questions with no acceptable answers defined. */
export function isAnswerCorrect(question: ExamQuestion, rawAnswer: string): boolean {
  if (!question.acceptableAnswers?.length) return false
  const norm = normalizeAnswer(rawAnswer)
  if (!norm) return false
  return question.acceptableAnswers.some(a => normalizeAnswer(a) === norm)
}
