import { test, expect, type Page } from '@playwright/test';
test.setTimeout(90_000);
const year = {id:'fy',name:'FY-2026',status:'CLOSING',startDate:'2026-01-01',endDate:'2026-12-20',agmDate:'2026-12-20',_count:{journalEntries:1,contributions:1}};
async function setup(page:Page, handler:(path:string,method:string,body:any)=>unknown){
 const user={id:'admin',name:'Audit Administrator',roles:['SystemAdmin','Secretary'],permissions:['financialYears.view','financialYears.create','financialYears.update','officialsPortal.reports.view','officialsPortal.yearEnd.manage','officialsPortal.yearEnd.approve','officialsPortal.welfareClaims.view','officialsPortal.welfareClaims.approve','officialsPortal.welfareClaims.pay']};
 await page.addInitScript(user=>{localStorage.setItem('clingrow_token','isolated');localStorage.setItem('clingrow_user',JSON.stringify(user));},user);
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace(/^\/api/,'');
  const body=path==='/auth/me'?{user}:handler(path,req.method(),req.postData()?req.postDataJSON():null)??{data:[],types:[],unreadCount:0};
  await route.fulfill({json:body});
 });
}
test('plan next year with start, AGM and savings dates',async({page})=>{
 let saved:any;
 await setup(page,(path,method,body)=>{if(path==='/ledger/financial-years'){if(method==='POST'){saved=body;return {year:{...body,id:'next',status:'PLANNED'}};}return {years:[year]};}});
 await page.goto('/officials/ledger/financial-years');
 await page.getByRole('button',{name:'New Financial Year',exact:true}).click();
 const modal=page.getByRole('dialog');
 await modal.locator('input[type=date]').nth(0).fill('2027-02-01');
 await modal.getByRole('button',{name:'Plan year',exact:true}).click();
 await page.getByRole('dialog').last().getByRole('button',{name:'Plan year',exact:true}).click();
 await expect.poll(()=>saved?.startDate).toBe('2027-02-01');
 expect(saved.agmDate).toBe('2027-12-20');expect(saved.savingsStopDate).toBe('2027-10-31');
 await page.screenshot({path:'../output/ui/financial-years.png',fullPage:true});
});
test('AGM payout requires a reference and clears one member after recording payment',async({page})=>{
 let paid:any=null;
 const member={id:'allocation',memberId:'m',memberName:'Test Member',membershipNumber:'CG1',shareBalance:1000,savingsBalance:4000,allocatedAmount:1100,totalPayout:6100};
 await setup(page,(path,method,body)=>{
  if(path==='/ledger/financial-years')return {years:[year]};
  if(path==='/audit-year-end/year-end/fy')return {data:{financialYear:year,closing:{id:'closing',status:'POSTED'},members:[{...member,...(paid?{paidAt:new Date().toISOString(),paymentReference:paid.paymentReference}:{})}],blockers:[],memberCapital:5000,surplus:1100,totalPayout:6100,paidAmount:paid?6100:0,remainingPayout:paid?0:6100,welfareKitty:2000,availableCash:paid?2000:8100}};
  if(path==='/audit-year-end/allocations/allocation/pay'){paid=body;return {data:{}};}
 });
 await page.goto('/officials/ledger/agm-distribution');
 await expect(page.getByRole('button',{name:'Close year after payouts'})).toBeDisabled();
 await page.screenshot({path:'../output/ui/agm-register.png',fullPage:true});
 await page.getByRole('button',{name:'Record disbursement'}).click();
 const modal=page.getByRole('dialog');await expect(modal.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
 await modal.getByLabel('Payment reference',{exact:true}).fill('BANK-TEST-001');
 await modal.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect.poll(()=>paid?.paymentReference).toBe('BANK-TEST-001');expect(paid.paymentMethod).toBe('BANK');
 await expect(page.getByText('BANK-TEST-001',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Close year after payouts'})).toBeEnabled();
});
test('welfare expense approval precedes recording its payment',async({page})=>{
 const expense:any={id:'e',description:'AGM venue hire',payee:'Meeting venue',amount:500,status:'SUBMITTED',financialYear:year};let payment:any;
 await setup(page,(path,method,body)=>{
  if(path==='/ledger/financial-years')return {years:[year]};
  if(path==='/welfare/expenses')return {data:[expense]};
  if(path==='/welfare/expenses/e/approve'){expense.status='APPROVED';return {data:expense};}
  if(path==='/welfare/expenses/e/pay'){payment=body;expense.status='PAID';expense.paymentReference=body.paymentReference;return {data:expense};}
 });
 await page.goto('/officials/welfare');
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Welfare kitty expenses'})});
 await panel.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
 await panel.getByRole('button',{name:'Record payment',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
 await page.getByLabel('Expense payment reference').fill('KITTY-TEST-001');await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
 await expect.poll(()=>payment?.paymentReference).toBe('KITTY-TEST-001');await expect(panel.getByText('KITTY-TEST-001',{exact:true})).toBeVisible();await expect(panel.getByRole('button',{name:'Record payment',exact:true})).toHaveCount(0);
 await page.screenshot({path:'../output/ui/welfare-expenses.png',fullPage:true});
});

const comparisonMembers = [
 {memberId:'a',memberName:'Early Member',membershipNumber:'CG1',dateJoined:'2026-01-01',capital:10000,currentSurplus:6000,proposedSurplus:10500,difference:4500,proposedTotal:20500},
 {memberId:'b',memberName:'Later Member',membershipNumber:'CG2',dateJoined:'2026-07-01',capital:10000,currentSurplus:6000,proposedSurplus:1500,difference:-4500,proposedTotal:11500},
];
const comparison = {defaultMethod:'CLOSING_CAPITAL',previewOnly:true,status:'COMPLETE',startDate:'2026-01-01',asOf:'2026-12-20',surplus:12000,recordedSurplus:12000,allocatedSurplus:12000,unallocatedSurplus:0,issues:[],assumptions:['Preview only. Closing capital remains the default.'],members:comparisonMembers,
 periods:[{period:'2026-03',surplus:9000,allocated:9000,unallocated:0,members:[{memberId:'a',amount:9000},{memberId:'b',amount:0}]},{period:'2026-08',surplus:3000,allocated:3000,unallocated:0,members:[{memberId:'a',amount:1500},{memberId:'b',amount:1500}]}]};
const comparisonRegister = {financialYear:year,closing:{id:'closing',status:'READY_FOR_AGM'},members:comparisonMembers.map(member=>({...member,shareBalance:10000,savingsBalance:0,allocatedAmount:6000,totalPayout:16000})),blockers:[],memberCapital:20000,surplus:12000,totalPayout:32000,paidAmount:0,remainingPayout:32000,welfareKitty:2000,availableCash:34000};

test('joining-date comparison stays read-only and AGM approval still uses the default register',async({page})=>{
 const mutations:string[]=[];let comparisonReads=0;
 await setup(page,(path,method)=>{
  if(method!=='GET')mutations.push(path);
  if(path==='/ledger/financial-years')return {years:[year]};
  if(path==='/audit-year-end/year-end/fy')return {data:comparisonRegister};
  if(path==='/audit-year-end/year-end/fy/comparison'){comparisonReads++;return {data:comparison};}
  return {data:{}};
 });
 await page.goto('/officials/ledger/agm-distribution');
 await expect(page.getByRole('button',{name:'Compare joining-date method'})).toBeVisible();
 expect(comparisonReads).toBe(0);
 await page.getByRole('button',{name:'Compare joining-date method'}).click();
 const panel=page.getByRole('region',{name:'Distribution comparison'});
 await expect(panel.getByText('Comparison reconciled',{exact:true})).toBeVisible();
 await expect(panel.getByText('KES 10,500.00',{exact:true})).toBeVisible();
 await expect(panel.getByText('KES -4,500.00',{exact:true})).toBeVisible();
 await panel.getByText('Monthly breakdown',{exact:true}).click();
 await panel.getByLabel('Member breakdown',{exact:true}).selectOption('b');
 await expect(panel.getByText('KES 0.00',{exact:true}).first()).toBeVisible();
 const download=page.waitForEvent('download');
 await panel.getByRole('button',{name:'Export comparison CSV'}).click();
 expect((await download).suggestedFilename()).toBe('distribution-comparison-2026-12-20.csv');
 expect(mutations).toEqual([]);
 await page.getByRole('button',{name:'Record AGM approval',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('current closing-capital distribution register');
 await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
 await expect.poll(()=>mutations).toEqual(['/audit-year-end/year-end/closing/approve']);
 await expect.poll(()=>comparisonReads).toBeGreaterThan(1);
});

test('incomplete comparison withholds proposed amounts while leaving the current register available',async({page})=>{
 await setup(page,path=>{
  if(path==='/ledger/financial-years')return {years:[year]};
  if(path==='/audit-year-end/year-end/fy')return {data:comparisonRegister};
  if(path==='/audit-year-end/year-end/fy/comparison')return {data:{...comparison,status:'INCOMPLETE',issues:['Fine payment has no original fine date.'],unallocatedSurplus:9000,members:comparisonMembers.map(member=>({...member,proposedSurplus:null,difference:null,proposedTotal:null}))}};
 });
 await page.goto('/officials/ledger/agm-distribution');
 await page.getByRole('button',{name:'Compare joining-date method'}).click();
 const panel=page.getByRole('region',{name:'Distribution comparison'});
 await expect(panel.getByText('Comparison incomplete — review required',{exact:true})).toBeVisible();
 await expect(panel.getByText('Fine payment has no original fine date.',{exact:true})).toBeVisible();
 await expect(panel.getByText('Unavailable',{exact:true})).toHaveCount(6);
 await expect(page.getByRole('button',{name:'Record AGM approval',exact:true})).toBeEnabled();
 await expect(panel.getByText('KES 10,500.00',{exact:true})).toHaveCount(0);
});

test('comparison failure can be retried without blocking the default distribution',async({page})=>{
 let attempts=0;
 await setup(page,path=>{
  if(path==='/ledger/financial-years')return {years:[year]};
  if(path==='/audit-year-end/year-end/fy')return {data:comparisonRegister};
  if(path==='/audit-year-end/year-end/fy/comparison')return {data:comparison};
 });
 await page.route('**/api/audit-year-end/year-end/fy/comparison',async route=>{
  attempts++;
  if(attempts===1)await route.fulfill({status:500,json:{error:'Comparison unavailable'}});
  else await route.fulfill({json:{data:comparison}});
 });
 await page.goto('/officials/ledger/agm-distribution');
 await page.getByRole('button',{name:'Compare joining-date method'}).click();
 const panel=page.getByRole('region',{name:'Distribution comparison'});
 await expect(panel.getByRole('alert')).toContainText('Comparison unavailable');
 await expect(page.getByRole('button',{name:'Record AGM approval',exact:true})).toBeEnabled();
 await panel.getByRole('button',{name:'Retry comparison'}).click();
 await expect(panel.getByText('Comparison reconciled',{exact:true})).toBeVisible();
 expect(attempts).toBe(2);
});

