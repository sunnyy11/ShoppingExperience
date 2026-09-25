import './load-env';

export interface EnvConfig {
  baseURL: string;
  automationExerciseTestEmail1: string;
  automationExerciseTestPassword1: string;
  automationExerciseTestEmail2: string;
  automationExerciseTestPassword2: string;
  automationExerciseTestEmail3: string;
  automationExerciseTestPassword3: string;
  automationExerciseTestEmail4: string;
  automationExerciseTestPassword4: string;
  mailosaurApiKey: string;
  mailosaurServerId: string;
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env; see .env.example.`,
    );
  }

  return value;
}

export const env: EnvConfig = {
  baseURL: requiredEnvironmentVariable('BASE_URL'),
  automationExerciseTestEmail1: requiredEnvironmentVariable('AUTOMATION_EXERCISE_TEST_EMAIL_1'),
  automationExerciseTestPassword1: requiredEnvironmentVariable(
    'AUTOMATION_EXERCISE_TEST_PASSWORD_1',
  ),
  automationExerciseTestEmail2: requiredEnvironmentVariable('AUTOMATION_EXERCISE_TEST_EMAIL_2'),
  automationExerciseTestPassword2: requiredEnvironmentVariable(
    'AUTOMATION_EXERCISE_TEST_PASSWORD_2',
  ),
  automationExerciseTestEmail3: requiredEnvironmentVariable('AUTOMATION_EXERCISE_TEST_EMAIL_3'),
  automationExerciseTestPassword3: requiredEnvironmentVariable(
    'AUTOMATION_EXERCISE_TEST_PASSWORD_3',
  ),
  automationExerciseTestEmail4: requiredEnvironmentVariable('AUTOMATION_EXERCISE_TEST_EMAIL_4'),
  automationExerciseTestPassword4: requiredEnvironmentVariable(
    'AUTOMATION_EXERCISE_TEST_PASSWORD_4',
  ),
  mailosaurApiKey: requiredEnvironmentVariable('MAILOSAUR_API_KEY'),
  mailosaurServerId: requiredEnvironmentVariable('MAILOSAUR_SERVER_ID'),
};
