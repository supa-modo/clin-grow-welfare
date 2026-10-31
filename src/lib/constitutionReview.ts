export const constitutionSuggestionsPath = '/constitution-suggestions';

// Only the intended form may override the normal workspace destination.
export function constitutionReturnTo(value: string | null) {
  return value === constitutionSuggestionsPath ? constitutionSuggestionsPath : null;
}

export function constitutionLoginPath(expired = false) {
  const params = new URLSearchParams({ returnTo: constitutionSuggestionsPath });
  if (expired) params.set('session', 'expired');
  return `/login?${params.toString()}`;
}
