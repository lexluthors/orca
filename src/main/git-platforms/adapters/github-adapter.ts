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

type GitHubRepo = {
  id: number
  name: string
  full_name: string
  description: string | null
  clone_url: string
  ssh_url: string
  default_branch: string
  private: boolean
  fork: boolean
  updated_at: string
  pushed_at?: string
  stargazers_count: number
  forks_count: number
  language: string | null
  owner?: {
    login: string
    avatar_url?: string
  }
  visibility?: string
}

const mapGitHubRepo = (
  repo: GitHubRepo,
  connectionId: string
): RemoteRepository => ({
  id: String(repo.id),
  connectionId,
  platform: 'github',
  fullName: repo.full_name,
  name: repo.name,
  description: repo.description,
  httpUrl: repo.clone_url,
  sshUrl: repo.ssh_url,
  defaultBranch: repo.default_branch ?? 'main',
  isPrivate: repo.private,
  isFork: repo.fork,
  updatedAt: repo.pushed_at ?? repo.updated_at,
  starsCount: repo.stargazers_count,
  forksCount: repo.forks_count,
  language: repo.language,
  namespace: repo.owner?.login ?? '',
  namespaceAvatarUrl: repo.owner?.avatar_url
})

export const testConnection = async (
  baseUrl: string,
  token: string
): Promise<ConnectionTestResult> => {
  const start = Date.now()
  try {
    const controller = createAbortController()
    const url = `${baseUrl.replace(/\/$/, '')}/user`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
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
  const perPage = args.perPage ?? 30
  const sortMap: Record<string, string> = {
    name: 'full_name',
    updated: 'updated',
    created: 'created',
    stars: 'pushed'
  }
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort: sortMap[args.sort ?? 'updated'] ?? 'updated',
    direction: args.order ?? 'desc',
    type: args.membership !== false ? 'member' : 'all'
  })
  if (args.visibility && args.visibility !== 'all') {
    params.set('visibility', args.visibility)
  }
  const url = `${baseUrl.replace(/\/$/, '')}/user/repos?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: controller.signal
  })
  if (!response.ok) {
    throw new Error(`GitHub API error: HTTP ${response.status} ${response.statusText}`)
  }
  const repos = (await response.json()) as GitHubRepo[]
  // GitHub uses Link header for pagination; parse next page existence
  const linkHeader = response.headers.get('link')
  const hasNext = linkHeader !== null && linkHeader.includes('rel="next"')
  return {
    repos: repos.map((r) => mapGitHubRepo(r, args.connectionId)),
    total: repos.length,
    page,
    perPage,
    hasMore: hasNext
  }
}
