from playwright.sync_api import sync_playwright
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'screenshots')
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('http://localhost:4011/#/overview')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, 'footer-fullwidth.png'), full_page=True)
    page.goto('http://localhost:4011/#/opportunities')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, 'footer-opportunities.png'), full_page=True)
    browser.close()
    print("Done")
