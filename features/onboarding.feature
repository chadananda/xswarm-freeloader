Feature: Onboarding wizard

  The onboarding wizard guides new users through setting up free-tier
  API providers, local AI, and optional email/network sharing.

  Background:
    Given I navigate to the onboarding page

  Scenario: Hero section displays welcome content
    Then I should see the "Welcome to Freeloader" heading
    And I should see "local AI router"
    And I should see "Your keys and data stay on this machine"
    And I should see "Let's set up your free tiers"

  Scenario: Timeline shows three numbered steps
    Then I should see 3 timeline dots
    And the timeline dots should display "1", "2", "3"

  Scenario: Step 1 shows free tier API key setup
    Then I should see the "Free Tier API Keys" heading
    And I should see "Each provider offers free tiers"

  Scenario: Step 2 shows local AI discovery
    Then I should see the "Local AI" heading
    And I should see "Auto-detecting Ollama and LM Studio"

  Scenario: Step 3 shows optional email and network
    Then I should see the "Email & Network" heading
    And I should see "optional" badge text
    And I should see "Reports, key backup, and multi-device access"

  Scenario: Step 3 email provider selection
    When I select "Resend (free — 100 emails/day)" from the email provider dropdown
    Then I should see "Resend API key" label
    And I should see "resend.com" link

  Scenario: Summary section with endpoint
    Then I should see the "You're all set!" heading
    And I should see "providers" stat label
    And I should see "local models" stat label
    And I should see the endpoint "http://localhost:4011/v1/chat/completions"
    And I should see the "Go to Dashboard" button

  Scenario: Finish button navigates to overview
    When I click the "Go to Dashboard" button
    Then the URL hash should be "#/overview"
