Feature: Accessibility compliance

  All dashboard pages should meet WCAG 2.1 AA standards.

  Scenario Outline: <page> meets accessibility standards
    Given I navigate to "<url>"
    And I wait for the page to load
    Then the page should have no critical accessibility violations

    Examples:
      | page          | url                            |
      | Onboarding    | http://localhost:4011/#/onboarding |
      | Overview      | http://localhost:4011/#/overview   |
      | Opportunities | http://localhost:4011/#/opportunities |
      | Settings      | http://localhost:4011/#/settings   |
