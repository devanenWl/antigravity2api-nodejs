import quotaManager from '../../../auth/quota_manager.js';
import logger from '../../../utils/logger.js';

/**
 * 按需刷新当前 token 的额度数据，并在额度不足时尝试切换到下一个 token。
 */
export async function ensureFreshTokenQuota({ tokenManager, getModelsWithQuotas, modelId, token, tokenId, loggerPrefix = '' }) {
  if (!token || !tokenId || !modelId) {
    return { token, tokenId };
  }

  const hasFreshQuota = !!quotaManager.getQuota(tokenId);
  const hasQuotaData = quotaManager.hasQuotaData(tokenId);
  if (hasFreshQuota && hasQuotaData) {
    return { token, tokenId };
  }

  try {
    const quotas = await getModelsWithQuotas(token);
    quotaManager.updateQuota(tokenId, quotas);
  } catch (error) {
    logger.warn(`${loggerPrefix}刷新额度失败: ${error.message}`);
    return { token, tokenId };
  }

  if (quotaManager.hasQuotaForModel(tokenId, modelId)) {
    return { token, tokenId };
  }

  logger.warn(`${loggerPrefix}Token ${tokenId} 对模型 ${modelId} 无可用额度，尝试切换 token`);
  const nextToken = await tokenManager.getToken(modelId);
  if (!nextToken) {
    return { token: null, tokenId: null };
  }

  return {
    token: nextToken,
    tokenId: await tokenManager.getTokenId(nextToken)
  };
}
