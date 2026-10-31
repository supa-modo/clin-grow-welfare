import { api } from './api';

export const recommendationFields = [
  { key: 'article', label: 'Constitution section/article', placeholder: 'e.g. Article 5, Section 2', maxLength: 200 },
  { key: 'currentStatement', label: 'Current statement in the constitution', placeholder: 'Copy the current wording here', maxLength: 5000 },
  { key: 'proposedAmendment', label: 'Proposed amendment', placeholder: 'What should the constitution say instead?', maxLength: 5000 },
  { key: 'justification', label: 'Justification', placeholder: 'Explain why you recommend this change', maxLength: 5000 },
] as const;

export type RecommendationInput = Record<(typeof recommendationFields)[number]['key'], string>;
export type ConstitutionRecommendation = RecommendationInput & {
  id: string; createdAt: string; batchId: string | null; position: number;
  submittedByName: string | null; submittedByEmail: string | null;
  submittedByPhone: string | null; membershipNumber: string | null;
};
export type RecommendationPage = { items: ConstitutionRecommendation[]; total: number; page: number; pageSize: number };

export const emptyRecommendation: RecommendationInput = { article: '', currentStatement: '', proposedAmendment: '', justification: '' };

export function recommendationError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 429) return 'Too many suggestions submitted. Please try again in 15 minutes.';
  if (status === 400) return 'Please complete all four fields and keep each statement within 5,000 characters (200 for the section/article).';
  if (status === 409) return 'This draft was already submitted with different content. Please make a change to start a new submission.';
  return 'We could not save your recommendation. Your text is still here. Please try again.';
}

export const constitutionRecommendationsApi = {
  submit: (data: { submissionId: string; recommendations: RecommendationInput[] }) => api.post<{ count: number }>('/constitution-recommendations', data, { skipAuthRedirect: true, timeout: 30000 }),
  list: async (page: number) => (await api.get<RecommendationPage>('/constitution-recommendations', { params: { page } })).data,
};
