// /src/documentation/triggers.ts

/**
 * Trigger: trg_update_absence_reason
 *
 * Fires AFTER UPDATE on attendance.reason
 * - Syncs reason into absence_log.reason for the same attendance_id
 * - Then counts all unexcused absence_log rows for that student
 * - Updates students.unexcused_count with the result
 *
 * This ensures that correcting a mistake (like changing "unexcused" to "school_event")
 * automatically cleans up downstream records and behavior flags.
 */

export const absenceReasonTriggerName = 'trg_update_absence_reason'
export const absenceReasonFunctionName = 'sync_absence_reason_and_unexcused'
