import type {
  GitPlatformType,
  ConnectionTestResult,
  ListRemoteReposArgs,
  RemoteReposPage,
  RemoteRepository,
  RemoteBranch
} from '../../shared/git-platforms'
import * as gitlabAdapter from './adapters/gitlab-adapter'
import * as githubAdapter from './adapters/github-adapter'
import * as giteeAdapter from './adapters/gitee-adapter'

export type PlatformAdapter = {
  testConnection(baseUrl: string, token: string): Promise<ConnectionTestResult>
  listRepos(baseUrl: string, token: string, args: ListRemoteReposArgs): Promise<RemoteReposPage>
  listBranches(baseUrl: string, token: string, repoId: string): Promise<RemoteBranch[]>
}

export const getAdapter = (type: GitPlatformType): PlatformAdapter => {
  switch (type) {
    case 'gitlab':
      return gitlabAdapter
    case 'github':
      return githubAdapter
    case 'gitee':
      return giteeAdapter
    default:
      throw new Error(`Unsupported git platform type: ${type as string}`)
  }
}

/**
 * Fetch ALL repos across every page, auto-paginating until exhausted.
 * Each page requests `perPage` items (default 100, the max for most APIs).
 */
export const fetchAllPages = async (
  adapter: PlatformAdapter,
  baseUrl: string,
  token: string,
  connectionId: string,
  args?: Omit<ListRemoteReposArgs, 'connectionId' | 'page' | 'perPage'>
): Promise<RemoteRepository[]> => {
  const perPage = 100
  const allRepos: RemoteRepository[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const result = await adapter.listRepos(baseUrl, token, {
      connectionId,
      page,
      perPage,
      ...args
    })
    allRepos.push(...result.repos)
    hasMore = result.hasMore && result.repos.length > 0
    page++
    // Safety cap — prevents runaway loops on broken pagination
    if (page > 50) {
      break
    }
  }

  return allRepos
}
