/**
 * Shared types and constants for the Git Platform Manager.
 * Used by main process (service + IPC) and renderer (UI + store).
 */

/** Supported git hosting platforms. */
export type GitPlatformType = 'github' | 'gitlab' | 'gitee'

/** Authentication token type. */
export type GitPlatformTokenType = 'pat' | 'oauth'

/** A configured connection to a git hosting platform. */
export type GitPlatformConnection = {
  id: string
  type: GitPlatformType
  /** Display name, e.g. "Company GitLab" */
  name: string
  /** API base URL, e.g. "http://192.168.10.34:9090" or "https://api.github.com" */
  baseUrl: string
  /** Access token (stored encrypted when safeStorage is available). */
  token: string
  tokenType: GitPlatformTokenType
  defaultBranch?: string
  sshEnabled: boolean
  sshKeyPath?: string
  lastSyncAt?: number
  createdAt: number
  updatedAt: number
}

/** Input for creating a new platform connection. */
export type CreateGitPlatformConnectionArgs = {
  type: GitPlatformType
  name: string
  baseUrl: string
  token: string
  tokenType?: GitPlatformTokenType
  defaultBranch?: string
  sshEnabled?: boolean
  sshKeyPath?: string
}

/** Input for updating an existing platform connection. */
export type UpdateGitPlatformConnectionArgs = {
  name?: string
  baseUrl?: string
  token?: string
  tokenType?: GitPlatformTokenType
  defaultBranch?: string
  sshEnabled?: boolean
  sshKeyPath?: string
}

/** Result of testing a platform connection. */
export type ConnectionTestResult = {
  success: boolean
  /** Authenticated user name or login. */
  user?: string
  /** Authenticated user avatar URL. */
  avatarUrl?: string
  /** Platform version (e.g. GitLab "16.8.0"). */
  serverVersion?: string
  /** Error message when success is false. */
  error?: string
  /** Response time in milliseconds. */
  latencyMs?: number
}

/** A remote repository fetched from a git platform. */
export type RemoteRepository = {
  /** Platform-internal ID (numeric for GitLab, numeric for GitHub). */
  id: string
  /** Reference to the parent GitPlatformConnection. */
  connectionId: string
  platform: GitPlatformType
  /** Full name including namespace, e.g. "group/subgroup/repo". */
  fullName: string
  /** Short name, e.g. "repo". */
  name: string
  description: string | null
  httpUrl: string
  sshUrl: string
  defaultBranch: string
  isPrivate: boolean
  isFork: boolean
  /** ISO-8601 date string of last push/update. */
  updatedAt: string
  starsCount: number
  forksCount: number
  language: string | null
  /** Namespace / owner display name. */
  namespace: string
  /** Namespace / owner avatar URL. */
  namespaceAvatarUrl?: string
  /** Locally cloned repo ID (orca internal), or null. */
  localRepoId?: string | null
}

/** Arguments for listing remote repositories. */
export type ListRemoteReposArgs = {
  connectionId: string
  page?: number
  perPage?: number
  query?: string
  /** Filter by visibility. */
  visibility?: 'all' | 'public' | 'private'
  /** Filter by membership (repos the user is a member of). */
  membership?: boolean
  /** Sort field. */
  sort?: 'name' | 'updated' | 'created' | 'stars'
  /** Sort direction. */
  order?: 'asc' | 'desc'
}

/** Paginated result wrapper for remote repositories. */
export type RemoteReposPage = {
  repos: RemoteRepository[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

/** Default API base URLs per platform type. */
export const GIT_PLATFORM_DEFAULT_URLS: Record<GitPlatformType, string> = {
  github: 'https://api.github.com',
  gitlab: 'https://gitlab.com',
  gitee: 'https://gitee.com/api/v5'
}

/** Display labels for platform types. */
export const GIT_PLATFORM_LABELS: Record<GitPlatformType, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  gitee: 'Gitee'
}

/** Generate a unique ID for a connection. */
export function generateConnectionId(): string {
  return `gp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
