// Generated from: features/navigation.feature
import { test } from "playwright-bdd";

test.describe('Dashboard navigation', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged into the dashboard', null, { page }); 
  });
  
  test('Navigation sidebar shows all menu items', async ({ Then, And, page }) => { 
    await Then('I should see the navigation sidebar', null, { page }); 
    await And('the sidebar should contain "Overview" link', null, { page }); 
    await And('the sidebar should contain "Providers" link', null, { page }); 
    await And('the sidebar should contain "Apps" link', null, { page }); 
    await And('the sidebar should contain "Accounts" link', null, { page }); 
    await And('the sidebar should contain "Routing" link', null, { page }); 
    await And('the sidebar should contain "Usage" link', null, { page }); 
    await And('the sidebar should contain "Opportunities" link', null, { page }); 
    await And('the sidebar should contain "Settings" link', null, { page }); 
  });

  test('Navigation shows brand', async ({ Then, And, page }) => { 
    await Then('the sidebar should show "xswarm" brand', null, { page }); 
    await And('the sidebar should show "freeloader" sub-brand', null, { page }); 
  });

  test('Active page is highlighted', async ({ When, Then, page }) => { 
    await When('I navigate to the settings page', null, { page }); 
    await Then('the "Settings" nav link should be active', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/navigation.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":8,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then I should see the navigation sidebar","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Overview\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Overview\"","children":[{"start":28,"value":"Overview","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Providers\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Providers\"","children":[{"start":28,"value":"Providers","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Apps\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Apps\"","children":[{"start":28,"value":"Apps","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Accounts\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Accounts\"","children":[{"start":28,"value":"Accounts","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Routing\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Routing\"","children":[{"start":28,"value":"Routing","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Usage\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Usage\"","children":[{"start":28,"value":"Usage","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Opportunities\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Opportunities\"","children":[{"start":28,"value":"Opportunities","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And the sidebar should contain \"Settings\" link","stepMatchArguments":[{"group":{"start":27,"value":"\"Settings\"","children":[{"start":28,"value":"Settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":19,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then the sidebar should show \"xswarm\" brand","stepMatchArguments":[{"group":{"start":24,"value":"\"xswarm\"","children":[{"start":25,"value":"xswarm","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"And the sidebar should show \"freeloader\" sub-brand","stepMatchArguments":[{"group":{"start":24,"value":"\"freeloader\"","children":[{"start":25,"value":"freeloader","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":27,"pickleLine":23,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":24,"keywordType":"Action","textWithKeyword":"When I navigate to the settings page","stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"Then the \"Settings\" nav link should be active","stepMatchArguments":[{"group":{"start":4,"value":"\"Settings\"","children":[{"start":5,"value":"Settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end