// src/lib/storage.ts
// 统一本地键位管理和迁移逻辑

export const SJ_KEYS = {
  PROFILE: 'sj_profile',
  APPLICATIONS: 'sj_applications',
} as const;

/**
 * 从 chrome.storage.local 读取数据
 */
export async function getLocal<T = any>(key: string): Promise<T | undefined> {
  try {
    const data = await chrome.storage.local.get([key]);
    return data?.[key];
  } catch (error) {
    console.error(`Failed to get local storage key: ${key}`, error);
    return undefined;
  }
}

/**
 * 向 chrome.storage.local 写入数据
 */
export async function setLocal(key: string, value: any): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Failed to set local storage key: ${key}`, error);
    throw error;
  }
}

/**
 * 合并数据到现有键值
 */
export async function mergeLocal(key: string, value: any): Promise<void> {
  try {
    const existing = await getLocal(key) || {};
    const merged = deepMerge(existing, value);
    await setLocal(key, merged);
  } catch (error) {
    console.error(`Failed to merge local storage key: ${key}`, error);
    throw error;
  }
}

/**
 * 删除本地存储键
 */
export async function removeLocal(key: string): Promise<void> {
  try {
    await chrome.storage.local.remove([key]);
  } catch (error) {
    console.error(`Failed to remove local storage key: ${key}`, error);
    throw error;
  }
}

/**
 * 清空所有本地存储
 */
export async function clearLocal(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Failed to clear local storage', error);
    throw error;
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageSize(): Promise<number> {
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    return bytesInUse;
  } catch (error) {
    console.error('Failed to get storage size', error);
    return 0;
  }
}

/**
 * 深度合并对象
 */
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) {
    return source;
  }
  if (typeof source !== 'object' || source === null) {
    return target;
  }

  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

/**
 * 一次性迁移旧键位到新键位
 * 保持向后兼容性
 */
export async function migrateLegacyKeys(): Promise<void> {
  try {
    console.log('开始迁移旧键位到统一键位...');
    
    // 定义可能的旧键位
    const legacyProfileKeys = ['profile', 'user_profile', 'userProfile', 'autofill_profile'];
    const legacyAppsKeys = ['applications', 'job_tracker', 'jobTracker', 'autofill_applications'];
    
    // 迁移用户档案数据
    const existingProfile = await getLocal(SJ_KEYS.PROFILE);
    if (!existingProfile) {
      for (const legacyKey of legacyProfileKeys) {
        const legacyData = await getLocal(legacyKey);
        if (legacyData) {
          console.log(`迁移用户档案数据: ${legacyKey} -> ${SJ_KEYS.PROFILE}`);
          await setLocal(SJ_KEYS.PROFILE, legacyData);
          // 可选：删除旧键位（谨慎操作）
          // await removeLocal(legacyKey);
          break;
        }
      }
    }
    
    // 迁移投递记录数据
    const existingApps = await getLocal(SJ_KEYS.APPLICATIONS);
    if (!existingApps) {
      for (const legacyKey of legacyAppsKeys) {
        const legacyData = await getLocal(legacyKey);
        if (legacyData) {
          console.log(`迁移投递记录数据: ${legacyKey} -> ${SJ_KEYS.APPLICATIONS}`);
          // 确保数据格式正确（数组格式）
          const migratedData = Array.isArray(legacyData) ? legacyData : [];
          await setLocal(SJ_KEYS.APPLICATIONS, migratedData);
          // 可选：删除旧键位（谨慎操作）
          // await removeLocal(legacyKey);
          break;
        }
      }
    }
    
    console.log('键位迁移完成');
  } catch (error) {
    console.error('键位迁移失败:', error);
  }
}

/**
 * 获取用户档案数据
 */
export async function getUserProfile(): Promise<any> {
  return await getLocal(SJ_KEYS.PROFILE) || {};
}

/**
 * 保存用户档案数据
 */
export async function saveUserProfile(profile: any): Promise<void> {
  await setLocal(SJ_KEYS.PROFILE, profile);
}

/**
 * 获取投递记录列表
 */
export async function getApplications(): Promise<any[]> {
  return await getLocal(SJ_KEYS.APPLICATIONS) || [];
}

/**
 * 保存投递记录列表
 */
export async function saveApplications(applications: any[]): Promise<void> {
  await setLocal(SJ_KEYS.APPLICATIONS, applications);
}

/**
 * 添加新的投递记录
 */
export async function addApplication(application: any): Promise<void> {
  const applications = await getApplications();
  const newApp = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...application,
    createdAt: Date.now()
  };
  
  applications.unshift(newApp);
  
  // 保留最近500条记录
  const trimmedApps = applications.slice(0, 500);
  await saveApplications(trimmedApps);
}