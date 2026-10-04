import assert from 'node:assert/strict';
import { enrolledCourses, groupCourseClients, type ManagedCourse } from './courseScope';
import { trainerCourseRoute } from '../../shared/trainerCourseRoute';

const courses: ManagedCourse[] = [
  { _id: 'a', clientId: 'one', clientName: 'First', batchAndParticipants: [{ users: [{ user: 'trainer', status: 'active' }] }] },
  // Same client, another trainer: must never leak into the client drill-down.
  { _id: 'b', clientId: 'one', clientName: 'First', batchAndParticipants: [{ users: [{ user: 'other', status: 'active' }] }] },
  { _id: 'c', clientId: { _id: 'two' }, clientName: 'Second', batchAndParticipants: [{ users: [{ user: { _id: 'trainer' }, status: 'completed' }] }] },
  { _id: 'd', clientId: 'hidden', clientName: 'Hidden', batchAndParticipants: [{ users: [{ user: 'trainer', status: 'suspended' }, { user: 'other', status: 'active' }] }] },
  { _id: 'e', clientName: 'Legacy', batchAndParticipants: [{ users: [{ user: { $oid: 'trainer' } }] }] },
  { _id: 'f', clientName: 'First', clientId: 'one', batchAndParticipants: [{ users: [{ user: 'trainer', status: 'dropped' }] }, { users: [{ user: 'trainer', status: 'active' }] }] },
];
const own = enrolledCourses(courses, 'trainer');
assert.deepEqual(own.map((course) => course._id), ['a', 'c', 'e', 'f']);
assert.deepEqual(enrolledCourses(courses, ''), []);
assert.deepEqual(enrolledCourses(courses, 'unknown'), []);
assert.deepEqual(groupCourseClients(own).map((client) => [client.name, client.courses.map((course) => course._id)]), [
  ['First', ['a', 'f']], ['Legacy', ['e']], ['Second', ['c']],
]);
assert.equal(groupCourseClients([...own, own[0]])[0].courses.length, 2);
assert.equal(trainerCourseRoute('courses', { roleValue: 'trainer' }), '/lms/pages/courses');
assert.equal(trainerCourseRoute('course_management', { originalRole: 'Staff' }), '/lms/pages/courses');
assert.equal(trainerCourseRoute('coursestructure', { roleValue: 'admin' }), null);
assert.equal(trainerCourseRoute('coursestructure', { roleValue: 'programcoordinator' }), null);
assert.equal(trainerCourseRoute('courses', { roleValue: 'student' }), null);
assert.equal(trainerCourseRoute('grades', { roleValue: 'trainer' }), null);
console.log('11 trainer course visibility and navigation checks passed');
