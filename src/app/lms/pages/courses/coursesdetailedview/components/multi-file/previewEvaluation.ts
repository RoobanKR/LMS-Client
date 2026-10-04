interface JudgeCase {
  index: number; hidden?: boolean; passed: boolean;
  input?: string; expectedOutput?: string; actualOutput?: string;
  verdict?: string; errorMessage?: string;
}
export interface PreviewJudgeResult {
  score: number; status: string; passed: number; total: number;
  perCase: JudgeCase[];
}

// Match the submit API's progressive hidden-case reveal in a disposable preview.
export function previewEvaluation(result: PreviewJudgeResult) {
  const visible = result.perCase.filter((item) => !item.hidden);
  const unlocked = new Set<number>();
  if (visible.length && visible.every((item) => item.passed)) {
    for (const item of result.perCase.filter((item) => item.hidden)) {
      unlocked.add(item.index);
      if (!item.passed) break;
    }
  }
  return {
    method: 'testcase',
    testcase: {
      passed: result.passed, total: result.total,
      cases: result.perCase.map((item) => {
        const revealed = !item.hidden || unlocked.has(item.index);
        return { ...item, hidden: !!item.hidden, unlocked: revealed,
          input: revealed ? item.input || '' : '',
          expectedOutput: revealed ? item.expectedOutput || '' : '',
        };
      }),
    },
  };
}
