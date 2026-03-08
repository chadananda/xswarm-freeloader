from playwright.sync_api import sync_playwright
import os

os.makedirs('screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto('http://localhost:4020', wait_until='networkidle')
    page.wait_for_timeout(2000)

    # Force reveals visible
    page.evaluate("document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))")
    page.wait_for_timeout(500)

    total = page.evaluate("document.body.scrollHeight")
    print(f"Total: {total}")

    # Scroll through page
    for i, pos in enumerate(range(0, total + 900, 900)):
        if pos > total:
            pos = total - 900
        page.evaluate(f"window.scrollTo(0, {pos})")
        page.wait_for_timeout(300)
        page.screenshot(path=f'screenshots/s{i:02d}.png')

    browser.close()
    print("Done")
