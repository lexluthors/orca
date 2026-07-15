import type {
  ConnectionTestResult,
  ListRemoteReposArgs,
  RemoteReposPage,
  RemoteRepository,
  RemoteBranch
} from '../../../shared/git-platforms'

const FETCH_TIMEOUT_MS = 10_000

const createAbortController = (): AbortController => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return controller
}

type GitLabProject = {
  id: number
  name: string
  path_with_namespace: string
  description: string | null
  http_url_to_repo: string
  ssh_url_to_repo: string
  default_branch: string
  visibility: string
  forked_from_project?: unknown
  last_activity_at: string
  star_count: number
  forks_count: number
  namespace?: {
    name: string
    avatar_url?: string | null
  }
  languages?: string[]
  statistics?: {
    languages?: Record<string, number>
  }
}

const mapGitLabProject = (project: GitLabProject, connectionId: string): RemoteRepository => {
  const languages = project.languages ?? []
  const language = languages.length > 0 ? languages[0] : null
  return {
    id: String(project.id),
    connectionId,
    platform: 'gitlab',
    fullName: project.path_with_namespace,
    name: project.name,
    description: project.description,
    httpUrl: project.http_url_to_repo,
    sshUrl: project.ssh_url_to_repo,
    defaultBranch: project.default_branch ?? 'main',
    isPrivate: project.visibility === 'private',
    isFork: project.forked_from_project !== undefined,
    updatedAt: project.last_activity_at,
    starsCount: project.star_count,
    forksCount: project.forks_count,
    language,
    namespace: project.namespace?.name ?? '',
    namespaceAvatarUrl: project.namespace?.avatar_url ?? undefined
  }
}

export const testConnection = async (
  baseUrl: string,
  token: string
): Promise<ConnectionTestResult> => {
  const start = Date.now()
  try {
    const controller = createAbortController()
    const url = `${baseUrl.replace(/\/$/, '')}/api/v4/user`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PRIVATE-TOKEN': token
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
      username?: string
      name?: string
      avatar_url?: string
    }
    // Try to get server version from metadata endpoint
    let serverVersion: string | undefined
    try {
      const versionController = createAbortController()
      const versionResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v4/version`, {
        headers: {
          Accept: 'application/json',
          'PRIVATE-TOKEN': token
        },
        signal: versionController.signal
      })
      if (versionResponse.ok) {
        const versionData = (await versionResponse.json()) as { version?: string }
        serverVersion = versionData.version
      }
    } catch {
      // Version endpoint is optional
    }
    return {
      success: true,
      user: data.username ?? data.name,
      avatarUrl: data.avatar_url,
      serverVersion,
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
  const perPage = Math.min(args.perPage ?? 20, 100)
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order_by:
      args.sort === 'stars' ? 'star_count' : args.sort === 'name' ? 'name' : 'last_activity_at',
    sort: args.order ?? 'desc'
  })
  // membership param can cause 400 on some self-hosted instances with limited token scope
  if (args.membership === true) {
    params.set('membership', 'true')
  }
  if (args.query) {
    params.set('search', args.query)
  }
  if (args.visibility && args.visibility !== 'all') {
    params.set('visibility', args.visibility)
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/v4/projects?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'PRIVATE-TOKEN': token
    },
    signal: controller.signal
  })
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail =
        typeof body === 'object' && body !== null
          ? (body.message ?? body.error ?? JSON.stringify(body))
          : String(body)
    } catch {
      /* ignore parse failure */
    }
    throw new Error(
      `GitLab API error: HTTP ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}\nURL: ${url}`
    )
  }
  const projects = (await response.json()) as GitLabProject[]
  const totalHeader = response.headers.get('x-total')
  const total = totalHeader ? Number.parseInt(totalHeader, 10) : projects.length
  return {
    repos: projects.map((p) => mapGitLabProject(p, args.connectionId)),
    total,
    page,
    perPage,
    hasMore: page * perPage < total
  }
}

export const searchRepos = async (
  baseUrl: string,
  token: string,
  query: string,
  connectionId: string
): Promise<RemoteRepository[]> => {
  const controller = createAbortController()
  const params = new URLSearchParams({
    search: query,
    per_page: '20'
  })
  const url = `${baseUrl.replace(/\/$/, '')}/api/v4/projects?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'PRIVATE-TOKEN': token
    },
    signal: controller.signal
  })
  if (!response.ok) {
    throw new Error(`GitLab search error: HTTP ${response.status}`)
  }
  const projects = (await response.json()) as GitLabProject[]
  return projects.map((p) => mapGitLabProject(p, connectionId))
}

export const listBranches = async (
  baseUrl: string,
  token: string,
  repoIdOrPath: string
): Promise<RemoteBranch[]> => {
  const controller = createAbortController()
  const encodedId = encodeURIComponent(repoIdOrPath)
  const url = `${baseUrl.replace(/\/$/, '')}/api/v4/projects/${encodedId}/repository/branches?per_page=100`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'PRIVATE-TOKEN': token
    },
    signal: controller.signal
  })
  if (!response.ok) {
    throw new Error(`GitLab API error: HTTP ${response.status} ${response.statusText}`)
  }
  const branches = (await response.json()) as {
    name: string
    default?: boolean
    protected?: boolean
    commit?: { id: string }
  }[]
  return branches.map((b) => ({
    name: b.name,
    isDefault: b.default ?? false,
    isProtected: b.protected,
    commitSha: b.commit?.id
  }))
}
