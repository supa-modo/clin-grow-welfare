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

