"""Visual test for onboarding wizard, footer, opportunities, settings, nav badge."""
from playwright.sync_api import sync_playwright
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'screenshots')
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    # Navigate to dashboard
    page.goto('http://localhost:4011')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, '01-initial-load.png'), full_page=True)
    current_hash = page.evaluate('window.location.hash')
    print(f"Initial URL hash: {current_hash}")
    # Navigate directly to onboarding (always works regardless of DB state)
    page.goto('http://localhost:4011/#/onboarding')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(OUT, '02-onboarding-full.png'), full_page=True)
    # Check key elements using specific selectors
    hero = page.locator('.hero-title')
    print(f"Hero title visible: {hero.is_visible()}")
    print(f"Hero title text: {hero.text_content() if hero.is_visible() else 'N/A'}")
    bee = page.locator('.bee-badge')
    print(f"Bee badge visible: {bee.is_visible()}")
    timeline_dots = page.locator('.timeline-dot')
    print(f"Timeline dots: {timeline_dots.count()}")
    step_numbers = page.locator('.step-number')
    print(f"Step number circles: {step_numbers.count()}")
    step_titles = page.locator('.step-title')
    print(f"Step titles: {step_titles.count()}")
    for i in range(step_titles.count()):
        print(f"  Step title {i+1}: {step_titles.nth(i).text_content()}")
    # Provider cards
    provider_cards = page.locator('.provider-card')
    print(f"Provider cards: {provider_cards.count()}")
    signup_links = page.locator('.signup-link')
    print(f"Signup links: {signup_links.count()}")
    # Summary section
    summary_title = page.locator('.summary-title')
    print(f"Summary title visible: {summary_title.is_visible()}")
    finish_btn = page.locator('.finish-btn')
    print(f"Finish button visible: {finish_btn.is_visible()}")
    # Screenshot: hero area
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    page.screenshot(path=os.path.join(OUT, '03-onboarding-hero.png'))
    # Screenshot: step 1 provider cards
    if step_titles.count() > 0:
        step_titles.first.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '04-onboarding-step1.png'))
    # Screenshot: paid divider if visible
    paid_divider = page.locator('.paid-divider')
    if paid_divider.count() > 0 and paid_divider.is_visible():
        paid_divider.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '04b-onboarding-paid-divider.png'))
    # Screenshot: step 2 local AI
    step2_heading = page.get_by_role('heading', name='Local AI')
    if step2_heading.count() > 0:
        step2_heading.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '05-onboarding-step2.png'))
    # Screenshot: step 3 email/network
    step3_heading = page.locator('.optional-badge')
    if step3_heading.count() > 0:
        step3_heading.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '06-onboarding-step3.png'))
    # Screenshot: summary
    if summary_title.is_visible():
        summary_title.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '07-onboarding-summary.png'))
    # Click "Go to Dashboard"
    if finish_btn.is_visible():
        finish_btn.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, '08-overview.png'), full_page=True)
        print(f"After finish, hash: {page.evaluate('window.location.hash')}")
    # Overview: check setup banner
    setup_banner = page.locator('text=No providers configured yet')
    print(f"Setup banner visible: {setup_banner.count() > 0 and setup_banner.first.is_visible()}")
    unconfigured_hint = page.locator('text=not yet configured')
    print(f"Unconfigured hint visible: {unconfigured_hint.count() > 0 and unconfigured_hint.first.is_visible()}")
    # Navigate to Opportunities
    page.goto('http://localhost:4011/#/opportunities')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, '09-opportunities.png'), full_page=True)
    # Navigate to Settings
    page.goto('http://localhost:4011/#/settings')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, '10-settings.png'), full_page=True)
    # Key Management section
    key_mgmt = page.locator('text=Key Management')
    print(f"Key Management visible: {key_mgmt.count() > 0 and key_mgmt.first.is_visible()}")
    if key_mgmt.count() > 0:
        key_mgmt.first.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(OUT, '11-settings-keymgmt.png'))
    # Re-run wizard link
    wizard = page.locator('text=Re-run Setup Wizard')
    print(f"Re-run wizard visible: {wizard.count() > 0 and wizard.first.is_visible()}")
    # Nav + badge + footer
    page.goto('http://localhost:4011/#/overview')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    opp_badge = page.locator('.opp-badge')
    print(f"Opportunity badge visible: {opp_badge.count() > 0 and opp_badge.first.is_visible()}")
    nav = page.locator('.nav-sidebar')
    if nav.is_visible():
        nav.screenshot(path=os.path.join(OUT, '12-nav.png'))
    footer = page.locator('.app-footer')
    print(f"Footer visible: {footer.count() > 0 and footer.first.is_visible()}")
    if footer.count() > 0 and footer.first.is_visible():
        footer.first.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        footer.first.screenshot(path=os.path.join(OUT, '13-footer.png'))
    page.screenshot(path=os.path.join(OUT, '14-overview-full.png'), full_page=True)
    browser.close()
    print(f"\nScreenshots saved to {OUT}/")
    print("Done!")
