export const Placeholder = ({ title }: { title: string }) => (
  <div className='rounded-xl border border-ink-100 bg-white p-6 shadow-sm'>
    <h2 className='text-xl font-semibold text-ink-900'>{title}</h2>
    <p className='mt-2 text-sm text-ink-500'>Planned for upcoming phases.</p>
  </div>
);
