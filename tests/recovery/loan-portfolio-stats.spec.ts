import { test, expect } from '@playwright/test';
test.setTimeout(90_000);
test('portfolio stats remain complete across pages and reflect all matching search records',async({page})=>{
 const user={id:'admin',name:'Test Treasurer',roles:['Secretary'],permissions:['officialsPortal.loans.view']};
 await page.addInitScript(user=>{localStorage.setItem('clingrow_token','isolated');localStorage.setItem('clingrow_user',JSON.stringify(user));},user);
 let requestedPage=1;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let body:any={data:[],unreadCount:0};
  if(url.pathname.endsWith('/auth/me'))body={user};
  if(url.pathname.endsWith('/loans')){
   requestedPage=Number(url.searchParams.get('page')??1);const searched=!!url.searchParams.get('search');
   body={data:[{id:'l'+requestedPage,loanNumber:searched?'LN-CLOSED':'LN-PAGE-'+requestedPage,member:{name:searched?'Hellen Ochieng':'Page '+requestedPage,membershipNumber:'CG1'},applicationDate:'2026-07-01',disbursedAt:'2026-07-01',approvedAmount:1000,requestedAmount:1000,totalOutstanding:searched?0:requestedPage*10,status:searched?'CLOSED':'ACTIVE',interestCharges:[],repayments:[],penalties:[]}],meta:{page:requestedPage,pageSize:20,total:searched?1:87,totalPages:searched?1:5},summary:searched?{total:1,totalOutstanding:0,activeCount:0,approvalQueue:0,atRisk:0}:{total:87,totalOutstanding:628612.12,activeCount:15,approvalQueue:1,atRisk:8}};
  }
  await route.fulfill({json:body});
 });
 await page.goto('/officials/loans');
 await expect(page.getByText('KES 628,612.12',{exact:true})).toBeVisible();
 await expect(page.getByText('Full disbursed portfolio balance',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect.poll(()=>requestedPage).toBe(2);
 await expect(page.getByText('LN-PAGE-2',{exact:true})).toBeVisible();
 await expect(page.getByText('KES 628,612.12',{exact:true})).toBeVisible();
 await page.getByPlaceholder('Search member or loan number').fill('Hellen');
 await expect(page.getByText('All matching disbursed loans',{exact:true})).toBeVisible();
 await expect(page.getByText('LN-CLOSED',{exact:true})).toBeVisible();
 await expect(page.getByText('KES 628,612.12',{exact:true})).toHaveCount(0);
 await expect.poll(()=>requestedPage).toBe(1);
});
