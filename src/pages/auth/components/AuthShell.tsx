import type { ReactNode } from 'react'
import { FiCalendar, FiSearch, FiX } from 'react-icons/fi'
import loginDoctorImg from '../../../assets/login-doctor.png'
import loginFrameImg from '../../../assets/login-frame.png'

type AuthShellProps = {
  children: ReactNode
  onClose: () => void
}

export function AuthShell({ children, onClose }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <div className="relative min-h-screen w-full overflow-hidden">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="fixed right-6 top-6 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-black transition hover:bg-black/5"
        >
          <FiX className="h-6 w-6" />
        </button>

        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[710px_minmax(0,1fr)]">
          <aside className="relative hidden min-h-screen overflow-hidden bg-[#8a37ff] lg:block">
            <img
              src={loginFrameImg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />

            <img
              src={loginDoctorImg}
              alt=""
              className="absolute bottom-0 left-[-4%] w-[108%] max-w-none object-contain"
            />

            <div className="relative h-full text-white">
              <div className="absolute left-[18px] top-[185px] rounded-xl bg-black/50 px-[15px] py-[15px] shadow-[0_5px_10px_rgba(84,185,237,0.1)] backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <FiSearch className="h-[52px] w-[52px] shrink-0 stroke-[1.7]" />
                  <div>
                    <div className="text-[22px] font-medium leading-tight">
                      Well qualified doctors
                    </div>
                    <div className="text-[20px] leading-normal text-white/60">
                      Treat with atmost care
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-[263px] top-[677px] rounded-[15px] bg-black/50 px-[18px] py-[18px] shadow-[0_6px_12px_rgba(84,185,237,0.1)] backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <FiCalendar className="h-[62px] w-[62px] shrink-0 stroke-[1.6]" />
                  <div>
                    <div className="text-[27px] font-medium leading-tight">
                      Book an appointment
                    </div>
                    <div className="text-[24px] leading-normal text-white/60">
                      Call/text/video/inperson
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex items-center justify-center px-6 py-16 lg:px-12">
            <div className="w-full max-w-[520px]">{children}</div>
          </section>
        </div>
      </div>
    </div>
  )
}
