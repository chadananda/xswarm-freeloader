// Generated from: features/footer.feature
import { test } from "playwright-bdd";

test.describe('Dashboard footer', () => {

  test('Footer is visible on overview page', async ({ Given, Then, And, page }) => { 
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the overview page', null, { page }); 
    await Then('I should see the footer', null, { page }); 
    await And('the footer should contain "xswarm freeloader v2.0"', null, { page }); 
    await And('the footer should contain "Your keys never leave this machine"', null, { page }); 
    await And('the footer should contain "MIT Licensed"', null, { page }); 
  });

  test('Footer contains project links', async ({ Given, Then, And, page }) => { 
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the overview page', null, { page }); 
    await Then('the footer should contain a "GitHub" link', null, { page }); 
    await And('the footer should contain a "freeloader.xswarm.ai" link', null, { page }); 
  });

  test('Footer is visible on settings page', async ({ Given, Then, And, page }) => { 
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the settings page', null, { page }); 
    await Then('I should see the footer', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/footer.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then I should see the footer","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"And the footer should contain \"xswarm freeloader v2.0\"","stepMatchArguments":[{"group":{"start":26,"value":"\"xswarm freeloader v2.0\"","children":[{"start":27,"value":"xswarm freeloader v2.0","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"And the footer should contain \"Your keys never leave this machine\"","stepMatchArguments":[{"group":{"start":26,"value":"\"Your keys never leave this machine\"","children":[{"start":27,"value":"Your keys never leave this machine","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And the footer should contain \"MIT Licensed\"","stepMatchArguments":[{"group":{"start":26,"value":"\"MIT Licensed\"","children":[{"start":27,"value":"MIT Licensed","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":15,"pickleLine":13,"tags":[],"steps":[{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","stepMatchArguments":[]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then the footer should contain a \"GitHub\" link","stepMatchArguments":[{"group":{"start":28,"value":"\"GitHub\"","children":[{"start":29,"value":"GitHub","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And the footer should contain a \"freeloader.xswarm.ai\" link","stepMatchArguments":[{"group":{"start":28,"value":"\"freeloader.xswarm.ai\"","children":[{"start":29,"value":"freeloader.xswarm.ai","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":19,"tags":[],"steps":[{"pwStepLine":23,"gherkinStepLine":20,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":21,"keywordType":"Context","textWithKeyword":"And I navigate to the settings page","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"Then I should see the footer","stepMatchArguments":[]}]},
]; // bdd-data-end