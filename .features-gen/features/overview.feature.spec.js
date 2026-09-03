// Generated from: features/overview.feature
import { test } from "playwright-bdd";

test.describe('Overview dashboard', () => {

  test.beforeEach('Background', async ({ Given, And, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged into the dashboard', null, { page }); 
    await And('I navigate to the overview page', null, { page }); 
  });
  
  test('Overview shows stat cards', async ({ Then, And, page }) => { 
    await Then('I should see "COST TODAY" stat', null, { page }); 
    await And('I should see "COST THIS MONTH" stat', null, { page }); 
    await And('I should see "SAVED TODAY" stat', null, { page }); 
    await And('I should see "SAVED THIS MONTH" stat', null, { page }); 
  });

  test('Overview shows secondary stats', async ({ Then, And, page }) => { 
    await Then('I should see "REQUESTS TODAY" stat', null, { page }); 
    await And('I should see "FREE TIER HITS" stat', null, { page }); 
    await And('I should see "AVG LATENCY" stat', null, { page }); 
  });

  test('Overview shows chart sections', async ({ Then, And, page }) => { 
    await Then('I should see the "Daily cost trend" heading', null, { page }); 
    await And('I should see the "Provider distribution" heading', null, { page }); 
  });

  test('Overview shows provider health', async ({ Then, page }) => { 
    await Then('I should see the "Provider health" heading', null, { page }); 
  });

  test('Overview shows live request feed', async ({ Then, page }) => { 
    await Then('I should see the "Live request feed" heading', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/overview.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":11,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I should see \"COST TODAY\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"COST TODAY\"","children":[{"start":14,"value":"COST TODAY","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And I should see \"COST THIS MONTH\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"COST THIS MONTH\"","children":[{"start":14,"value":"COST THIS MONTH","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And I should see \"SAVED TODAY\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"SAVED TODAY\"","children":[{"start":14,"value":"SAVED TODAY","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And I should see \"SAVED THIS MONTH\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"SAVED THIS MONTH\"","children":[{"start":14,"value":"SAVED THIS MONTH","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":18,"pickleLine":15,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then I should see \"REQUESTS TODAY\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"REQUESTS TODAY\"","children":[{"start":14,"value":"REQUESTS TODAY","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And I should see \"FREE TIER HITS\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"FREE TIER HITS\"","children":[{"start":14,"value":"FREE TIER HITS","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"And I should see \"AVG LATENCY\" stat","stepMatchArguments":[{"group":{"start":13,"value":"\"AVG LATENCY\"","children":[{"start":14,"value":"AVG LATENCY","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":24,"pickleLine":20,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Daily cost trend\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Daily cost trend\"","children":[{"start":18,"value":"Daily cost trend","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":26,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"And I should see the \"Provider distribution\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Provider distribution\"","children":[{"start":18,"value":"Provider distribution","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":29,"pickleLine":24,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Provider health\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Provider health\"","children":[{"start":18,"value":"Provider health","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":33,"pickleLine":27,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I am logged into the dashboard","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I navigate to the overview page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":34,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Live request feed\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Live request feed\"","children":[{"start":18,"value":"Live request feed","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end