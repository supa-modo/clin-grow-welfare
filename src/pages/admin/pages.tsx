import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');

  const load = async (nextPage = page, nextSearch = search) => {
    const { data } = await api.get('/members', { params: { page: nextPage, pageSize: 10, search: nextSearch } });
    setMembers(data.data ?? []);
    setMeta(data.meta ?? null);
    setPage(nextPage);
  };

  useEffect(() => {
    void load(1, '');
  }, []);

  return <div className='space-y-4'>
    <div className='bg-white p-4 rounded shadow'>
      <h2 className='font-semibold mb-2'>Create Member</h2>
      <div className='flex gap-2'>
        <input className='border rounded px-3 py-2 flex-1' placeholder='Full name' value={name} onChange={(e)=>setName(e.target.value)} />
        <button className='bg-sky-600 text-white px-4 rounded' onClick={async ()=>{if (!name) return; await api.post('/members',{name}); setName(''); await load(1, search);}}>Add</button>
      </div>
    </div>
    <div className='bg-white p-4 rounded shadow'>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='font-semibold'>Members</h2>
        <div className='flex gap-2'>
          <input className='border rounded px-2 py-1 text-sm' placeholder='Search members' value={search} onChange={(e)=>setSearch(e.target.value)} />
          <button className='border rounded px-2 text-sm' onClick={()=>void load(1, search)}>Filter</button>
        </div>
      </div>
      <table className='w-full text-sm'>
        <thead><tr><th className='text-left'>No</th><th className='text-left'>Name</th><th>Status</th><th></th></tr></thead>
        <tbody>{members.map((m)=><tr key={m.id}><td>{m.membershipNumber}</td><td>{m.name}</td><td>{m.status}</td><td>{m.status==='PENDING' && <button onClick={async()=>{await api.post(`/members/${m.id}/approve`); await load(page, search);}} className='text-sky-600'>Approve</button>}</td></tr>)}</tbody>
      </table>
      <div className='mt-3 flex justify-between text-sm'>
        <span>{meta ? `Page ${meta.page} of ${meta.totalPages} (${meta.total})` : ''}</span>
        <div className='space-x-2'>
          <button disabled={!meta?.hasPrev} className='border px-2 rounded disabled:opacity-50' onClick={()=>void load(page-1, search)}>Prev</button>
          <button disabled={!meta?.hasNext} className='border px-2 rounded disabled:opacity-50' onClick={()=>void load(page+1, search)}>Next</button>
        </div>
      </div>
    </div>
  </div>;
}

export function LedgerPage() {
  const [years, setYears] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    void Promise.all([
      api.get('/ledger/financial-years'),
      api.get('/ledger/funds'),
      api.get('/ledger/accounts'),
      api.get('/ledger/journals', { params: { page: 1, pageSize: 20 } })
    ]).then(([y, f, a, j]) => {
      setYears(y.data.years ?? []);
      setFunds(f.data.funds ?? []);
      setAccounts(a.data.accounts ?? []);
      setJournals(j.data.data ?? []);
      setMeta(j.data.meta ?? null);
    });
  }, []);

  return <div className='space-y-4'>
    <div className='grid md:grid-cols-4 gap-3'>{[
      ['Financial Years', years.length],
      ['Funds', funds.length],
      ['Ledger Accounts', accounts.length],
      ['Journals', meta?.total ?? journals.length]
    ].map(([label, value]) => <div key={String(label)} className='bg-white rounded shadow p-4'><p className='text-xs text-slate-500'>{label}</p><p className='text-2xl font-bold'>{value as any}</p></div>)}</div>
    <div className='bg-white rounded shadow p-4'>
      <h3 className='font-semibold mb-2'>Recent Journal Entries</h3>
      <table className='w-full text-sm'>
        <thead><tr><th className='text-left'>Entry No</th><th className='text-left'>Description</th><th>Status</th><th>Lines</th></tr></thead>
        <tbody>{journals.map((j)=><tr key={j.id}><td>{j.entryNo}</td><td>{j.description}</td><td>{j.status}</td><td>{j.lines?.length ?? 0}</td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function ContributionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState(250);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = async (nextPage = page) => {
    const { data } = await api.get('/contributions', { params: { page: nextPage, pageSize: 15, search } });
    setRows(data.data ?? []);
    setMeta(data.meta ?? null);
    setPage(nextPage);
  };

  useEffect(() => { void load(); }, []);

  return <div className='space-y-4'>
    <div className='bg-white p-4 rounded shadow'>
      <h2 className='font-semibold mb-2'>Post Contribution</h2>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
        <input className='border rounded px-2 py-2' placeholder='Member ID' value={memberId} onChange={e=>setMemberId(e.target.value)} />
        <select className='border rounded px-2 py-2' id='ct'><option>WELFARE_KITTY</option><option>SHARE_CAPITAL</option><option>WEEKLY_SAVINGS</option><option>REGISTRATION</option></select>
        <input className='border rounded px-2 py-2' type='number' value={amount} onChange={e=>setAmount(Number(e.target.value))} />
        <button className='bg-sky-600 text-white rounded' onClick={async()=>{const ct=(document.getElementById('ct') as HTMLSelectElement).value; await api.post('/contributions',{memberId,contributionType:ct,amount,periodDate:new Date().toISOString(),paymentMethod:'MPESA'}); await load(1);}}>Post</button>
      </div>
    </div>
    <div className='bg-white p-4 rounded shadow'>
      <div className='flex justify-between mb-2'>
        <h2 className='font-semibold'>Recent Contributions</h2>
        <div className='flex gap-2'>
          <input className='border rounded px-2 py-1 text-sm' placeholder='Search receipt/member' value={search} onChange={e=>setSearch(e.target.value)} />
          <button className='border rounded px-2 text-sm' onClick={()=>void load(1)}>Filter</button>
        </div>
      </div>
      <ul className='text-sm mt-3 space-y-1'>{rows.map(r=><li key={r.id}>{r.receiptNo} - {r.member?.name} - {r.contributionType} - {r.amount}</li>)}</ul>
      <div className='mt-3 flex justify-between text-sm'>
        <span>{meta ? `Page ${meta.page} of ${meta.totalPages}` : ''}</span>
        <div className='space-x-2'>
          <button disabled={!meta?.hasPrev} className='border px-2 rounded disabled:opacity-50' onClick={()=>void load(page-1)}>Prev</button>
          <button disabled={!meta?.hasNext} className='border px-2 rounded disabled:opacity-50' onClick={()=>void load(page+1)}>Next</button>
        </div>
      </div>
    </div>
  </div>;
}
