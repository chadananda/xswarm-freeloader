"""Test hamburger menu opens/closes on mobile viewport."""
from playwright.sync_api import sync_playwright
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'screenshots')
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 375, 'height': 812})
    page.goto('http://localhost:4011/#/overview')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    # Click hamburger
    page.locator('.hamburger').click()
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(OUT, 'mobile-nav-open.png'))
    # Click a nav link
    page.locator('.nav-link', has_text='Settings').click()
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, 'mobile-nav-after-click.png'))
    print(f"Hash after nav: {page.evaluate('window.location.hash')}")
    browser.close()
    print("Done")
