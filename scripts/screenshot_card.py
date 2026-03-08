from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 800, "height": 600}, device_scale_factor=2)
    page.goto('http://localhost:4322/test-card')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    page.screenshot(path='scripts/papercard_full.png', full_page=True)
    page.screenshot(path='scripts/papercard_objects.png', clip={"x": 30, "y": 80, "width": 700, "height": 260})
    # Close-up of t3 right+bottom edges
    page.screenshot(path='scripts/papercard_closeup.png', clip={"x": 420, "y": 100, "width": 300, "height": 230})
    # Close-up of t2 LEFT edge (the problem area)
    page.screenshot(path='scripts/papercard_left.png', clip={"x": 135, "y": 100, "width": 120, "height": 220})
    browser.close()
    print("Screenshots saved")
