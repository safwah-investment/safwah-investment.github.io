"""Automated DOM-level smoke tests in isolated Chromium (no network required).
Run: python tests/browser_checks.py (requires playwright and Chromium).
"""
from pathlib import Path
import re, json, zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

def boot(browser,width=1280,height=850):
    page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S|re.I)
    html=re.sub(r'<link\s+[^>]*href="(?:https://|styles\.css|partnerships\.css)[^>]*>','',html)
    page.set_content(html,wait_until='domcontentloaded')
    page.evaluate("""() => {let store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}})}""")
    for f in ['styles.css','partnerships.css']: page.add_style_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    for f in ['core.js','app.js','partnership-core.js','word-export.js','partnerships.js']:page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    return page,errors

def change(page,selector,val):
    e=page.locator(selector).first;e.fill(str(val));e.dispatch_event('change')

def test_portfolio(browser):
    page,errors=boot(browser)
    assert page.locator('.nav-link[data-tab=partnerships]').count()==1
    page.locator('.nav-link[data-tab=partnerships]').click()
    assert page.locator('.ps-type-btn').count()==6
    page.locator('[data-ps-action=sample]').click()
    assert page.locator('.ps-workspace-header').count()==1
    assert len(page.evaluate('window.SafwahApp.getSnapshot().partnerships'))==1
    page.locator('[data-ps-action=step][data-id=governance]').click()
    page.locator('[data-ps-action=suggest-terms]').click()
    assert page.locator('.ps-term-card').count()==10
    assert page.locator('[data-term=finance][data-field=value]').input_value()!=''
    page.locator('[data-ps-action=step][data-id=execution]').click()
    assert page.locator('.ps-report-preview').count()==1
    assert len(errors)==0,errors
    page.close()

def test_investment(browser):
    page,errors=boot(browser)
    page.locator('.nav-link[data-tab=partnerships]').click()
    page.locator('[data-ps-action=new][data-id=existing]').click()
    page.locator('[data-ps-action=step][data-id=parties]').click()
    assert page.locator('.ps-party-card').count()==3
    for i,name in enumerate(['مستثمر أصلي أ','مستثمر أصلي ب']):
        target=page.locator('[data-party][data-field=name]').nth(i)
        target.fill(name);target.dispatch_event('change')
    for i,val in enumerate([60,40]):
        target=page.locator('[data-party][data-field=currentPct]').nth(i)
        target.fill(str(val));target.dispatch_event('change')
    page.locator('[data-ps-action=step][data-id=calculation]').click()
    change(page,'[data-investor=preMoney]',2000000)
    change(page,'[data-investor=cashIn]',500000)
    change(page,'[data-investor=cashOut]',250000)
    first=page.locator('[data-investor=sellerId]')
    first.select_option(index=1)
    page.locator('.ps-result-row').first.wait_for()
    lines=page.locator('.ps-result-row').all_inner_texts()
    assert len(lines)==3,lines
    assert any('30%' in t for t in lines),lines
    page.locator('[data-ps-action=copy-calc]').click()
    vals=[float(x.get_attribute('value')) for x in page.locator('[data-final-share]').all()]
    assert abs(sum(vals)-100)<1e-6,vals
    assert len(errors)==0,errors
    page.close()

def test_mudaraba(browser):
    page,errors=boot(browser)
    page.locator('.nav-link[data-tab=partnerships]').click()
    page.locator('[data-ps-action=new][data-id=mudaraba]').click()
    page.locator('[data-ps-action=step][data-id=parties]').click()
    change(page,'[data-party][data-field=name]', 'رب المال')
    page.locator('[data-party][data-field=role]').nth(0).select_option('financier')
    # Rerenders after each change
    change(page,'[data-party][data-field=cash]', 1000000)
    n=page.locator('[data-party][data-field=name]').nth(1);n.fill('المضارب');n.dispatch_event('change')
    page.locator('[data-party][data-field=role]').nth(1).select_option('operator')
    p=page.locator('[data-party][data-field=profitPct]').nth(0);p.fill('40');p.dispatch_event('change')
    p=page.locator('[data-party][data-field=profitPct]').nth(1);p.fill('60');p.dispatch_event('change')
    page.locator('[data-ps-action=step][data-id=calculation]').click()
    lines=page.locator('.ps-result-row').all_inner_texts()
    assert len(lines)==2,lines
    assert '40%' in lines[0] and '60%' in lines[1],lines
    assert page.locator('[data-ps-action=copy-calc]').count()==0
    assert len(errors)==0,errors
    page.close()

def test_owner_integration_and_word(browser):
    page,errors=boot(browser)
    page.locator('.nav-link[data-tab=partnerships]').click()
    page.locator('[data-ps-action=new][data-id=operating]').click()
    page.locator('[data-ps-action=step][data-id=parties]').click()
    change(page,'[data-party][data-field=name]','أ')
    p=page.locator('[data-party][data-field=name]').nth(1);p.fill('ب');p.dispatch_event('change')
    change(page,'[data-party][data-field=cash]',500000)
    p=page.locator('[data-party][data-field=cash]').nth(1);p.fill('500000');p.dispatch_event('change')
    page.locator('[data-ps-action=step][data-id=calculation]').click()
    page.locator('[data-ps-action=copy-calc]').click()
    page.locator('[data-ps-action=step][data-id=execution]').click()
    with page.expect_download() as d:page.locator('[data-ps-action=export-word]').first.click()
    path=ROOT/'tests'/'word-smoke.docx';d.value.save_as(path)
    with zipfile.ZipFile(path) as z:
        assert {'word/document.xml','[Content_Types].xml','_rels/.rels'}.issubset(z.namelist())
        assert 'صفوة' in z.read('word/document.xml').decode()
    assert len(errors)==0,errors
    page.close()

def test_viewports(browser):
    page,errors=boot(browser,width=390,height=844)
    page.locator('.nav-link[data-tab=partnerships]').click()
    page.locator('[data-ps-action=sample]').click()
    for width in (320,390,768,1280):
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),width
    assert len(errors)==0,errors
    page.close()

if __name__=='__main__':
 with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for test in (test_portfolio,test_investment,test_mudaraba,test_owner_integration_and_word,test_viewports):
        test(browser);print('PASS',test.__name__)
    browser.close()
 print('BROWSER_CHECKS_PASSED')
