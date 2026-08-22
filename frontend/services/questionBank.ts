// Real exam question bank — 30 original questions across 8 technical
// categories, mixed difficulty (~30% easy / ~50% medium / ~20% hard).
// Answers are never exposed to the client's rendered UI until submission —
// see app/exam/page.tsx, which only reads `correctIndex`/`explanation`
// inside the post-submission grading pass.

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
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
}

export const EXAM_NAME = 'Computer Science & Data Science Assessment'
export const EXAM_DURATION_MINUTES = 30

export const QUESTION_BANK: ExamQuestion[] = [
  // ── Data Structures ──────────────────────────────────────────────────
  {
    id: 'ds-1', category: 'Data Structures', difficulty: 'easy', type: 'conceptual',
    question: 'Which data structure follows Last-In-First-Out (LIFO) ordering?',
    options: ['Queue', 'Stack', 'Linked List', 'Heap'],
    correctIndex: 1,
    explanation: 'A stack only allows insertion and removal at the same end, so the most recently pushed element is always the first removed.',
  },
  {
    id: 'ds-2', category: 'Data Structures', difficulty: 'medium', type: 'conceptual',
    question: 'What is the average-case time complexity of searching for a value in a balanced binary search tree with n nodes?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correctIndex: 2,
    explanation: 'A balanced BST halves the search space at each step, giving O(log n) height and search time.',
  },
  {
    id: 'ds-3', category: 'Data Structures', difficulty: 'medium', type: 'algorithm',
    question: 'Which traversal of a binary search tree visits nodes in ascending sorted order?',
    options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
    correctIndex: 1,
    explanation: 'In-order traversal (left, root, right) visits a BST\'s nodes in ascending key order by definition of the BST property.',
  },
  {
    id: 'ds-4', category: 'Data Structures', difficulty: 'medium', type: 'scenario',
    question: 'A hash table with 10 buckets uses separate chaining and currently stores 15 elements. What is its load factor?',
    options: ['0.67', '1.0', '1.5', '2.5'],
    correctIndex: 2,
    explanation: 'Load factor is defined as (number of elements) / (number of buckets) = 15 / 10 = 1.5.',
  },

  // ── Algorithms ────────────────────────────────────────────────────────
  {
    id: 'al-1', category: 'Algorithms', difficulty: 'easy', type: 'conceptual',
    question: 'What is the worst-case time complexity of Bubble Sort on an array of n elements?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    correctIndex: 2,
    explanation: 'In the worst case (reverse-sorted input), Bubble Sort performs roughly n²/2 comparisons and swaps.',
  },
  {
    id: 'al-2', category: 'Algorithms', difficulty: 'medium', type: 'conceptual',
    question: 'Which algorithm design paradigm does Merge Sort primarily rely on?',
    options: ['Greedy', 'Dynamic Programming', 'Divide and Conquer', 'Backtracking'],
    correctIndex: 2,
    explanation: 'Merge Sort splits the array into halves, recursively sorts each half, and merges the results — the classic divide-and-conquer pattern.',
  },
  {
    id: 'al-3', category: 'Algorithms', difficulty: 'medium', type: 'code-output',
    question: 'What does the following pseudocode print?\n\nfor i in range(3):\n    for j in range(i):\n        print("*", end="")\n    print()',
    options: [
      'Three lines with 0, 1, and 2 asterisks',
      'Three lines with 1, 2, and 3 asterisks',
      'A single line of three asterisks',
      'A runtime error',
    ],
    correctIndex: 0,
    explanation: 'When i=0 the inner loop runs 0 times (empty line); when i=1 it prints one "*"; when i=2 it prints two "*" — a growing triangle starting from an empty line.',
  },
  {
    id: 'al-4', category: 'Algorithms', difficulty: 'hard', type: 'algorithm',
    question: "What is the time complexity of Dijkstra's shortest-path algorithm using a binary heap, for a graph with V vertices and E edges?",
    options: ['O(V²)', 'O(E log V)', 'O((V + E) log V)', 'O(V·E)'],
    correctIndex: 2,
    explanation: 'Each vertex is extracted from the heap once (O(V log V)) and each edge may trigger a decrease-key operation (O(E log V)), giving O((V+E) log V) overall.',
  },

  // ── Database Systems ─────────────────────────────────────────────────
  {
    id: 'db-1', category: 'Database Systems', difficulty: 'easy', type: 'conceptual',
    question: 'Which SQL clause filters individual rows based on a condition before any grouping occurs?',
    options: ['GROUP BY', 'WHERE', 'ORDER BY', 'HAVING'],
    correctIndex: 1,
    explanation: 'WHERE filters rows from the source tables before grouping; HAVING filters groups afterward.',
  },
  {
    id: 'db-2', category: 'Database Systems', difficulty: 'medium', type: 'conceptual',
    question: 'Which normal form eliminates transitive dependencies on the primary key?',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    correctIndex: 2,
    explanation: 'Third Normal Form (3NF) requires that non-key attributes depend only on the primary key, not on other non-key attributes (no transitive dependency).',
  },
  {
    id: 'db-3', category: 'Database Systems', difficulty: 'medium', type: 'db-query',
    question: 'Given Students(id, name) and Enrollments(student_id, course_id), which query returns the names of students enrolled in at least one course?',
    options: [
      'SELECT name FROM Students WHERE id IN (SELECT student_id FROM Enrollments)',
      'SELECT name FROM Students JOIN Enrollments ON Students.id != Enrollments.student_id',
      'SELECT name FROM Enrollments',
      'SELECT DISTINCT student_id FROM Enrollments',
    ],
    correctIndex: 0,
    explanation: 'The subquery finds every student_id that appears in Enrollments, and the outer query returns the matching names from Students.',
  },
  {
    id: 'db-4', category: 'Database Systems', difficulty: 'hard', type: 'scenario',
    question: 'A transaction satisfies the "Isolation" property of ACID when:',
    options: [
      'It either completes fully or has no effect at all',
      "Its intermediate state is never visible to other concurrent transactions",
      'The database remains valid before and after the transaction',
      'Once committed, its changes survive a system failure',
    ],
    correctIndex: 1,
    explanation: 'Isolation guarantees that concurrently executing transactions do not observe each other\'s uncommitted intermediate state (the other options describe Atomicity, Consistency, and Durability, respectively).',
  },

  // ── Python / Programming ─────────────────────────────────────────────
  {
    id: 'py-1', category: 'Python / Programming', difficulty: 'easy', type: 'code-output',
    question: 'What is the output of: print(type([]) == list)',
    options: ['True', 'False', 'TypeError', "list"],
    correctIndex: 0,
    explanation: 'type([]) evaluates to the built-in list type, and comparing it to list with == returns True.',
  },
  {
    id: 'py-2', category: 'Python / Programming', difficulty: 'easy', type: 'conceptual',
    question: 'Which keyword is used to define a function in Python?',
    options: ['func', 'def', 'function', 'lambda'],
    correctIndex: 1,
    explanation: '"def" introduces a named function definition; "lambda" only creates small anonymous functions.',
  },
  {
    id: 'py-3', category: 'Python / Programming', difficulty: 'medium', type: 'debugging',
    question: 'This function is meant to sum a list of numbers, but it raises a TypeError. What is the bug?\n\ndef total(nums):\n    result = []\n    for n in nums:\n        result += n\n    return result',
    options: [
      '`result` should be initialized to 0, not an empty list',
      '`nums` is not iterable',
      'The `+=` operator cannot appear inside a loop',
      '`return` is placed outside the function body',
    ],
    correctIndex: 0,
    explanation: '`result` is a list, so `result += n` tries to extend it with the (non-iterable) number n, raising a TypeError. Initializing `result = 0` and using `result += n` would correctly sum the values.',
  },
  {
    id: 'py-4', category: 'Python / Programming', difficulty: 'hard', type: 'code-output',
    question: 'What does this print?\n\ndef f(x, lst=[]):\n    lst.append(x)\n    return lst\n\nprint(f(1))\nprint(f(2))',
    options: ['[1] then [2]', '[1] then [1, 2]', '[1, 2] then [1, 2]', 'A runtime error'],
    correctIndex: 1,
    explanation: 'Default mutable arguments are created once, at function definition time, and reused across calls — so the same list object accumulates values across both calls.',
  },

  // ── Statistics ────────────────────────────────────────────────────────
  {
    id: 'st-1', category: 'Statistics', difficulty: 'easy', type: 'numerical',
    question: 'What is the mean of the dataset [2, 4, 4, 4, 5, 5, 7, 9]?',
    options: ['4', '5', '5.5', '6'],
    correctIndex: 1,
    explanation: 'The sum is 40 across 8 values, so the mean is 40 / 8 = 5.',
  },
  {
    id: 'st-2', category: 'Statistics', difficulty: 'medium', type: 'conceptual',
    question: 'Which measure of central tendency is most sensitive to extreme outliers?',
    options: ['Mean', 'Median', 'Mode', 'Range'],
    correctIndex: 0,
    explanation: 'The mean incorporates the magnitude of every value, so a single extreme outlier can shift it substantially; the median and mode are far more robust.',
  },
  {
    id: 'st-3', category: 'Statistics', difficulty: 'medium', type: 'numerical',
    question: 'A fair six-sided die is rolled once. What is the probability of rolling a number greater than 4?',
    options: ['1/6', '1/3', '1/2', '2/3'],
    correctIndex: 1,
    explanation: 'Only 5 and 6 are greater than 4, giving 2 favorable outcomes out of 6, i.e. 2/6 = 1/3.',
  },
  {
    id: 'st-4', category: 'Statistics', difficulty: 'hard', type: 'conceptual',
    question: 'In hypothesis testing, a Type II error occurs when:',
    options: [
      'The null hypothesis is rejected even though it is true',
      'The null hypothesis is not rejected even though it is false',
      'The alternative hypothesis is rejected even though it is true',
      'The p-value is exactly equal to the significance level',
    ],
    correctIndex: 1,
    explanation: 'A Type II error is a false negative: failing to reject a null hypothesis that is actually false. (Rejecting a true null hypothesis is a Type I error.)',
  },

  // ── Data Science / Machine Learning ──────────────────────────────────
  {
    id: 'ml-1', category: 'Data Science / Machine Learning', difficulty: 'easy', type: 'conceptual',
    question: 'Which of the following is an example of a supervised learning task?',
    options: [
      'Clustering customers into unlabeled segments',
      'Predicting house prices from labeled historical sales data',
      'Reducing the dimensionality of a dataset',
      'Detecting anomalies with no labeled examples',
    ],
    correctIndex: 1,
    explanation: 'Supervised learning trains on labeled input-output pairs; predicting house prices from historical sale prices is a classic regression example.',
  },
  {
    id: 'ml-2', category: 'Data Science / Machine Learning', difficulty: 'medium', type: 'conceptual',
    question: "What is the primary purpose of a validation set during model training?",
    options: [
      "To directly train the model's final weights",
      'To tune hyperparameters and detect overfitting during training',
      'To store raw, unprocessed data',
      'To permanently replace the test set',
    ],
    correctIndex: 1,
    explanation: 'The validation set is used to evaluate the model on unseen data during development, guiding hyperparameter choices without touching the held-out test set.',
  },
  {
    id: 'ml-3', category: 'Data Science / Machine Learning', difficulty: 'medium', type: 'scenario',
    question: 'A binary classifier reaches 95% accuracy on a dataset where 95% of samples belong to one class. What does this most likely indicate?',
    options: [
      'The model has learned a highly effective decision boundary',
      'Accuracy alone may be misleading due to severe class imbalance',
      'The model has zero prediction error',
      'Precision is guaranteed to also be high',
    ],
    correctIndex: 1,
    explanation: 'A model that always predicts the majority class would already score 95% accuracy here without learning anything useful — accuracy is uninformative under strong class imbalance.',
  },
  {
    id: 'ml-4', category: 'Data Science / Machine Learning', difficulty: 'hard', type: 'numerical',
    question: 'A binary classifier produces 80 true positives, 20 false negatives, 10 false positives, and 90 true negatives. What is its recall?',
    options: ['0.80', '0.89', '0.90', '0.44'],
    correctIndex: 0,
    explanation: 'Recall = TP / (TP + FN) = 80 / (80 + 20) = 0.80.',
  },

  // ── Computer Networks ─────────────────────────────────────────────────
  {
    id: 'cn-1', category: 'Computer Networks', difficulty: 'easy', type: 'conceptual',
    question: 'Which OSI layer is responsible for routing packets between different networks?',
    options: ['Data Link', 'Network', 'Transport', 'Session'],
    correctIndex: 1,
    explanation: 'The Network layer (Layer 3) handles logical addressing and routing of packets across interconnected networks.',
  },
  {
    id: 'cn-2', category: 'Computer Networks', difficulty: 'medium', type: 'conceptual',
    question: 'Which protocol provides reliable, ordered, and error-checked delivery of a stream of data between applications?',
    options: ['UDP', 'IP', 'TCP', 'ICMP'],
    correctIndex: 2,
    explanation: 'TCP establishes a connection, acknowledges received segments, retransmits lost ones, and preserves ordering — properties UDP explicitly does not provide.',
  },
  {
    id: 'cn-3', category: 'Computer Networks', difficulty: 'medium', type: 'scenario',
    question: 'A client resolves example.com to an IP address before opening a TCP connection to it. Which protocol performed that resolution?',
    options: ['DNS (Application layer)', 'TCP (Transport layer)', 'IP (Network layer)', 'Ethernet (Data Link layer)'],
    correctIndex: 0,
    explanation: 'DNS, an application-layer protocol, translates human-readable domain names into IP addresses before any transport-layer connection is established.',
  },

  // ── Operating Systems ─────────────────────────────────────────────────
  {
    id: 'os-1', category: 'Operating Systems', difficulty: 'easy', type: 'conceptual',
    question: 'What is the primary purpose of a process scheduler in an operating system?',
    options: [
      'To manage how files are stored on disk',
      'To decide which process runs on the CPU next',
      'To allocate IP addresses to network interfaces',
      'To compile source code into machine instructions',
    ],
    correctIndex: 1,
    explanation: 'The scheduler chooses, from the set of ready processes, which one gets the CPU and for how long — the core of multitasking.',
  },
  {
    id: 'os-2', category: 'Operating Systems', difficulty: 'medium', type: 'conceptual',
    question: 'Which CPU scheduling algorithm can cause starvation of long processes?',
    options: ['Round Robin', 'Shortest Job First', 'First-Come First-Served', 'FIFO'],
    correctIndex: 1,
    explanation: 'Shortest Job First always prefers shorter jobs, so a continuous stream of short jobs can indefinitely delay a longer one.',
  },
  {
    id: 'os-3', category: 'Operating Systems', difficulty: 'hard', type: 'scenario',
    question: 'Two processes each hold a resource the other needs, and both are blocked waiting indefinitely. This situation is called:',
    options: ['Starvation', 'Thrashing', 'Deadlock', 'Race condition'],
    correctIndex: 2,
    explanation: 'A deadlock is a cycle of processes each waiting on a resource held by the next, with none able to proceed.',
  },
]

/** Fisher-Yates shuffle — returns a new array, never mutates the input.
 * Used once at exam start to randomize question order per session; the
 * question objects themselves (and their correctIndex) are untouched, so
 * grading correctness is unaffected by the order they're presented in. */
export function shuffleQuestions<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
