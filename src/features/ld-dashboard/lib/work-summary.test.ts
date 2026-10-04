import assert from "node:assert/strict";
import { summarizeWork, combineWork, summarizeCategories, combineCategories } from "./work-summary";

// Different category sizes must not be given equal weight.
assert.deepEqual(summarizeWork({ MCQ: { total: 1, completed: 1, percentage: 100 }, Programming: { total: 9, completed: 1, percentage: 10 } }), { total: 10, attempted: 2, score: 19 });
// An untouched category still contributes assigned work to the denominator.
assert.deepEqual(summarizeWork({ Test: { total: 2, completed: 1, percentage: 40 }, Other: { total: 2, completed: 0, percentage: 0 } }), { total: 4, attempted: 1, score: 20 });
assert.deepEqual(summarizeWork(undefined), { total: 0, attempted: 0, score: null });
assert.equal(summarizeWork({ Test: { total: 3, completed: 0, percentage: 0 } }).score, null);
assert.equal(summarizeWork({ Test: { total: 1, completed: 1, percentage: 0 } }).score, 0);
const assignment = summarizeWork({ Assignment: { total: 2, completed: 2, percentage: 90 } });
const assessment = summarizeWork({ Assessment: { total: 1, completed: 1, percentage: 30 } });
assert.equal(combineWork([assignment]).score, 90);
assert.equal(combineWork([assessment]).score, 30);
assert.deepEqual(combineWork([{ total: 1, attempted: 1, score: 100 }, { total: 9, attempted: 0, score: null }]), { total: 10, attempted: 1, score: 10 });
assert.equal(combineWork([undefined]).score, null);
const custom = summarizeCategories({ "Project Development": { total: 2, completed: 1, percentage: 35 }, "Lab Practice": { total: 1, completed: 1, percentage: 80 } });
assert.deepEqual(custom.map((category) => category.name), ["Project Development", "Lab Practice"]);
assert.equal(custom[0].score, 35);
assert.deepEqual(combineCategories([custom, [{ name: "Project Development", total: 2, attempted: 2, score: 65 }]]).find((category) => category.name === "Project Development"), { name: "Project Development", total: 4, attempted: 3, score: 50 });
console.log("12 dynamic activity calculation checks passed");
