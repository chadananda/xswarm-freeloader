"""Screenshot at mobile, tablet, and desktop widths."""
from playwright.sync_api import sync_playwright
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'screenshots')
os.makedirs(OUT, exist_ok=True)

viewports = [
    ('mobile', 375, 812),
    ('tablet', 768, 1024),
    ('desktop', 1280, 900),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for name, w, h in viewports:
        page = browser.new_page(viewport={'width': w, 'height': h})
        # Overview
        page.goto('http://localhost:4011/#/overview')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, f'resp-{name}-overview.png'), full_page=True)
        # Onboarding
        page.goto('http://localhost:4011/#/onboarding')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, f'resp-{name}-onboarding.png'), full_page=True)
        # Settings
        page.goto('http://localhost:4011/#/settings')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, f'resp-{name}-settings.png'), full_page=True)
        page.close()
    browser.close()
    print("Done")
