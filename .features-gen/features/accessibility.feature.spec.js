// Generated from: features/accessibility.feature
import { test } from "playwright-bdd";

test.describe('Accessibility compliance', () => {

  test.describe('<page> meets accessibility standards', () => {

    test('Onboarding meets accessibility standards', async ({ Given, Then, And, page }) => { 
      await Given('I navigate to "http://localhost:4011/#/onboarding"', null, { page }); 
      await And('I wait for the page to load', null, { page }); 
      await Then('the page should have no critical accessibility violations', null, { page }); 
    });

    test('Overview meets accessibility standards', async ({ Given, Then, And, page }) => { 
      await Given('I navigate to "http://localhost:4011/#/overview"', null, { page }); 
      await And('I wait for the page to load', null, { page }); 
      await Then('the page should have no critical accessibility violations', null, { page }); 
    });

    test('Opportunities meets accessibility standards', async ({ Given, Then, And, page }) => { 
      await Given('I navigate to "http://localhost:4011/#/opportunities"', null, { page }); 
      await And('I wait for the page to load', null, { page }); 
      await Then('the page should have no critical accessibility violations', null, { page }); 
    });

    test('Settings meets accessibility standards', async ({ Given, Then, And, page }) => { 
      await Given('I navigate to "http://localhost:4011/#/settings"', null, { page }); 
      await And('I wait for the page to load', null, { page }); 
      await Then('the page should have no critical accessibility violations', null, { page }); 
    });

  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/accessibility.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":8,"pickleLine":12,"tags":[],"steps":[{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I navigate to \"http://localhost:4011/#/onboarding\"","stepMatchArguments":[{"group":{"start":14,"value":"\"http://localhost:4011/#/onboarding\"","children":[{"start":15,"value":"http://localhost:4011/#/onboarding","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I wait for the page to load","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then the page should have no critical accessibility violations","stepMatchArguments":[]}]},
  {"pwTestLine":14,"pickleLine":13,"tags":[],"steps":[{"pwStepLine":15,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I navigate to \"http://localhost:4011/#/overview\"","stepMatchArguments":[{"group":{"start":14,"value":"\"http://localhost:4011/#/overview\"","children":[{"start":15,"value":"http://localhost:4011/#/overview","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I wait for the page to load","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then the page should have no critical accessibility violations","stepMatchArguments":[]}]},
  {"pwTestLine":20,"pickleLine":14,"tags":[],"steps":[{"pwStepLine":21,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I navigate to \"http://localhost:4011/#/opportunities\"","stepMatchArguments":[{"group":{"start":14,"value":"\"http://localhost:4011/#/opportunities\"","children":[{"start":15,"value":"http://localhost:4011/#/opportunities","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I wait for the page to load","stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then the page should have no critical accessibility violations","stepMatchArguments":[]}]},
  {"pwTestLine":26,"pickleLine":15,"tags":[],"steps":[{"pwStepLine":27,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given I navigate to \"http://localhost:4011/#/settings\"","stepMatchArguments":[{"group":{"start":14,"value":"\"http://localhost:4011/#/settings\"","children":[{"start":15,"value":"http://localhost:4011/#/settings","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":28,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And I wait for the page to load","stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then the page should have no critical accessibility violations","stepMatchArguments":[]}]},
]; // bdd-data-end