Feature: Opportunities page

  The opportunities page shows unconfigured free-tier providers and tips.

  Background:
    Given I am logged into the dashboard
    And I navigate to the opportunities page

  Scenario: Page heading and subtitle
    Then I should see the "Opportunities" heading
    And I should see "ways to save more money"

  Scenario: Local model tip is always shown
    Then I should see "Set up a local model"
    And I should see "Install Ollama"
    And I should see "Private + free"

  Scenario: All configured celebration
    Then I should see "All free tiers configured!"
    And I should see "getting the most out of every provider"
