/** Supported ModelScope Qwen models (single allowlist for the whole app). */
export const MODELSCOPE_MODELS = Object.freeze([
  'Qwen-Ambassador/Qwen3.7-Max',
  'Qwen-Ambassador/Qwen3.8-Max',
  'Qwen-Ambassador/Qwen3.8-plus',
  'Qwen-Ambassador/Qwen3.7-Plus',
]);

export const DEFAULT_MODELSCOPE_MODEL = MODELSCOPE_MODELS[0];

export function isAllowedModelScopeModel(model) {
  return MODELSCOPE_MODELS.includes(String(model || '').trim());
}

export function assertAllowedModelScopeModel(model) {
  const value = String(model || '').trim();
  if (!isAllowedModelScopeModel(value)) {
    throw new Error(
      `Unsupported ModelScope model: ${value || '(empty)'}. Allowed: ${MODELSCOPE_MODELS.join(', ')}`,
    );
  }
  return value;
}
