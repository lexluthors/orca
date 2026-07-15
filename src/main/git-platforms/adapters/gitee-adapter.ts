import type {
  ConnectionTestResult,
  ListRemoteReposArgs,
  RemoteReposPage,
  RemoteRepository
} from '../../../shared/git-platforms'

const FETCH_TIMEOUT_MS = 10_000

const createAbortController = (): AbortController => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return controller
}

type GiteeRepo = {
  id: number
  name: string
  full_name: string
  path: string
  description: string | null
  html_url: string
  ssh_url: string
  default_branch: string
  private: boolean
  fork: boolean
  updated_at?: string
  pushed_at?: string
  stargazers_count: number
  forks_count: number
  language: string | null
  owner?: {
    login: string
    avatar_url?: string
  }
  namespace?: {
    name: string
    avatar_url?: string
  }
}

const mapGiteeRepo = (
  repo: GiteeRepo,
  connectionId: string
): RemoteRepository => ({
  id: String(repo.id),
  connectionId,
  platform: 'gitee',
  fullName: repo.full_name ?? repo.path,
  name: repo.name,
  description: repo.description,
  httpUrl: repo.html_url,
  sshUrl: repo.ssh_url,
  defaultBranch: repo.default_branch ?? 'master',
  isPrivate: repo.private,
  isFork: repo.fork,
  updatedAt: repo.pushed_at ?? repo.updated_at ?? new Date().toISOString(),
  starsCount: repo.stargazers_count,
  forksCount: repo.forks_count,
  language: repo.language,
  namespace: repo.namespace?.name ?? repo.owner?.login ?? '',
  namespaceAvatarUrl: repo.namespace?.avatar_url ?? repo.owner?.avatar_url
})

export const testConnection = async (
  baseUrl: string,
  token: string
): Promise<ConnectionTestResult> => {
  const start = Date.now()
  try {
    const controller = createAbortController()
    const url = `${baseUrl.replace(/\/$/, '')}/api/v5/user?access_token=${encodeURIComponent(token)}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    })
    const latencyMs = Date.now() - start
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs
      }
    }
    const data = (await response.json()) as {
      login?: string
      name?: string
      avatar_url?: string
    }
    return {
      success: true,
      user: data.login ?? data.name,
      avatarUrl: data.avatar_url,
      latencyMs
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - start
    }
  }
}

export const listRepos = async (
  baseUrl: string,
  token: string,
  args: ListRemoteReposArgs
): Promise<RemoteReposPage> => {
  const controller = createAbortController()
  const page = args.page ?? 1
  const perPage = args.perPage ?? 20
  const sortMap: Record<string, string> = {
    name: 'name',
    updated: 'updated_at',
    created: 'created_at',
    stars: 'stars_count'
  }
  const params = new URLSearchParams({
    access_token: token,
    page: String(page),
    per_page: String(perPage),
    sort: sortMap[args.sort ?? 'updated'] ?? 'updated_at',
    direction: args.order ?? 'desc',
    type: args.membership !== false ? 'member' : 'all'
  })
  if (args.visibility && args.visibility !== 'all') {
    params.set('visibility', args.visibility)
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/v5/user/repos?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: controller.signal
  })
  if (!response.ok) {
    throw new Error(`Gitee API error: HTTP ${response.status} ${response.statusText}`)
  }
  const repos = (await response.json()) as GiteeRepo[]
  const totalHeader = response.headers.get('total_count')
  const total = totalHeader ? parseInt(totalHeader, 10) : repos.length
  return {
    repos: repos.map((r) => mapGiteeRepo(r, args.connectionId)),
    total,
    page,
    perPage,
    hasMore: page * perPage < total
  }
}
