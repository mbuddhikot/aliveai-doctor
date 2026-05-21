import clsx from 'clsx'
import { STATUS_META, WORKFLOW_META } from '../constants'
import type { AppointmentStatus, AppointmentWorkflowStatus } from '../types'

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.upcoming
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold',
        meta.className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function WorkflowBadge({
  workflowStatus,
}: {
  workflowStatus: AppointmentWorkflowStatus
}) {
  const meta = WORKFLOW_META[workflowStatus] ?? WORKFLOW_META.pending
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-bold',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
