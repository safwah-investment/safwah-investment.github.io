"""v3 browser tests: assistant, advanced roles, persistence, responsive layout."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_checks import ROOT, change
from playwright.sync_api import sync_playwright
import re

def boot_v3(browser,width=1280):
 page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(ROOT/'index.html').read_text()
 html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S|re.I)
 html=re.sub(r'<link\s+[^>]*href="(?:https://|styles\.css|partnerships\.css|advisor\.css)[^>]*>','',html)
 page.set_content(html)
 page.evaluate("""() => {let store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}})}""")
 for file in ['styles.css','partnerships.css','advisor.css']:page.add_style_tag(content=(ROOT/file).read_text())
 for file in ['core.js','app.js','partnership-core.js','word-export.js','partnerships.js','advisor-config.js','advisor-core.js','advisor-ui.js']:page.add_script_tag(content=(ROOT/file).read_text())
 return page,errors

def test_advisor(browser):
 page,errors=boot_v3(browser)
 assert page.locator('#sf-audit-board').count()==1
 page.locator('#sf-assistant-toggle').click()
 assert page.locator('#sf-assistant-panel').is_visible()
 page.locator('[data-question="افحص المخاطر والفجوات في ملفي"]').click()
 page.locator('.sf-ai-msg.sf-ai-bot').last.wait_for()
 text=page.locator('.sf-ai-msg.sf-ai-bot').last.inner_text()
 assert 'سجل ملاك' in text,text
 page.locator('[data-question="ما المراجع النظامية؟"]').click()
 assert page.locator('.sf-ai-sources a').count()>=2
 page.locator('#sf-ai-close').click()
 assert not page.locator('#sf-assistant-panel').is_visible()
 assert not errors,errors
 page.close()

def test_advanced_governance(browser):
 page,errors=boot_v3(browser)
 page.locator('.nav-link[data-tab=partnerships]').click()
 page.locator('[data-ps-action=sample]').click()
 page.locator('[data-ps-action=step][data-id=governance]').click()
 page.locator('[data-ps-action=add-detail][data-type=rolesDetailed]').click()
 assert page.locator('[data-detail=rolesDetailed][data-field=title]').count()==1
 el=page.locator('[data-detail=rolesDetailed][data-field=title]');el.fill('مدير مستقل');el.dispatch_event('change')
 page.locator('.ps-advanced-block').nth(1).locator('summary').click()
 page.locator('[data-ps-action=add-detail][data-type=rightsDetailed]').click()
 # Need expand because a state rerender closes details.
 if not page.locator('.ps-advanced-block').nth(1).evaluate('(e)=>e.open'):
  page.locator('.ps-advanced-block').nth(1).locator('summary').click()
 el=page.locator('[data-detail=rightsDetailed][data-field=scope]');el.fill('علامة صفوة');el.dispatch_event('change')
 page.locator('.ps-advanced-block').nth(2).locator('summary').click()
 page.locator('[data-ps-action=add-detail][data-type=authoritiesDetailed]').click()
 if not page.locator('.ps-advanced-block').nth(2).evaluate('(e)=>e.open'):
  page.locator('.ps-advanced-block').nth(2).locator('summary').click()
 el=page.locator('[data-detail=authoritiesDetailed][data-field=decision]');el.fill('الموافقة على مشتريات');el.dispatch_event('change')
 stored=page.evaluate('window.SafwahApp.getSnapshot().partnerships[0]')
 assert len(stored['rolesDetailed'])==1 and stored['rolesDetailed'][0]['title']=='مدير مستقل'
 assert stored['rightsDetailed'][0]['scope']=='علامة صفوة'
 assert stored['authoritiesDetailed'][0]['decision']=='الموافقة على مشتريات'
 page.locator('[data-ps-action=step][data-id=execution]').click()
 report=page.locator('.ps-report-preview').inner_text()
 for term in ['مدير مستقل','علامة صفوة','الموافقة على مشتريات']:assert term in report,term
 assert not errors,errors
 page.close()

def test_mobile_advisor(browser):
 page,errors=boot_v3(browser,320)
 page.locator('#sf-assistant-toggle').click()
 assert page.locator('#sf-assistant-panel').is_visible()
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 assert not errors,errors
 page.close()

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for t in [test_advisor,test_advanced_governance,test_mobile_advisor]:
   t(browser);print('PASS',t.__name__)
  browser.close()
 print('BROWSER_V3_PASSED')
