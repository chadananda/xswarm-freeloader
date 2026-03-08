import { renderAlert } from './templates/alert.js';

export function buildNewProviderAlert(provider) {
  return {
    subject: `🆕 New provider available: ${provider.name}`,
    html: renderAlert({
      type: 'success',
      title: `New Provider: ${provider.name}`,
      message: `${provider.name} has been added to your catalog with ${provider.modelCount || 0} models.`,
      details: provider.free_tier ? 'Free tier available!' : null
    })
  };
}

export function buildFreeTierExpiringAlert(provider, daysLeft) {
  return {
    subject: `⚠️ Free tier ending: ${provider.name} (${daysLeft} days left)`,
    html: renderAlert({
      type: 'warning',
      title: `Free Tier Ending Soon`,
      message: `${provider.name}'s free tier expires in ${daysLeft} days. Consider adding a paid account or finding alternatives.`
    })
  };
}

export function buildBudgetWarningAlert(appName, period, spent, limit) {
  return {
    subject: `🔴 Budget warning: ${appName} at ${Math.round(spent / limit * 100)}%`,
    html: renderAlert({
      type: 'error',
      title: `Budget Warning: ${appName}`,
      message: `${period} spending is $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${Math.round(spent / limit * 100)}%).`,
      details: 'Requests may be rejected if the hard limit is reached.'
    })
  };
}
