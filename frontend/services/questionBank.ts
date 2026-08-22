// Real exam question bank — 30 original short-answer (typed) questions
// across 8 technical categories, mixed difficulty (~30% easy / ~50%
// medium / ~20% hard). Every question is answered by typing into a real
// text field, not selecting an option — this is deliberate: it's what
// lets the existing behavioral monitoring pipeline observe genuine
// typing rhythm and (if a student pastes an answer in) real copy/paste
// events, the same signals the ML risk engine already scores.
//
// Grading is a plain, deterministic normalized-string match against
// `acceptableAnswers` (see gradeExam in app/exam/page.tsx) — no fuzzy
// matching, no partial credit. Correct answers are never rendered to the
// client until after submission.

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type QuestionType =
  | 'conceptual' | 'code-output' | 'debugging' | 'algorithm'
  | 'db-query' | 'numerical' | 'scenario'

export interface ExamQuestion {
  id: string
  category: string
  difficulty: QuestionDifficulty
  type: QuestionType
  question: string
  /** Normalized (case/whitespace-insensitive) acceptable answers. */
  acceptableAnswers: string[]
  explanation: string
}

export const EXAM_NAME = 'Computer Science & Data Science Assessment'
export const EXAM_DURATION_MINUTES = 30

export const QUESTION_BANK: ExamQuestion[] = [
  // ── Data Structures ──────────────────────────────────────────────────
  {
    id: 'ds-1', category: 'Data Structures', difficulty: 'easy', type: 'conceptual',
    question: 'Which data structure follows Last-In-First-Out (LIFO) ordering? (name the data structure)',
    acceptableAnswers: ['stack'],
    explanation: 'A stack only allows insertion and removal at the same end, so the most recently pushed element is always the first removed.',
  },
  {
    id: 'ds-2', category: 'Data Structures', difficulty: 'medium', type: 'conceptual',
    question: 'What is the average-case time complexity of searching for a value in a balanced binary search tree with n nodes? (Big-O notation, e.g. "O(1)")',
    acceptableAnswers: ['o(log n)', 'o(logn)', 'log n', 'o(log(n))'],
    explanation: 'A balanced BST halves the search space at each step, giving O(log n) height and search time.',
  },
  {
    id: 'ds-3', category: 'Data Structures', difficulty: 'medium', type: 'algorithm',
    question: 'Which traversal of a binary search tree visits nodes in ascending sorted order? (one word)',
    acceptableAnswers: ['in-order', 'inorder', 'in order'],
    explanation: 'In-order traversal (left, root, right) visits a BST\'s nodes in ascending key order by definition of the BST property.',
  },
  {
    id: 'ds-4', category: 'Data Structures', difficulty: 'medium', type: 'scenario',
    question: 'A hash table with 10 buckets uses separate chaining and currently stores 15 elements. What is its load factor? (as a decimal, e.g. "0.5")',
    acceptableAnswers: ['1.5', '1.50'],
    explanation: 'Load factor is defined as (number of elements) / (number of buckets) = 15 / 10 = 1.5.',
  },

  // ── Algorithms ────────────────────────────────────────────────────────
  {
    id: 'al-1', category: 'Algorithms', difficulty: 'easy', type: 'conceptual',
    question: 'What is the worst-case time complexity of Bubble Sort on an array of n elements? (Big-O notation)',
    acceptableAnswers: ['o(n^2)', 'o(n2)', 'o(n²)', 'n^2'],
    explanation: 'In the worst case (reverse-sorted input), Bubble Sort performs roughly n²/2 comparisons and swaps.',
  },
  {
    id: 'al-2', category: 'Algorithms', difficulty: 'medium', type: 'conceptual',
    question: 'Which algorithm design paradigm does Merge Sort primarily rely on? (two words)',
    acceptableAnswers: ['divide and conquer', 'divide-and-conquer'],
    explanation: 'Merge Sort splits the array into halves, recursively sorts each half, and merges the results — the classic divide-and-conquer pattern.',
  },
  {
    id: 'al-3', category: 'Algorithms', difficulty: 'medium', type: 'code-output',
    question: 'How many asterisks are printed on the third line of output (when i=2) by this code?\n\nfor i in range(3):\n    for j in range(i):\n        print("*", end="")\n    print()',
    acceptableAnswers: ['2', 'two'],
    explanation: 'When i=2, the inner loop runs twice (j=0,1), printing two asterisks on that line.',
  },
  {
    id: 'al-4', category: 'Algorithms', difficulty: 'hard', type: 'algorithm',
    question: "What is the time complexity of Dijkstra's shortest-path algorithm using a binary heap, for a graph with V vertices and E edges? (Big-O notation)",
    acceptableAnswers: ['o((v+e) log v)', 'o((v + e) log v)', '(v+e)log v', 'o((e+v) log v)', 'o((e+v)log v)'],
    explanation: 'Each vertex is extracted from the heap once (O(V log V)) and each edge may trigger a decrease-key operation (O(E log V)), giving O((V+E) log V) overall.',
  },

  // ── Database Systems ─────────────────────────────────────────────────
  {
    id: 'db-1', category: 'Database Systems', difficulty: 'easy', type: 'conceptual',
    question: 'Which SQL clause filters individual rows based on a condition, before any grouping occurs? (one word)',
    acceptableAnswers: ['where'],
    explanation: 'WHERE filters rows from the source tables before grouping; HAVING filters groups afterward.',
  },
  {
    id: 'db-2', category: 'Database Systems', difficulty: 'medium', type: 'conceptual',
    question: 'Which normal form eliminates transitive dependencies on the primary key? (e.g. "1NF")',
    acceptableAnswers: ['3nf', 'third normal form'],
    explanation: 'Third Normal Form (3NF) requires that non-key attributes depend only on the primary key, not on other non-key attributes (no transitive dependency).',
  },
  {
    id: 'db-3', category: 'Database Systems', difficulty: 'medium', type: 'db-query',
    question: 'Fill in the blank SQL keyword: to find students enrolled in at least one course using Students(id, name) and Enrollments(student_id, course_id):\n\nSELECT name FROM Students WHERE id ___ (SELECT student_id FROM Enrollments)',
    acceptableAnswers: ['in'],
    explanation: 'The IN operator checks whether a value appears in the result set returned by the subquery.',
  },
  {
    id: 'db-4', category: 'Database Systems', difficulty: 'medium', type: 'scenario',
    question: 'Which ACID property guarantees that a transaction\'s intermediate state is never visible to other concurrent transactions? (one word)',
    acceptableAnswers: ['isolation'],
    explanation: 'Isolation guarantees that concurrently executing transactions do not observe each other\'s uncommitted intermediate state.',
  },

  // ── Python / Programming ─────────────────────────────────────────────
  {
    id: 'py-1', category: 'Python / Programming', difficulty: 'easy', type: 'code-output',
    question: 'What is printed by: print(type([]) == list)',
    acceptableAnswers: ['true'],
    explanation: 'type([]) evaluates to the built-in list type, and comparing it to list with == returns True.',
  },
  {
    id: 'py-2', category: 'Python / Programming', difficulty: 'easy', type: 'conceptual',
    question: 'Which keyword is used to define a named function in Python?',
    acceptableAnswers: ['def'],
    explanation: '"def" introduces a named function definition; "lambda" only creates small anonymous functions.',
  },
  {
    id: 'py-3', category: 'Python / Programming', difficulty: 'medium', type: 'debugging',
    question: 'This function is meant to sum a list of numbers but raises a TypeError. What should `result` be initialized to instead of []?\n\ndef total(nums):\n    result = []\n    for n in nums:\n        result += n\n    return result',
    acceptableAnswers: ['0'],
    explanation: '`result` is a list, so `result += n` tries to extend it with the (non-iterable) number n, raising a TypeError. Initializing `result = 0` would correctly sum the values.',
  },
  {
    id: 'py-4', category: 'Python / Programming', difficulty: 'hard', type: 'code-output',
    question: 'What is printed by the second call, f(2), given:\n\ndef f(x, lst=[]):\n    lst.append(x)\n    return lst\n\nprint(f(1))\nprint(f(2))',
    acceptableAnswers: ['[1, 2]', '[1,2]'],
    explanation: 'Default mutable arguments are created once, at function definition time, and reused across calls — so the same list object accumulates values across both calls.',
  },

  // ── Statistics ────────────────────────────────────────────────────────
  {
    id: 'st-1', category: 'Statistics', difficulty: 'easy', type: 'numerical',
    question: 'What is the mean of the dataset [2, 4, 4, 4, 5, 5, 7, 9]?',
    acceptableAnswers: ['5', '5.0'],
    explanation: 'The sum is 40 across 8 values, so the mean is 40 / 8 = 5.',
  },
  {
    id: 'st-2', category: 'Statistics', difficulty: 'medium', type: 'conceptual',
    question: 'Which measure of central tendency is most sensitive to extreme outliers? (one word)',
    acceptableAnswers: ['mean'],
    explanation: 'The mean incorporates the magnitude of every value, so a single extreme outlier can shift it substantially; the median and mode are far more robust.',
  },
  {
    id: 'st-3', category: 'Statistics', difficulty: 'medium', type: 'numerical',
    question: 'A fair six-sided die is rolled once. What is the probability of rolling a number greater than 4? (as a fraction, e.g. "1/2")',
    acceptableAnswers: ['1/3', '0.33', '0.333', '33%'],
    explanation: 'Only 5 and 6 are greater than 4, giving 2 favorable outcomes out of 6, i.e. 2/6 = 1/3.',
  },
  {
    id: 'st-4', category: 'Statistics', difficulty: 'hard', type: 'conceptual',
    question: 'What is the name of the hypothesis-testing error that occurs when a false null hypothesis is NOT rejected? (e.g. "Type I Error")',
    acceptableAnswers: ['type ii error', 'type 2 error', 'type ii', 'type 2'],
    explanation: 'A Type II error is a false negative: failing to reject a null hypothesis that is actually false. (Rejecting a true null hypothesis is a Type I error.)',
  },

  // ── Data Science / Machine Learning ──────────────────────────────────
  {
    id: 'ml-1', category: 'Data Science / Machine Learning', difficulty: 'easy', type: 'conceptual',
    question: 'What is the general term for a machine learning task where a model learns from labeled input-output pairs (e.g. predicting house prices from historical sales data)? (two words)',
    acceptableAnswers: ['supervised learning'],
    explanation: 'Supervised learning trains on labeled input-output pairs; predicting house prices from historical sale prices is a classic regression example.',
  },
  {
    id: 'ml-2', category: 'Data Science / Machine Learning', difficulty: 'medium', type: 'conceptual',
    question: 'What is the name of the data split used to tune hyperparameters and detect overfitting during training, distinct from the training and test sets? (two words)',
    acceptableAnswers: ['validation set', 'validation data', 'validation'],
    explanation: 'The validation set is used to evaluate the model on unseen data during development, guiding hyperparameter choices without touching the held-out test set.',
  },
  {
    id: 'ml-3', category: 'Data Science / Machine Learning', difficulty: 'medium', type: 'scenario',
    question: 'What is the name of the data condition — where one class vastly outnumbers another — that can make accuracy alone a misleading metric? (two words)',
    acceptableAnswers: ['class imbalance', 'imbalanced classes', 'imbalanced data'],
    explanation: 'A model that always predicts the majority class can score high accuracy under this condition without learning anything useful.',
  },
  {
    id: 'ml-4', category: 'Data Science / Machine Learning', difficulty: 'hard', type: 'numerical',
    question: 'A binary classifier produces 80 true positives, 20 false negatives, 10 false positives, and 90 true negatives. What is its recall? (as a decimal)',
    acceptableAnswers: ['0.8', '0.80', '80%'],
    explanation: 'Recall = TP / (TP + FN) = 80 / (80 + 20) = 0.80.',
  },

  // ── Computer Networks ─────────────────────────────────────────────────
  {
    id: 'cn-1', category: 'Computer Networks', difficulty: 'easy', type: 'conceptual',
    question: 'Which OSI layer is responsible for routing packets between different networks? (one word)',
    acceptableAnswers: ['network', 'network layer'],
    explanation: 'The Network layer (Layer 3) handles logical addressing and routing of packets across interconnected networks.',
  },
  {
    id: 'cn-2', category: 'Computer Networks', difficulty: 'medium', type: 'conceptual',
    question: 'Which transport-layer protocol provides reliable, ordered, error-checked delivery of a data stream between applications? (acronym)',
    acceptableAnswers: ['tcp'],
    explanation: 'TCP establishes a connection, acknowledges received segments, retransmits lost ones, and preserves ordering — properties UDP explicitly does not provide.',
  },
  {
    id: 'cn-3', category: 'Computer Networks', difficulty: 'medium', type: 'scenario',
    question: 'Which application-layer protocol resolves a domain name like example.com into an IP address before a TCP connection is opened? (acronym)',
    acceptableAnswers: ['dns'],
    explanation: 'DNS, an application-layer protocol, translates human-readable domain names into IP addresses before any transport-layer connection is established.',
  },

  // ── Operating Systems ─────────────────────────────────────────────────
  {
    id: 'os-1', category: 'Operating Systems', difficulty: 'easy', type: 'conceptual',
    question: 'What is the name of the operating system component that decides which process runs on the CPU next? (two words)',
    acceptableAnswers: ['process scheduler', 'scheduler', 'cpu scheduler'],
    explanation: 'The scheduler chooses, from the set of ready processes, which one gets the CPU and for how long — the core of multitasking.',
  },
  {
    id: 'os-2', category: 'Operating Systems', difficulty: 'medium', type: 'conceptual',
    question: 'Which CPU scheduling algorithm can cause starvation of long processes by always preferring shorter ones? (acronym)',
    acceptableAnswers: ['sjf', 'shortest job first'],
    explanation: 'Shortest Job First always prefers shorter jobs, so a continuous stream of short jobs can indefinitely delay a longer one.',
  },
  {
    id: 'os-3', category: 'Operating Systems', difficulty: 'hard', type: 'scenario',
    question: 'Two processes each hold a resource the other needs, and both are blocked waiting indefinitely. What is this situation called? (one word)',
    acceptableAnswers: ['deadlock'],
    explanation: 'A deadlock is a cycle of processes each waiting on a resource held by the next, with none able to proceed.',
  },
]

/** Fisher-Yates shuffle — returns a new array, never mutates the input.
 * Used once at exam start to randomize question order per session. */
export function shuffleQuestions<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Deterministic, case/whitespace-insensitive normalization used to grade
 * typed answers — no fuzzy matching or partial credit, intentionally. */
export function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.+$/, '')
}

export function isAnswerCorrect(question: ExamQuestion, rawAnswer: string): boolean {
  const norm = normalizeAnswer(rawAnswer)
  if (!norm) return false
  return question.acceptableAnswers.some(a => normalizeAnswer(a) === norm)
}
