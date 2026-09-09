import { test } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('entrena + mas', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`,
    { headers:{'apikey':ANON,'Content-Type':'application/json'}, data:{email:'beatrizar79@gmail.com',password:'Forge2024!'} })
  const auth = await res.json()
  await page.goto(BASE)
  await page.evaluate(({t,r,u,k})=>localStorage.setItem(k,JSON.stringify({access_token:t,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:r,user:u})),{t:auth.access_token,r:auth.refresh_token,u:auth.user,k:KEY})
  await page.goto(`${BASE}/portal`,{waitUntil:'networkidle',timeout:30000})
  await page.waitForTimeout(5000)

  // Captura Entrena con días colapsados
  await page.evaluate(() => { const btns = Array.from(document.querySelectorAll('nav button')); btns.find(b=>b.textContent?.includes('Entrena'))?.click() })
  await page.waitForTimeout(1500)
  await page.screenshot({path:'/tmp/entrena-colapsado.png'})

  // Expandir el Día 1
  await page.evaluate(() => { const btns = Array.from(document.querySelectorAll('button')); btns.find(b=>b.textContent?.includes('Día 1'))?.click() })
  await page.waitForTimeout(800)
  await page.screenshot({path:'/tmp/entrena-expandido.png',fullPage:true})

  // Captura Más
  await page.evaluate(() => { const btns = Array.from(document.querySelectorAll('nav button')); btns.find(b=>b.textContent?.includes('Más'))?.click() })
  await page.waitForTimeout(1000)
  await page.screenshot({path:'/tmp/mas.png',fullPage:true})

  await ctx.close()
})
