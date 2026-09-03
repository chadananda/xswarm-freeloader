Feature: Settings page

  The settings page allows configuration of general settings, email,
  password, and key management.

  Background:
    Given I am logged into the dashboard
    And I navigate to the settings page

  Scenario: Settings page heading
    Then I should see the "Settings" heading
    And I should see "tune the machine"

  Scenario: General settings card
    Then I should see the "General" heading
    And I should see "Router port" label
    And I should see "Email (for digests)" label
    And I should see the "save settings" button

  Scenario: Email reports card
    Then I should see the "Email Reports" heading
    And I should see "Email provider" label
    And I should see the "save email settings" button

  Scenario: Change password card
    Then I should see the "Change password" heading
    And I should see "Current password" label
    And I should see "New password" label
    And I should see the "change password" button

  Scenario: About card
    Then I should see the "About" heading
    And I should see "xswarm-freeloader v2.0"
    And I should see "router port"
    And I should see "dashboard port"

  Scenario: Key Management card
    Then I should see the "Key Management" heading
    And I should see "Export Keys"
    And I should see "Download an encrypted backup"
    And I should see "Import Keys"
    And I should see "Restore keys from an encrypted backup"

  Scenario: Re-run setup wizard link
    Then I should see the "Re-run Setup Wizard" link
