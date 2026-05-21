import React from "react";

type Feature = { icon: React.ReactNode; text: string };

const AuthLeftPanel: React.FC<{
  heading: React.ReactNode;
  sub: string;
  highlights?: string[];
  features?: Feature[];
}> = ({ heading, sub, highlights = [], features = [] }) => {
  const panelItems =
    features.length > 0
      ? features
      : highlights.map((text) => ({
          icon: <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />,
          text,
        }));

  return (
    <aside className="relative hidden h-full min-h-0 w-1/2 shrink-0 overflow-hidden bg-primary-900 text-white lg:flex">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='7' cy='7' r='1.2'/%3E%3Ccircle cx='27' cy='7' r='1.2'/%3E%3Ccircle cx='47' cy='7' r='1.2'/%3E%3Ccircle cx='7' cy='27' r='1.2'/%3E%3Ccircle cx='27' cy='27' r='1.2'/%3E%3Ccircle cx='47' cy='27' r='1.2'/%3E%3Ccircle cx='7' cy='47' r='1.2'/%3E%3Ccircle cx='27' cy='47' r='1.2'/%3E%3Ccircle cx='47' cy='47' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-y-0 right-0 w-px bg-white/15" />
      <div className="absolute left-12 top-12 h-28 w-28 rounded-full border border-white/10" />
      <div className="absolute bottom-14 right-16 h-40 w-40 rounded-full border border-white/10" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col px-12 py-12 xl:px-16 xl:py-14">
        <div className="flex items-center gap-4">
          <div className="grid h-22 w-22 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <img src="/logo.png" alt="Clin-Grow Welfare Group logo" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-tight">Clin-Grow</p>
            <p className="mt-1 text-base font-semibold text-white/68">Welfare Group</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-lg">
            <p className="mb-5 text-sm font-extrabold text-amber-400">Together we rise</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">{heading}</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">{sub}</p>
          </div>

          {panelItems.length > 0 && (
            <div className="mt-10 max-w-md border-t border-white/15 pt-7">
              <div className="space-y-4">
                {panelItems.map((item, index) => (
                  <div key={`${item.text}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-white/74">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white/80">
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-white/30 pt-4 text-center text-[0.8rem] font-medium text-white/80">
          © {new Date().getFullYear()} Clin-Grow Welfare Group
        </div>
      </div>
    </aside>
  );
};

export default AuthLeftPanel;
