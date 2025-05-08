// rosterManagement.ts

/**
 * This file explains how student rosters are managed within the PeriodRosterTab component.
 * It documents the logic used for adding/removing students to a teacher's class period.
 */

/**
 * TABLES INVOLVED:
 * - students: stores all registered students.
 * - student_class_periods: associative table linking students to class periods.
 * - class_periods: stores each teacher's classes.
 *
 * A student is considered part of a class when an entry exists in `student_class_periods`
 * with both `student_id` and `period_id`.
 */

/**
 * Adding a Student to a Period:
 * 1. Teacher enters a student's barcode.
 * 2. The system looks up the student by barcode in the `students` table.
 * 3. If found and not already enrolled in the class:
 *    - Insert a new row into `student_class_periods` with `student_id` and `period_id`.
 * 4. A confirmation modal is shown before committing.
 */

/**
 * Removing a Student from a Period:
 * 1. The teacher selects one or more students using checkboxes in the roster table.
 * 2. Upon clicking "Remove Selected", a confirmation modal appears.
 * 3. If confirmed, the system deletes rows from `student_class_periods`
 *    where `student_id` matches and `period_id` equals the current class.
 */

/**
 * Notes:
 * - This does not delete the student from the `students` table.
 * - A student cannot be in two class periods at the same time, so duplicate checks are minimal.
 * - The `PeriodRosterTab` auto-refreshes roster data after each add/remove to reflect changes.
 *
 * Required RLS Policy:
 * On `student_class_periods` table, a DELETE policy must be present:
 * ```sql
 * CREATE POLICY "Allow teachers to remove students from their classes"
 * ON public.student_class_periods
 * FOR DELETE
 * TO authenticated
 * USING (
 *   EXISTS (
 *     SELECT 1 FROM class_periods
 *     WHERE class_periods.id = student_class_periods.period_id
 *     AND class_periods.teacher_id = auth.uid()
 *   )
 * );
 * ```
 */
