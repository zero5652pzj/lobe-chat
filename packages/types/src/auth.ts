/* eslint-disable typescript-sort-keys/interface */
export interface ClientSecretPayload {
  /**
   * password
   */
  accessCode?: string;
  /**
   * Represents the user's API key
   *
   * If provider need multi keys like bedrock,
   * this will be used as the checker whether to use frontend key
   */
  apiKey?: string;
  /**
   * Represents the endpoint of provider
   */
  baseURL?: string;

  azureApiVersion?: string;

  awsAccessKeyId?: string;
  awsRegion?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;

  cloudflareBaseURLOrAccountID?: string;

  /**
   * user id
   * in client db mode it's a uuid
   * in server db mode it's a user id
   */
  userId?: string;
}
/* eslint-enable */
