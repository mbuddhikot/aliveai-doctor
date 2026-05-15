import type { ReactNode } from 'react'
import { FiArrowUp, FiChevronRight, FiUsers, FiVideo, FiZap } from 'react-icons/fi'
import { DashboardCard } from '../components/DashboardCard'

type SparklineVariant = 'blue' | 'red'
type TileTone = 'violet' | 'green' | 'amber'

const activityRows = [
  { label: 'Lab results uploaded', time: '2 minutes ago', tone: 'green' },
  { label: 'Appointment rescheduled', time: '15 minutes ago', tone: 'amber' },
  { label: 'New patient registered', time: '1 hour ago', tone: 'blue' },
]

const performanceRows = [
  { label: 'Patient Satisfaction', value: '4.8/5.0', tone: 'green' },
  { label: 'Attendance Rate', value: '94%', tone: 'green' },
  { label: 'New Patients', value: '+18%', tone: 'blue' },
]

const scheduleRows = [
  { time: '08 :00', name: 'Bolaji Abdulraheem', status: 'Ended', kind: 'video' },
  { time: '08 :20', name: 'Bolaji Abdulraheem', status: 'Ended', kind: 'group' },
  { time: '8 : 30', name: 'Bolaji Abdulraheem', status: 'Ongoing', kind: 'group', active: true },
  { time: '9 : 00', name: 'Bolaji Abdulraheem', status: 'Upcoming', kind: 'group' },
  { time: '9 : 30', name: 'ERC Report', status: 'Cancelled', kind: 'video', danger: true },
  { time: '10 :00', name: 'Bolaji Abdulraheem', status: 'Upcoming', kind: 'video' },
  { time: '10 :30', name: 'Bolaji Abdulraheem', status: 'Upcoming', kind: 'group' },
  { time: '11 :00', name: 'Bolaji Abdulraheem', status: 'Upcoming', kind: 'video' },
  { time: '11 :30', name: 'Bolaji Abdulraheem', status: 'Upcoming', kind: 'group' },
]

function MiniSparkline({ variant = 'blue' }: { variant?: SparklineVariant }) {
  const stroke = variant === 'red' ? '#f05a55' : '#2f80ed'
  const fill =
    variant === 'red' ? 'rgba(240,90,85,0.13)' : 'rgba(47,128,237,0.13)'

  return (
    <svg
      viewBox="0 0 180 100"
      className="h-[92px] w-[160px] max-w-full md:h-[108px] md:w-[190px]"
      aria-hidden="true"
    >
      <path
        d="M4 60 C 24 16, 50 72, 72 50 C 96 28, 112 18, 134 40 C 154 62, 158 90, 176 45"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path
        d="M4 60 C 24 16, 50 72, 72 50 C 96 28, 112 18, 134 40 C 154 62, 158 90, 176 45 L176 100 L4 100 Z"
        fill={fill}
      />
    </svg>
  )
}

function ConsultationCard({
  title,
  value,
  trend,
  variant,
}: {
  title: string
  value: string
  trend: string
  variant?: SparklineVariant
}) {
  const isNegative = variant === 'red'

  return (
    <DashboardCard title={title} className="h-auto md:h-[193px]">
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[120px_1fr]">
        <div>
          <div className="text-[40px] font-bold leading-none text-black">{value}</div>
          <div
            className={`mt-7 flex items-center gap-3 text-xl font-semibold ${
              isNegative ? 'text-[#f05a55]' : 'text-[#26b76a]'
            }`}
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white ${
                isNegative ? 'bg-[#f05a55]' : 'bg-[#26b76a]'
              }`}
            >
              <FiArrowUp className={`h-4 w-4 ${isNegative ? 'rotate-180' : ''}`} />
            </span>
            {trend}
          </div>
        </div>
        <div className="justify-self-start sm:justify-self-end">
          <MiniSparkline variant={variant} />
        </div>
      </div>
    </DashboardCard>
  )
}

function PatientCard() {
  return (
    <DashboardCard title="Total Patients" className="h-auto md:h-[193px]">
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[120px_1fr]">
        <div className="text-[40px] font-bold leading-none text-black">197</div>
        <div className="relative h-[132px] w-[132px] justify-self-start rounded-full bg-[conic-gradient(#2f80ed_0_56%,#f05a55_56%_100%)] sm:justify-self-center">
          <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white text-base">
            <div>
              <span className="text-black">110 </span>
              <span className="text-[#2f80ed]">Female</span>
            </div>
            <div className="mt-2">
              <span className="text-black">87 </span>
              <span className="text-[#f05a55]">Male</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}

function InfoPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="min-h-[240px] rounded-xl border border-[#dfe3ea] bg-white p-6 shadow-[0_18px_32px_rgba(31,41,55,0.08)]">
      <div className="flex items-center gap-3 text-xl font-semibold text-[#253047]">
        {icon}
        {title}
      </div>
      <p className="mt-3 text-base text-[#64748b]">{subtitle}</p>
      {children}
    </section>
  )
}

function ScheduleTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: TileTone
}) {
  const tones = {
    violet: 'text-[#8a37ff]',
    green: 'text-[#2cad67]',
    amber: 'text-[#f59e0b]',
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-base text-[#64748b]">{label}</span>
      <span className={`text-base font-bold ${tones[tone]}`}>{value}</span>
    </div>
  )
}

function ScheduleSummaryCard() {
  return (
    <InfoPanel
      icon={<span className="text-xl text-[#147cfb]">▣</span>}
      title="Today's Schedule"
      subtitle="Your appointments for today"
    >
      <div className="mt-4 space-y-2.5">
        <ScheduleTile label="Morning" value="8 patients" tone="violet" />
        <ScheduleTile label="Afternoon" value="12 patients" tone="green" />
        <ScheduleTile label="Evening" value="8 patients" tone="amber" />
      </div>
      <button className="mt-4 h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] text-base font-medium text-[#253047] transition hover:bg-white">
        View Full Schedule
      </button>
    </InfoPanel>
  )
}

function ActivityCard() {
  const dotTones = {
    green: 'bg-[#26b76a] ring-[#dcf7e8]',
    amber: 'bg-[#f59e0b] ring-[#fff2cf]',
    blue: 'bg-[#147cfb] ring-[#dbeafe]',
  }

  return (
    <InfoPanel
      icon={<FiZap className="h-5 w-5 text-[#23c5c6]" />}
      title="Recent Activity"
      subtitle="Latest patient updates"
    >
      <div className="mt-4 space-y-3">
        {activityRows.map((row) => (
          <div key={row.label} className="grid grid-cols-[12px_1fr] gap-4 text-base">
            <span
              className={`mt-1.5 h-3 w-3 rounded-full ring-4 ${
                dotTones[row.tone as keyof typeof dotTones]
              }`}
            />
            <span>
              <span className="block font-medium text-[#253047]">{row.label}</span>
              <span className="block text-sm text-[#64748b]">{row.time}</span>
            </span>
          </div>
        ))}
      </div>
    </InfoPanel>
  )
}

function PerformanceCard() {
  return (
    <InfoPanel
      icon={<FiArrowUp className="h-5 w-5 text-[#23b26d]" />}
      title="Performance"
      subtitle="This month's metrics"
    >
      <div className="mt-4 space-y-2.5">
        {performanceRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-base">
            <span className="text-[#64748b]">{row.label}</span>
            <span
              className={
                row.tone === 'blue'
                  ? 'font-bold text-[#147cfb]'
                  : 'font-bold text-[#0aa858]'
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <button className="mt-4 h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] text-base font-medium text-[#253047] transition hover:bg-white">
        View Analytics
      </button>
    </InfoPanel>
  )
}

function TimelineHours() {
  const markers = [
    { label: '8 : 00', top: 0 },
    { label: '9 : 00', top: 236 },
    { label: '10 : 00', top: 362 },
    { label: '11 : 00', top: 494 },
  ]

  return (
    <div className="relative text-lg text-[#7a8190]">
      <span className="absolute right-0 top-1 h-[500px] w-px bg-[#1f2933]" />
      {markers.map((marker) => (
        <span key={marker.label}>
          <span className="absolute left-0" style={{ top: marker.top }}>
            {marker.label}
          </span>
          <span
            className="absolute right-[-7px] h-3.5 w-3.5 rounded-full bg-[#111827]"
            style={{ top: marker.top + 4 }}
          />
        </span>
      ))}
    </div>
  )
}

function ExpandedAppointmentCard() {
  return (
    <div className="rounded-md border border-[#dfe3ea] bg-white p-4 shadow-[0_12px_24px_rgba(31,41,55,0.08)]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[#64748b]">Patient</div>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#dfe3ea] text-[#147cfb]"
          aria-label="Open patient"
        >
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 text-sm font-semibold text-black">Bolaji Abdulraheem</div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-semibold text-[#64748b]">Time</div>
          <div className="mt-1 font-semibold text-black">8.30 - 9.00</div>
        </div>
        <div>
          <div className="font-semibold text-[#64748b]">Purpose</div>
          <div className="mt-1 font-semibold text-black">General check-up</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Delete"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#ff3b3b] hover:bg-[#fff1f1]"
          >
            🗑
          </button>
          <button
            type="button"
            aria-label="Edit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#8a37ff] hover:bg-violet-50"
          >
            ✎
          </button>
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-[#8a37ff] px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(138,55,255,0.18)] hover:brightness-105"
        >
          Begin appointment
        </button>
      </div>
    </div>
  )
}

function ScheduleAppointment({
  time,
  name,
  status,
  kind,
  active,
  danger,
}: {
  time: string
  name: string
  status: string
  kind: string
  active?: boolean
  danger?: boolean
}) {
  return (
    <div className="space-y-2">
      <div
        className={`grid h-8 grid-cols-[22px_46px_1fr_70px_24px] items-center gap-2 rounded-md border bg-white px-3 text-xs ${
          active
            ? 'border-[#22c55e] text-[#8a37ff]'
            : danger
              ? 'border-[#ff3b3b]'
              : 'border-[#dfe3ea] text-[#111827]'
        }`}
      >
        {kind === 'video' ? (
          <FiVideo
            className={`h-4 w-4 ${danger ? 'text-[#ff3b3b]' : 'text-[#111827]'}`}
          />
        ) : (
          <FiUsers className="h-4 w-4" />
        )}
        <span className="font-bold">{time}</span>
        <span className="truncate">{name}</span>
        <span className={active ? 'text-[#15803d]' : 'text-[#7a8190]'}>
          {status}
        </span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#dfe3ea] text-[#147cfb]">
          <FiChevronRight className={`h-3.5 w-3.5 ${active ? '-rotate-90' : ''}`} />
        </span>
      </div>

      {active ? <ExpandedAppointmentCard /> : null}
    </div>
  )
}

function UpcomingSchedulePanel() {
  return (
    <aside className="min-w-0 rounded-md border border-[#dfe3ea] bg-white p-5 shadow-[0_18px_32px_rgba(31,41,55,0.08)] sm:p-7">
      <h2 className="text-2xl font-bold text-black">Upcoming schedule</h2>
      <div className="mt-6 grid grid-cols-[64px_1fr] gap-3 sm:mt-9 sm:grid-cols-[74px_1fr] sm:gap-4">
        <TimelineHours />
        <div className="min-w-0 space-y-[9px]">
          {scheduleRows.map((row) => (
            <ScheduleAppointment key={`${row.time}-${row.name}-${row.status}`} {...row} />
          ))}
        </div>
      </div>
      <button className="mt-6 w-full text-right text-base font-bold text-[#8a37ff]">
        View all
      </button>
    </aside>
  )
}

export function DashboardHomePage() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_365px]">
      <section className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <ConsultationCard title="Offline Consultations" value="101" trend="+3.11%" />
          <ConsultationCard
            title="Online Consultations"
            value="96"
            trend="-20.9%"
            variant="red"
          />
          <PatientCard />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <ScheduleSummaryCard />
          <ActivityCard />
          <PerformanceCard />
        </div>
      </section>

      <UpcomingSchedulePanel />
    </div>
  )
}

