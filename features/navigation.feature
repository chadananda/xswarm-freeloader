Feature: Dashboard navigation

  The sidebar navigation allows users to switch between dashboard views.

  Background:
    Given I am logged into the dashboard

  Scenario: Navigation sidebar shows all menu items
    Then I should see the navigation sidebar
    And the sidebar should contain "Overview" link
    And the sidebar should contain "Providers" link
    And the sidebar should contain "Apps" link
    And the sidebar should contain "Accounts" link
    And the sidebar should contain "Routing" link
    And the sidebar should contain "Usage" link
    And the sidebar should contain "Opportunities" link
    And the sidebar should contain "Settings" link

  Scenario: Navigation shows brand
    Then the sidebar should show "xswarm" brand
    And the sidebar should show "freeloader" sub-brand

  Scenario: Active page is highlighted
    When I navigate to the settings page
    Then the "Settings" nav link should be active
