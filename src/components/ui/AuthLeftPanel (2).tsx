import type { ReactNode } from 'react';

type AuthLeftPanelProps = {
  heading: ReactNode;
  sub: string;
  highlights: string[];
  footerOrg?: string;
};

export default function AuthLeftPanel({
  heading,
  sub,
  highlights,
  footerOrg = 'Clin-Grow Welfare',
}: AuthLeftPanelProps) {
  return (
    <div
      className='relative hidden lg:flex lg:w-1/2 lg:shrink-0 flex-col min-h-screen overflow-hidden'
      style={{
        background: 'linear-gradient(165deg, #102a4d 0%, #15345f 45%, #1567ad 100%)',
      }}
    >
      <div
        className='absolute inset-0 opacity-[0.04]'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='7' cy='7' r='1.2'/%3E%3Ccircle cx='27' cy='7' r='1.2'/%3E%3Ccircle cx='47' cy='7' r='1.2'/%3E%3Ccircle cx='7' cy='27' r='1.2'/%3E%3Ccircle cx='27' cy='27' r='1.2'/%3E%3Ccircle cx='47' cy='27' r='1.2'/%3E%3Ccircle cx='7' cy='47' r='1.2'/%3E%3Ccircle cx='27' cy='47' r='1.2'/%3E%3Ccircle cx='47' cy='47' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className='absolute -bottom-24 -right-24 w-72 h-72 rounded-full border border-white/8 pointer-events-none' />

      <div className='relative flex flex-col flex-1 max-w-xl mx-auto w-full px-12 xl:px-16 py-12 xl:py-14'>
        <div className='mb-14'>
          <img src='/logo.png' alt='Clin-Grow Welfare Group' className='w-28 h-auto' />
        </div>

        <div className='flex-1 flex flex-col justify-center'>
          <h1 className='text-2xl xl:text-[1.75rem] font-semibold tracking-tight text-white leading-snug'>
            {heading}
          </h1>
          <p className='mt-4 text-sm xl:text-[0.95rem] text-white/65 leading-relaxed max-w-md'>{sub}</p>

          <ul className='mt-10 space-y-3 border-t border-white/15 pt-8'>
            {highlights.map((line) => (
              <li key={line} className='flex gap-3 text-sm text-white/70 leading-relaxed'>
                <span className='mt-2 h-px w-3 shrink-0 bg-white/40' aria-hidden='true' />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 text-center text-[0.8rem] font-medium text-white/80 border-t border-white/30 pt-4">
          © {new Date().getFullYear()} {footerOrg}
        </div>
      </div>
    </div>
  );
}
