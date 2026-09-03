// Generated from: features/settings.feature
import { test } from "playwright-bdd";

test.describe('Settings page', () => {

  test.beforeEach('Background', async ({ Given, And, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the settings page', null, { page }); 
  });
  
  test('Settings page heading', async ({ Then, And, page }) => { 
    await Then('I should see the "Settings" heading', null, { page }); 
    await And('I should see "tune the machine"', null, { page }); 
  });

  test('General settings card', async ({ Then, And, page }) => { 
    await Then('I should see the "General" heading', null, { page }); 
    await And('I should see "Router port" label', null, { page }); 
    await And('I should see "Email (for digests)" label', null, { page }); 
    await And('I should see the "save settings" button', null, { page }); 
  });

  test('Email reports card', async ({ Then, And, page }) => { 
    await Then('I should see the "Email Reports" heading', null, { page }); 
    await And('I should see "Email provider" label', null, { page }); 
    await And('I should see the "save email settings" button', null, { page }); 
  });

  test('Change password card', async ({ Then, And, page }) => { 
    await Then('I should see the "Change password" heading', null, { page }); 
    await And('I should see "Current password" label', null, { page }); 
    await And('I should see "New password" label', null, { page }); 
    await And('I should see the "change password" button', null, { page }); 
  });

  test('About card', async ({ Then, And, page }) => { 
    await Then('I should see the "About" heading', null, { page }); 
    await And('I should see "xswarm-freeloader v2.0"', null, { page }); 
    await And('I should see "router port"', null, { page }); 
    await And('I should see "dashboard port"', null, { page }); 
  });

  test('Key Management card', async ({ Then, And, page }) => { 
    await Then('I should see the "Key Management" heading', null, { page }); 
    await And('I should see "Export Keys"', null, { page }); 
    await And('I should see "Download an encrypted backup"', null, { page }); 
    await And('I should see "Import Keys"', null, { page }); 
    await And('I should see "Restore keys from an encrypted backup"', null, { page }); 
  });

  test('Re-run setup wizard link', async ({ Then, page }) => { 
    await Then('I should see the "Re-run Setup Wizard" link', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/settings.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":11,"pickleLine":10,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Settings\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Settings\"","children":[{"start":18,"value":"Settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And I should see \"tune the machine\"","stepMatchArguments":[{"group":{"start":13,"value":"\"tune the machine\"","children":[{"start":14,"value":"tune the machine","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":16,"pickleLine":14,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"General\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"General\"","children":[{"start":18,"value":"General","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"And I should see \"Router port\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"Router port\"","children":[{"start":14,"value":"Router port","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And I should see \"Email (for digests)\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"Email (for digests)\"","children":[{"start":14,"value":"Email (for digests)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"And I should see the \"save settings\" button","stepMatchArguments":[{"group":{"start":17,"value":"\"save settings\"","children":[{"start":18,"value":"save settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":23,"pickleLine":20,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Email Reports\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Email Reports\"","children":[{"start":18,"value":"Email Reports","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":25,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"And I should see \"Email provider\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"Email provider\"","children":[{"start":14,"value":"Email provider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":26,"gherkinStepLine":23,"keywordType":"Outcome","textWithKeyword":"And I should see the \"save email settings\" button","stepMatchArguments":[{"group":{"start":17,"value":"\"save email settings\"","children":[{"start":18,"value":"save email settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":29,"pickleLine":25,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Change password\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Change password\"","children":[{"start":18,"value":"Change password","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":31,"gherkinStepLine":27,"keywordType":"Outcome","textWithKeyword":"And I should see \"Current password\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"Current password\"","children":[{"start":14,"value":"Current password","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":32,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"And I should see \"New password\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"New password\"","children":[{"start":14,"value":"New password","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":33,"gherkinStepLine":29,"keywordType":"Outcome","textWithKeyword":"And I should see the \"change password\" button","stepMatchArguments":[{"group":{"start":17,"value":"\"change password\"","children":[{"start":18,"value":"change password","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":36,"pickleLine":31,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":37,"gherkinStepLine":32,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"About\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"About\"","children":[{"start":18,"value":"About","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":38,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"And I should see \"xswarm-freeloader v2.0\"","stepMatchArguments":[{"group":{"start":13,"value":"\"xswarm-freeloader v2.0\"","children":[{"start":14,"value":"xswarm-freeloader v2.0","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":39,"gherkinStepLine":34,"keywordType":"Outcome","textWithKeyword":"And I should see \"router port\"","stepMatchArguments":[{"group":{"start":13,"value":"\"router port\"","children":[{"start":14,"value":"router port","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":40,"gherkinStepLine":35,"keywordType":"Outcome","textWithKeyword":"And I should see \"dashboard port\"","stepMatchArguments":[{"group":{"start":13,"value":"\"dashboard port\"","children":[{"start":14,"value":"dashboard port","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":43,"pickleLine":37,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":44,"gherkinStepLine":38,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Key Management\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Key Management\"","children":[{"start":18,"value":"Key Management","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":45,"gherkinStepLine":39,"keywordType":"Outcome","textWithKeyword":"And I should see \"Export Keys\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Export Keys\"","children":[{"start":14,"value":"Export Keys","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":46,"gherkinStepLine":40,"keywordType":"Outcome","textWithKeyword":"And I should see \"Download an encrypted backup\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Download an encrypted backup\"","children":[{"start":14,"value":"Download an encrypted backup","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":47,"gherkinStepLine":41,"keywordType":"Outcome","textWithKeyword":"And I should see \"Import Keys\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Import Keys\"","children":[{"start":14,"value":"Import Keys","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":48,"gherkinStepLine":42,"keywordType":"Outcome","textWithKeyword":"And I should see \"Restore keys from an encrypted backup\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Restore keys from an encrypted backup\"","children":[{"start":14,"value":"Restore keys from an encrypted backup","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":51,"pickleLine":44,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":52,"gherkinStepLine":45,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Re-run Setup Wizard\" link","stepMatchArguments":[{"group":{"start":17,"value":"\"Re-run Setup Wizard\"","children":[{"start":18,"value":"Re-run Setup Wizard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end