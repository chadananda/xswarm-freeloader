// Generated from: features/onboarding.feature
import { test } from "playwright-bdd";

test.describe('Onboarding wizard', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I navigate to the onboarding page', null, { page }); 
  });
  
  test('Hero section displays welcome content', async ({ Then, And, page }) => { 
    await Then('I should see the "Welcome to Freeloader" heading', null, { page }); 
    await And('I should see "local AI router"', null, { page }); 
    await And('I should see "Your keys and data stay on this machine"', null, { page }); 
    await And('I should see "Let\'s set up your free tiers"', null, { page }); 
  });

  test('Timeline shows three numbered steps', async ({ Then, And, page }) => { 
    await Then('I should see 3 timeline dots', null, { page }); 
    await And('the timeline dots should display "1", "2", "3"', null, { page }); 
  });

  test('Step 1 shows free tier API key setup', async ({ Then, And, page }) => { 
    await Then('I should see the "Free Tier API Keys" heading', null, { page }); 
    await And('I should see "Each provider offers free tiers"', null, { page }); 
  });

  test('Step 2 shows local AI discovery', async ({ Then, And, page }) => { 
    await Then('I should see the "Local AI" heading', null, { page }); 
    await And('I should see "Auto-detecting Ollama and LM Studio"', null, { page }); 
  });

  test('Step 3 shows optional email and network', async ({ Then, And, page }) => { 
    await Then('I should see the "Email & Network" heading', null, { page }); 
    await And('I should see "optional" badge text', null, { page }); 
    await And('I should see "Reports, key backup, and multi-device access"', null, { page }); 
  });

  test('Step 3 email provider selection', async ({ When, Then, And, page }) => { 
    await When('I select "Resend (free — 100 emails/day)" from the email provider dropdown', null, { page }); 
    await Then('I should see "Resend API key" label', null, { page }); 
    await And('I should see "resend.com" link', null, { page }); 
  });

  test('Summary section with endpoint', async ({ Then, And, page }) => { 
    await Then('I should see the "You\'re all set!" heading', null, { page }); 
    await And('I should see "providers" stat label', null, { page }); 
    await And('I should see "local models" stat label', null, { page }); 
    await And('I should see the endpoint "http://localhost:4011/v1/chat/completions"', null, { page }); 
    await And('I should see the "Go to Dashboard" button', null, { page }); 
  });

  test('Finish button navigates to overview', async ({ When, Then, page }) => { 
    await When('I click the "Go to Dashboard" button', null, { page }); 
    await Then('the URL hash should be "#/overview"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/onboarding.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Welcome to Freeloader\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Welcome to Freeloader\"","children":[{"start":18,"value":"Welcome to Freeloader","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And I should see \"local AI router\"","stepMatchArguments":[{"group":{"start":13,"value":"\"local AI router\"","children":[{"start":14,"value":"local AI router","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And I should see \"Your keys and data stay on this machine\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Your keys and data stay on this machine\"","children":[{"start":14,"value":"Your keys and data stay on this machine","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And I should see \"Let's set up your free tiers\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Let's set up your free tiers\"","children":[{"start":14,"value":"Let's set up your free tiers","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":17,"pickleLine":15,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then I should see 3 timeline dots","stepMatchArguments":[{"group":{"start":13,"value":"3","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And the timeline dots should display \"1\", \"2\", \"3\"","stepMatchArguments":[{"group":{"start":33,"value":"\"1\"","children":[{"start":34,"value":"1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":38,"value":"\"2\"","children":[{"start":39,"value":"2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":43,"value":"\"3\"","children":[{"start":44,"value":"3","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":19,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Free Tier API Keys\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Free Tier API Keys\"","children":[{"start":18,"value":"Free Tier API Keys","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"And I should see \"Each provider offers free tiers\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Each provider offers free tiers\"","children":[{"start":14,"value":"Each provider offers free tiers","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":27,"pickleLine":23,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":24,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Local AI\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Local AI\"","children":[{"start":18,"value":"Local AI","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":29,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"And I should see \"Auto-detecting Ollama and LM Studio\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Auto-detecting Ollama and LM Studio\"","children":[{"start":14,"value":"Auto-detecting Ollama and LM Studio","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":32,"pickleLine":27,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":33,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"Email & Network\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"Email & Network\"","children":[{"start":18,"value":"Email & Network","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":34,"gherkinStepLine":29,"keywordType":"Outcome","textWithKeyword":"And I should see \"optional\" badge text","stepMatchArguments":[{"group":{"start":13,"value":"\"optional\"","children":[{"start":14,"value":"optional","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":35,"gherkinStepLine":30,"keywordType":"Outcome","textWithKeyword":"And I should see \"Reports, key backup, and multi-device access\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Reports, key backup, and multi-device access\"","children":[{"start":14,"value":"Reports, key backup, and multi-device access","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":38,"pickleLine":32,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":39,"gherkinStepLine":33,"keywordType":"Action","textWithKeyword":"When I select \"Resend (free — 100 emails/day)\" from the email provider dropdown","stepMatchArguments":[{"group":{"start":9,"value":"\"Resend (free — 100 emails/day)\"","children":[{"start":10,"value":"Resend (free — 100 emails/day)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":40,"gherkinStepLine":34,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Resend API key\" label","stepMatchArguments":[{"group":{"start":13,"value":"\"Resend API key\"","children":[{"start":14,"value":"Resend API key","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":41,"gherkinStepLine":35,"keywordType":"Outcome","textWithKeyword":"And I should see \"resend.com\" link","stepMatchArguments":[{"group":{"start":13,"value":"\"resend.com\"","children":[{"start":14,"value":"resend.com","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":44,"pickleLine":37,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":45,"gherkinStepLine":38,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"You're all set!\" heading","stepMatchArguments":[{"group":{"start":17,"value":"\"You're all set!\"","children":[{"start":18,"value":"You're all set!","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":46,"gherkinStepLine":39,"keywordType":"Outcome","textWithKeyword":"And I should see \"providers\" stat label","stepMatchArguments":[{"group":{"start":13,"value":"\"providers\"","children":[{"start":14,"value":"providers","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":47,"gherkinStepLine":40,"keywordType":"Outcome","textWithKeyword":"And I should see \"local models\" stat label","stepMatchArguments":[{"group":{"start":13,"value":"\"local models\"","children":[{"start":14,"value":"local models","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":48,"gherkinStepLine":41,"keywordType":"Outcome","textWithKeyword":"And I should see the endpoint \"http://localhost:4011/v1/chat/completions\"","stepMatchArguments":[{"group":{"start":26,"value":"\"http://localhost:4011/v1/chat/completions\"","children":[{"start":27,"value":"http://localhost:4011/v1/chat/completions","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":49,"gherkinStepLine":42,"keywordType":"Outcome","textWithKeyword":"And I should see the \"Go to Dashboard\" button","stepMatchArguments":[{"group":{"start":17,"value":"\"Go to Dashboard\"","children":[{"start":18,"value":"Go to Dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":52,"pickleLine":44,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I navigate to the onboarding page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":53,"gherkinStepLine":45,"keywordType":"Action","textWithKeyword":"When I click the \"Go to Dashboard\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"Go to Dashboard\"","children":[{"start":13,"value":"Go to Dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":54,"gherkinStepLine":46,"keywordType":"Outcome","textWithKeyword":"Then the URL hash should be \"#/overview\"","stepMatchArguments":[{"group":{"start":23,"value":"\"#/overview\"","children":[{"start":24,"value":"#/overview","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end