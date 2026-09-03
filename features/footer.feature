Feature: Dashboard footer

  The footer appears on all dashboard pages and shows project info.

  Scenario: Footer is visible on overview page
    Given I am logged into the dashboard
    And I navigate to the overview page
    Then I should see the footer
    And the footer should contain "xswarm freeloader v2.0"
    And the footer should contain "Your keys never leave this machine"
    And the footer should contain "MIT Licensed"

  Scenario: Footer contains project links
    Given I am logged into the dashboard
    And I navigate to the overview page
    Then the footer should contain a "GitHub" link
    And the footer should contain a "freeloader.xswarm.ai" link

  Scenario: Footer is visible on settings page
    Given I am logged into the dashboard
    And I navigate to the settings page
    Then I should see the footer
