// Example secure credentials - Copy this to config.local.ts and populate with your own details
export const AZURE_OPENAI_CONFIG = {
  encryptedApiKey: "YOUR_ENCRYPTED_AZURE_OPENAI_API_KEY",
  apiKeySignature: "YOUR_API_KEY_SIGNATURE",
  endpoint: "https://your-resource-name.openai.azure.com/",
  apiVersion: "2025-04-01-preview",
  deploymentName: "gpt-4",
  dalleDeploymentName: "gpt-image-1",
};
