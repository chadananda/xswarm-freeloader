Feature: Overview dashboard

  The overview page shows live stats, charts, and provider health.

  Background:
    Given I am logged into the dashboard
    And I navigate to the overview page

  Scenario: Overview shows stat cards
    Then I should see "COST TODAY" stat
    And I should see "COST THIS MONTH" stat
    And I should see "SAVED TODAY" stat
    And I should see "SAVED THIS MONTH" stat

  Scenario: Overview shows secondary stats
    Then I should see "REQUESTS TODAY" stat
    And I should see "FREE TIER HITS" stat
    And I should see "AVG LATENCY" stat

  Scenario: Overview shows chart sections
    Then I should see the "Daily cost trend" heading
    And I should see the "Provider distribution" heading

  Scenario: Overview shows provider health
    Then I should see the "Provider health" heading

  Scenario: Overview shows live request feed
    Then I should see the "Live request feed" heading
