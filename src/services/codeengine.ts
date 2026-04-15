import domo from 'ryuu.js';

/**
 * Call a Code Engine function via the packagesMapping alias.
 * Code Engine wraps return values in a `result` envelope,
 * and may also nest in `response` envelopes.
 */
export async function callCodeEngine(alias: string, params: Record<string, unknown>): Promise<any> {
  const response = (await domo.post(
    `/domo/codeengine/v2/packages/${alias}`,
    params
  )) as any;

  // Unwrap: response may be the raw object, or wrapped in body/data/response/result
  let current = response?.body ?? response?.data ?? response;

  // Unwrap nested response envelopes
  let depth = 0;
  while (current && typeof current === 'object' && 'response' in current && depth < 6) {
    current = current.response;
    depth += 1;
  }

  // Unwrap the `result` envelope that Code Engine adds
  if (current && typeof current === 'object' && 'result' in current) {
    current = current.result;
  }

  return current;
}
