import clsx from 'clsx'
import { FiCheck } from 'react-icons/fi'
import { ONBOARDING_STEPS, type OnboardingStep } from '../constants'

type OnboardingStepperProps = {
  activeStep: OnboardingStep
  profileDone: boolean
  documentsDone: boolean
  onStepClick: (step: OnboardingStep) => void
  canOpenDocuments: boolean
  canOpenReview: boolean
}

export function OnboardingStepper({
  activeStep,
  profileDone,
  documentsDone,
  onStepClick,
  canOpenDocuments,
  canOpenReview,
}: OnboardingStepperProps) {
  const stepDone: Record<OnboardingStep, boolean> = {
    profile: profileDone,
    documents: documentsDone,
    review: profileDone && documentsDone,
  }

  const stepEnabled: Record<OnboardingStep, boolean> = {
    profile: true,
    documents: canOpenDocuments,
    review: canOpenReview,
  }

  return (
    <nav
      aria-label="Onboarding progress"
      className="rounded-[16px] border border-[#e6e8ee] bg-white px-4 py-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:px-8"
    >
      <ol className="flex w-full list-none items-start p-0">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = stepDone[step.id]
          const active = activeStep === step.id
          const enabled = stepEnabled[step.id]
          const prevStep = ONBOARDING_STEPS[index - 1]
          const prevDone = prevStep ? stepDone[prevStep.id] : false
          const isLast = index === ONBOARDING_STEPS.length - 1

          return (
            <li
              key={step.id}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center',
                !enabled && 'opacity-45',
              )}
            >
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={clsx(
                      'h-[3px] flex-1 rounded-full transition-colors duration-300',
                      prevDone ? 'bg-[#8a37ff]' : 'bg-[#e6e8ee]',
                    )}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && onStepClick(step.id)}
                  aria-current={active ? 'step' : undefined}
                  className={clsx(
                    'relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a37ff]',
                    done && 'bg-[#8a37ff] text-white shadow-[0_4px_14px_rgba(138,55,255,0.35)]',
                    !done &&
                      active &&
                      'border-[3px] border-[#8a37ff] bg-white text-[#8a37ff]',
                    !done &&
                      !active &&
                      'border-2 border-[#e6e8ee] bg-white text-[#94a3b8]',
                    enabled && !active && 'hover:border-[#c4b5fd]',
                    !enabled && 'cursor-not-allowed',
                  )}
                >
                  {done ? <FiCheck className="h-5 w-5" strokeWidth={3} /> : index + 1}
                </button>

                {!isLast && (
                  <div
                    className={clsx(
                      'h-[3px] flex-1 rounded-full transition-colors duration-300',
                      done ? 'bg-[#8a37ff]' : 'bg-[#e6e8ee]',
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              <button
                type="button"
                disabled={!enabled}
                onClick={() => enabled && onStepClick(step.id)}
                className={clsx(
                  'mt-3 w-full max-w-[140px] text-center transition',
                  enabled ? 'cursor-pointer' : 'cursor-not-allowed',
                )}
              >
                <span
                  className={clsx(
                    'block text-sm font-bold leading-tight',
                    active ? 'text-[#8a37ff]' : 'text-black',
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={clsx(
                    'mt-0.5 block text-xs leading-tight',
                    done
                      ? 'text-emerald-600'
                      : active
                        ? 'text-[#8a37ff]'
                        : 'text-[#878787]',
                  )}
                >
                  {done ? 'Complete' : active ? 'In progress' : 'Pending'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
