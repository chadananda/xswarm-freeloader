// Generated from: features/opportunities.feature
import { test } from "playwright-bdd";

test.describe('Opportunities page', () => {

  test.beforeEach('Background', async ({ Given, And, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the opportunities page', null, { page }); 
  });
  
  test('Page heading and subtitle', async ({ Then, And, page }) => { 
    await Then('I should see the "Opportunities" heading', null, { page }); 
    await And('I should see "ways to save more money"', null, { page }); 
  });

  test('Local model tip is always shown', async ({ Then, And, page }) => { 
    await Then('I should see "Set up a local model"', null, { page }); 
    await And('I should see "Install Ollama"', null, { page }); 
    await And('I should see "Private + free"', null, { page }); 
  });

  test('All configured celebration', async ({ Then, And, page }) => { 
    await Then('I should see "All free tiers configured!"', null, { page }); 
    await And('I should see "getting the most out of every provider"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/opportunities.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":11,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the opportunities page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Opportunities\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Opportunities\"","children":[{"start":18,"value":"Opportunities","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And I should see \"ways to save more money\"","stepMatchArguments":[{"group":{"start":13,"value":"\"ways to save more money\"","children":[{"start":14,"value":"ways to save more money","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":16,"pickleLine":13,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the opportunities page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Set up a local model\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Set up a local model\"","children":[{"start":14,"value":"Set up a local model","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And I should see \"Install Ollama\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Install Ollama\"","children":[{"start":14,"value":"Install Ollama","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"And I should see \"Private + free\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Private + free\"","children":[{"start":14,"value":"Private + free","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":18,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the opportunities page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then I should see \"All free tiers configured!\"","stepMatchArguments":[{"group":{"start":13,"value":"\"All free tiers configured!\"","children":[{"start":14,"value":"All free tiers configured!","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"And I should see \"getting the most out of every provider\"","stepMatchArguments":[{"group":{"start":13,"value":"\"getting the most out of every provider\"","children":[{"start":14,"value":"getting the most out of every provider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end