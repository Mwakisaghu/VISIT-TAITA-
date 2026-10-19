// The frame around sign-in and sign-up: a green panel in the Passport's visual language (a faint emblem, a ridge line) beside the form. On a phone the panel shrinks to a slim banner.
export default function AuthShell({ headline, sub, children }: { headline: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4.6rem)] lg:grid-cols-[5fr_6fr]">
      <div className="relative flex flex-col overflow-hidden bg-canopy-deep px-6 pt-5 text-ochre-light lg:px-10 lg:pt-12">
        <svg className="pointer-events-none absolute -right-[6%] top-[18%] hidden w-[78%] max-w-[420px] text-ochre-light opacity-[.13] lg:block" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="84" strokeWidth="1" /><path d="M40 150H160" /><path d="M100 150V98M100 120L74 94M100 112L126 86M100 100L84 80" /><path d="M52 84Q100 36 148 84" /><path d="M64 78Q100 46 136 78" opacity=".6" /><circle cx="140" cy="48" r="9" />
        </svg>
        <div className="relative mt-auto max-w-sm pb-3 lg:pb-8">
          <p className="font-display text-[1.45rem] font-semibold leading-tight text-parchment lg:text-[2.2rem]">{headline}</p>
          {sub && <p className="mt-2 hidden font-body text-base text-parchment/85 lg:block">{sub}</p>}
        </div>
        <svg className="-mx-6 h-12 w-[calc(100%+3rem)] opacity-55 lg:-mx-10 lg:h-28 lg:w-[calc(100%+5rem)]" viewBox="0 0 400 120" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
          <path d="M0 100L35 84L70 94L110 62L150 88L190 70L235 98L275 52L315 84L355 68L400 86" /><path d="M0 112L50 100L100 108L160 92L230 110L300 96L400 108" opacity=".6" />
        </svg>
      </div>
      <div className="flex items-center justify-center px-5 py-9 lg:px-8 lg:py-14"><div className="w-full max-w-[440px]">{children}</div></div>
    </div>
  );
}
