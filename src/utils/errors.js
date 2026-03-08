export class BudgetExceededError extends Error {
  constructor(message, period, spent, limit) {
    super(message);
    this.name = 'BudgetExceededError';
    this.period = period;
    this.spent = spent;
    this.limit = limit;
    this.statusCode = 429;
  }
}

export class NoProvidersAvailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoProvidersAvailableError';
    this.statusCode = 503;
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message, provider) {
    super(message);
    this.name = 'InvalidApiKeyError';
    this.provider = provider;
    this.statusCode = 401;
  }
}

export class QuotaExceededError extends Error {
  constructor(message, provider, model) {
    super(message);
    this.name = 'QuotaExceededError';
    this.provider = provider;
    this.model = model;
    this.statusCode = 429;
  }
}

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
    this.statusCode = 500;
  }
}

export class ProviderError extends Error {
  constructor(message, provider, statusCode = 502) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(provider) {
    super(`Circuit breaker open for provider: ${provider}`);
    this.name = 'CircuitBreakerOpenError';
    this.provider = provider;
    this.statusCode = 503;
  }
}
