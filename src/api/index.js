/**
 * API 适配层
 * 三层降级策略
 * 优先使用后端 API，后端不可用时：
 *   1. 优先读取 localStorage 缓存（用户之前添加的数据）
 *   2. 没有缓存则使用默认 Mock 数据
 *
 * 成功获取后端数据时会自动更新 localStorage 缓存
 *
 * 切换后端：改 API_BASE 地址即可
 */
// 导入 mock 数据相关的工具函数
import { getData, saveData, generateId } from './mockData'

// ============ API 配置 ============
// 直接连接 Express 后端
// 开发环境: http://localhost:5000 (对应 .env.development)
// 生产环境: https://api.example.com (对应 .env.production)
// 从环境变量读取 API 基础地址，若未配置则使用默认值 http://localhost:5000
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'
// localStorage 缓存的统一键名，所有 API 数据都存储在这个键下
const CACHE_KEY = 'portfolio_api_cache'
// 数据来源控制标志：false=后端API，'cache'=localStorage缓存，true=默认Mock数据
let useMock = false

// ============ localStorage 缓存操作函数 ============

// 获取所有缓存数据
function getCache() {
  try {
    // 从 localStorage 中获取缓存字符串
    const cache = localStorage.getItem(CACHE_KEY)
    // 若存在则解析为对象，否则返回 null
    return cache ? JSON.parse(cache) : null
  } catch {
    // 解析失败时返回 null
    return null
  }
}

// 设置缓存数据
function setCache(key, data) {
  try {
    // 获取现有缓存，若不存在则创建空对象
    const cache = getCache() || {}
    // 将数据存入缓存对象
    cache[key] = data
    // 记录数据更新时间戳
    cache[key + '_time'] = Date.now()
    // 将更新后的缓存对象序列化并保存到 localStorage
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    // 缓存写入失败时输出警告
    console.warn('缓存写入失败:', e)
  }
}

// 从缓存中获取指定键的数据
function getFromCache(key) {
  // 获取所有缓存
  const cache = getCache()
  // 若缓存存在则返回指定键的数据，否则返回 null
  return cache ? cache[key] : null
}

// 获取认证请求头
function getAuthHeaders() {
  // 从 localStorage 中获取用户登录 token
  const token = localStorage.getItem('token')
  // 若存在 token，则返回 Authorization 头（Bearer 认证方式），否则返回空对象
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// 初始化 API：尝试连接后端，如果失败则降级使用缓存或 Mock 数据
export async function initAPI() {
  try {
    // 尝试发送请求到后端 /api/profile 接口，验证后端是否可用
    const response = await fetch(`${API_BASE}/api/profile`, {
      timeout: 5000 // 设置 5 秒超时
    })
    // 如果响应状态码在 200-299 之间，表示后端可用
    if (response.ok) {
      // 设置为使用后端 API 模式
      useMock = false
      console.log('后端连接成功，使用真实 API')
      // 返回 'success' 表示连接成功
      return 'success'
    }
  } catch (e) {
    // 请求失败（网络错误、超时等），输出日志
    console.log('后端不可用，尝试使用缓存数据')
  }

  // 后端不可用，检查 localStorage 中是否有缓存数据
  const cache = getCache()
  // 如果缓存存在且包含项目、奖项或经历数据
  if (cache && (cache.projects || cache.awards || cache.experience)) {
    console.log('使用 localStorage 缓存数据')
    // 设置为使用缓存模式
    useMock = 'cache'
    // 返回 'cache' 表示使用缓存
    return 'cache'
  }

  // 无缓存数据，设置为使用 Mock 数据模式
  useMock = true
  console.log('无缓存，使用默认 Mock 数据')
  // 返回 'mock' 表示使用 Mock 数据
  return 'mock'
}

// ==================== 个人信息 ====================

// 获取个人信息
export async function getProfile() {
  // 如果是纯 Mock 模式，直接返回 mock 数据
  if (useMock === true) {
    return getData().profile
  }

  try {
    // 发送 GET 请求到后端 /api/profile 接口
    const res = await fetch(`${API_BASE}/api/profile`)
    // 如果响应状态码不在 200-299 之间，抛出错误
    if (!res.ok) throw new Error('API error')
    // 解析响应为 JSON
    const data = await res.json()
    // 兼容后端返回格式：优先取 data 字段，若不存在则取整个响应
    const profile = data.data || data
    // 如果后端返回空数据或没有 name 字段，使用 Mock 数据
    if (!profile || !profile.name) {
      console.log('后端数据为空，使用默认 Mock 数据')
      return getData().profile
    }
    // 将获取到的数据缓存到 localStorage
    setCache('profile', profile)
    // 返回个人信息数据
    return profile
  } catch (error) {
    // 获取失败时输出错误日志
    console.error('获取个人信息失败，尝试缓存:', error)
    // 尝试从缓存中获取数据
    const cached = getFromCache('profile')
    // 如果缓存存在则返回缓存数据
    if (cached) return cached
    // 缓存也不存在，切换到 Mock 模式
    useMock = true
    // 返回 Mock 数据
    return getData().profile
  }
}

// 更新个人信息
export async function updateProfile(profileData) {
  // 如果是纯 Mock 模式，更新 Mock 数据并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 使用传入的数据更新 profile（保留原有字段，覆盖新字段）
    allData.profile = { ...allData.profile, ...profileData }
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果
    return { success: true }
  }

  try {
    // 从 localStorage 获取用户登录 token
    const token = localStorage.getItem('token')
    // 设置请求头，指定 Content-Type 为 JSON
    const headers = { 'Content-Type': 'application/json' }
    // 如果存在 token，添加 Authorization 头
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 发送 PUT 请求到后端 /api/profile 接口
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: headers,
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(profileData)
    })

    // 检查响应状态码
    if (!res.ok) {
      // 解析错误响应数据
      const errorData = await res.json()
      // 如果是 401 状态码（未授权），提示登录过期
      if (res.status === 401) {
        throw new Error(errorData.error || '登录已过期，请重新登录')
      }
      // 其他错误，抛出具体错误信息
      throw new Error(errorData.error || '更新失败')
    }

    // 解析成功响应数据
    const result = await res.json()
    // 兼容后端返回格式：优先取 data 字段，若不存在则取整个响应
    const updatedProfile = result.data || result
    // 将更新后的数据缓存到 localStorage
    setCache('profile', updatedProfile)
    // 返回更新后的个人信息
    return updatedProfile
  } catch (error) {
    // 更新失败时输出错误日志
    console.error('更新个人信息失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// ==================== 项目管理 ====================

// 获取项目列表
export async function getProjects() {
  // 如果是纯 Mock 模式，直接返回 mock 数据
  if (useMock === true) {
    return getData().projects
  }

  try {
    // 发送 GET 请求到后端 /api/project 接口
    const res = await fetch(`${API_BASE}/api/project`)
    // 如果响应状态码不在 200-299 之间，抛出错误
    if (!res.ok) throw new Error('API error')
    // 解析响应为 JSON
    const data = await res.json()
    // 兼容后端返回格式：优先取 data 字段，若不存在则取整个响应，默认空数组
    const projects = data.data || data || []
    // 如果后端返回空数据或数组长度为 0，使用 Mock 数据
    if (!projects || projects.length === 0) {
      console.log('后端数据为空，使用默认 Mock 数据')
      return getData().projects
    }
    // 将获取到的数据缓存到 localStorage
    setCache('projects', projects)
    // 返回项目列表
    return projects
  } catch (error) {
    // 获取失败时输出错误日志
    console.error('获取项目列表失败，尝试缓存:', error)
    // 尝试从缓存中获取数据
    const cached = getFromCache('projects')
    // 如果缓存存在则返回缓存数据
    if (cached) return cached
    // 缓存也不存在，切换到 Mock 模式
    useMock = true
    // 返回 Mock 数据
    return getData().projects
  }
}

// 添加项目
export async function addProject(projectData) {
  // 如果是纯 Mock 模式，添加到 Mock 数据并返回成功
  if (useMock === true) {
    // 生成新项目对象，包含自动生成的 ID 和传入的数据
    const newProject = { _id: generateId(), ...projectData }
    // 获取所有 Mock 数据
    const allData = getData()
    // 将新项目添加到数组末尾
    allData.projects.push(newProject)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果和新项目数据
    return { success: true, data: newProject }
  }

  try {
    // 发送 POST 请求到后端 /api/project 接口
    const res = await fetch(`${API_BASE}/api/project`, {
      method: 'POST',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(projectData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取项目列表以刷新数据
    const projects = await getProjects()
    // 更新缓存
    setCache('projects', projects)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 添加失败时输出错误日志
    console.error('添加项目失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 更新项目
export async function updateProject(projectData) {
  // 如果是纯 Mock 模式，更新 Mock 数据并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 查找要更新的项目索引
    const index = allData.projects.findIndex(p => p._id === projectData._id)
    // 如果找到匹配的项目
    if (index !== -1) {
      // 更新项目数据（保留原有字段，覆盖新字段）
      allData.projects[index] = { ...allData.projects[index], ...projectData }
      // 保存更新后的 Mock 数据
      saveData(allData)
    }
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 PUT 请求到后端 /api/project 接口
    const res = await fetch(`${API_BASE}/api/project`, {
      method: 'PUT',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(projectData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取项目列表以刷新数据
    const projects = await getProjects()
    // 更新缓存
    setCache('projects', projects)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 更新失败时输出错误日志
    console.error('更新项目失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 删除项目
export async function deleteProject(id) {
  // 如果是纯 Mock 模式，从 Mock 数据中删除并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 过滤掉指定 ID 的项目
    allData.projects = allData.projects.filter(p => p._id !== id)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 DELETE 请求到后端 /api/project/{id} 接口
    const res = await fetch(`${API_BASE}/api/project/${id}`, {
      method: 'DELETE',
      // 设置认证请求头
      headers: { ...getAuthHeaders() }
    })
    // 解析响应数据
    const result = await res.json()
    // 获取当前缓存的项目列表，默认为空数组
    const cached = getFromCache('projects') || []
    // 从缓存中过滤掉已删除的项目
    setCache('projects', cached.filter(p => p.id !== id))
    // 返回后端响应结果
    return result
  } catch (error) {
    // 删除失败时输出错误日志
    console.error('删除项目失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// ==================== 奖项管理 ====================

// 获取奖项列表
export async function getAwards() {
  // 如果是纯 Mock 模式，直接返回 mock 数据
  if (useMock === true) {
    return getData().awards
  }

  try {
    // 发送 GET 请求到后端 /api/awards 接口
    const res = await fetch(`${API_BASE}/api/awards`)
    // 如果响应状态码不在 200-299 之间，抛出错误
    if (!res.ok) throw new Error('API error')
    // 解析响应为 JSON
    const data = await res.json()
    // 兼容后端返回格式：优先取 data 字段，若不存在则取整个响应，默认空数组
    const awards = data.data || data || []
    // 如果后端返回空数据或数组长度为 0，使用 Mock 数据
    if (!awards || awards.length === 0) {
      console.log('后端数据为空，使用默认 Mock 数据')
      return getData().awards
    }
    // 将获取到的数据缓存到 localStorage
    setCache('awards', awards)
    // 返回奖项列表
    return awards
  } catch (error) {
    // 获取失败时输出错误日志
    console.error('获取奖项列表失败，尝试缓存:', error)
    // 尝试从缓存中获取数据
    const cached = getFromCache('awards')
    // 如果缓存存在则返回缓存数据
    if (cached) return cached
    // 缓存也不存在，切换到 Mock 模式
    useMock = true
    // 返回 Mock 数据
    return getData().awards
  }
}

// 添加奖项
export async function addAward(awardData) {
  // 如果是纯 Mock 模式，添加到 Mock 数据并返回成功
  if (useMock === true) {
    // 生成新奖项对象，包含自动生成的 ID 和传入的数据
    const newAward = { _id: generateId(), ...awardData }
    // 获取所有 Mock 数据
    const allData = getData()
    // 将新奖项添加到数组末尾
    allData.awards.push(newAward)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果和新奖项数据
    return { success: true, data: newAward }
  }

  try {
    // 发送 POST 请求到后端 /api/awards 接口
    const res = await fetch(`${API_BASE}/api/awards`, {
      method: 'POST',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(awardData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取奖项列表以刷新数据
    const awards = await getAwards()
    // 更新缓存
    setCache('awards', awards)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 添加失败时输出错误日志
    console.error('添加奖项失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 更新奖项
export async function updateAward(awardData) {
  // 如果是纯 Mock 模式，更新 Mock 数据并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 查找要更新的奖项索引
    const index = allData.awards.findIndex(a => a._id === awardData._id)
    // 如果找到匹配的奖项
    if (index !== -1) {
      // 更新奖项数据（保留原有字段，覆盖新字段）
      allData.awards[index] = { ...allData.awards[index], ...awardData }
      // 保存更新后的 Mock 数据
      saveData(allData)
    }
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 PUT 请求到后端 /api/awards 接口
    const res = await fetch(`${API_BASE}/api/awards`, {
      method: 'PUT',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(awardData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取奖项列表以刷新数据
    const awards = await getAwards()
    // 更新缓存
    setCache('awards', awards)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 更新失败时输出错误日志
    console.error('更新奖项失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 删除奖项
export async function deleteAward(id) {
  // 如果是纯 Mock 模式，从 Mock 数据中删除并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 过滤掉指定 ID 的奖项
    allData.awards = allData.awards.filter(a => a._id !== id)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 DELETE 请求到后端 /api/awards/{id} 接口
    const res = await fetch(`${API_BASE}/api/awards/${id}`, {
      method: 'DELETE',
      // 设置认证请求头
      headers: { ...getAuthHeaders() }
    })
    // 解析响应数据
    const result = await res.json()
    // 获取当前缓存的奖项列表，默认为空数组
    const cached = getFromCache('awards') || []
    // 从缓存中过滤掉已删除的奖项
    setCache('awards', cached.filter(a => a.id !== id))
    // 返回后端响应结果
    return result
  } catch (error) {
    // 删除失败时输出错误日志
    console.error('删除奖项失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// ==================== 校园经历 ====================

// 获取校园经历列表
export async function getExperience() {
  // 如果是纯 Mock 模式，直接返回 mock 数据
  if (useMock === true) {
    return getData().experience
  }

  try {
    // 发送 GET 请求到后端 /api/experiences 接口
    const res = await fetch(`${API_BASE}/api/experiences`)
    // 如果响应状态码不在 200-299 之间，抛出错误
    if (!res.ok) throw new Error('API error')
    // 解析响应为 JSON
    const data = await res.json()
    // 兼容后端返回格式：优先取 data 字段，若不存在则取整个响应，默认空数组
    const experience = data.data || data || []
    // 如果后端返回空数据或数组长度为 0，使用 Mock 数据
    if (!experience || experience.length === 0) {
      console.log('后端数据为空，使用默认 Mock 数据')
      return getData().experience
    }
    // 将获取到的数据缓存到 localStorage
    setCache('experience', experience)
    // 返回校园经历列表
    return experience
  } catch (error) {
    // 获取失败时输出错误日志
    console.error('获取经历列表失败，尝试缓存:', error)
    // 尝试从缓存中获取数据
    const cached = getFromCache('experience')
    // 如果缓存存在则返回缓存数据
    if (cached) return cached
    // 缓存也不存在，切换到 Mock 模式
    useMock = true
    // 返回 Mock 数据
    return getData().experience
  }
}

// 添加校园经历
export async function addExperience(experienceData) {
  // 如果是纯 Mock 模式，添加到 Mock 数据并返回成功
  if (useMock === true) {
    // 生成新经历对象，包含自动生成的 ID 和传入的数据
    const newExperience = { _id: generateId(), ...experienceData }
    // 获取所有 Mock 数据
    const allData = getData()
    // 将新经历添加到数组末尾
    allData.experience.push(newExperience)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果和新经历数据
    return { success: true, data: newExperience }
  }

  try {
    // 发送 POST 请求到后端 /api/experiences 接口
    const res = await fetch(`${API_BASE}/api/experiences`, {
      method: 'POST',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(experienceData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取经历列表以刷新数据
    const experience = await getExperience()
    // 更新缓存
    setCache('experience', experience)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 添加失败时输出错误日志
    console.error('添加经历失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 更新校园经历
export async function updateExperience(experienceData) {
  // 如果是纯 Mock 模式，更新 Mock 数据并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 查找要更新的经历索引
    const index = allData.experience.findIndex(e => e._id === experienceData._id)
    // 如果找到匹配的经历
    if (index !== -1) {
      // 更新经历数据（保留原有字段，覆盖新字段）
      allData.experience[index] = { ...allData.experience[index], ...experienceData }
      // 保存更新后的 Mock 数据
      saveData(allData)
    }
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 PUT 请求到后端 /api/experiences 接口
    const res = await fetch(`${API_BASE}/api/experiences`, {
      method: 'PUT',
      // 设置请求头：JSON 格式 + 认证头
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      // 将数据序列化为 JSON 字符串作为请求体
      body: JSON.stringify(experienceData)
    })
    // 解析响应数据
    const result = await res.json()
    // 重新获取经历列表以刷新数据
    const experience = await getExperience()
    // 更新缓存
    setCache('experience', experience)
    // 返回后端响应结果
    return result
  } catch (error) {
    // 更新失败时输出错误日志
    console.error('更新经历失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// 删除校园经历
export async function deleteExperience(id) {
  // 如果是纯 Mock 模式，从 Mock 数据中删除并返回成功
  if (useMock === true) {
    // 获取所有 Mock 数据
    const allData = getData()
    // 过滤掉指定 ID 的经历
    allData.experience = allData.experience.filter(e => e._id !== id)
    // 保存更新后的 Mock 数据
    saveData(allData)
    // 返回成功结果
    return { success: true }
  }

  try {
    // 发送 DELETE 请求到后端 /api/experiences/{id} 接口
    const res = await fetch(`${API_BASE}/api/experiences/${id}`, {
      method: 'DELETE',
      // 设置认证请求头
      headers: { ...getAuthHeaders() }
    })
    // 解析响应数据
    const result = await res.json()
    // 获取当前缓存的经历列表，默认为空数组
    const cached = getFromCache('experience') || []
    // 从缓存中过滤掉已删除的经历
    setCache('experience', cached.filter(e => e.id !== id))
    // 返回后端响应结果
    return result
  } catch (error) {
    // 删除失败时输出错误日志
    console.error('删除经历失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}

// ==================== 简历管理 ====================

// 获取简历信息
export async function getResume() {
  // 返回默认简历路径（项目要求：图片使用 URL 输入方式，不做上传存储）
  return { url: '/resume.pdf' }
}

// 上传简历
export async function uploadResume(file) {
  // 如果是纯 Mock 模式，返回模拟成功信息
  if (useMock === true) {
    return { success: true, message: 'Mock 模式：简历上传已模拟' }
  }

  try {
    // 创建 FormData 对象用于上传文件
    const formData = new FormData()
    // 将文件添加到 FormData
    formData.append('file', file)

    // 发送 POST 请求到后端 /upload-resume 接口
    const res = await fetch(`${API_BASE}/upload-resume`, {
      method: 'POST',
      // 设置认证请求头（注意：上传文件时不要设置 Content-Type，浏览器会自动设置为 multipart/form-data）
      headers: getAuthHeaders(),
      // 将 FormData 作为请求体
      body: formData
    })
    // 解析响应数据并返回
    return await res.json()
  } catch (error) {
    // 上传失败时输出错误日志
    console.error('上传简历失败:', error)
    // 将错误向上抛出，由调用方处理
    throw error
  }
}
