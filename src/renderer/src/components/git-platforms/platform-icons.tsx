import React from 'react'
import { Github } from 'lucide-react'
import type { GitPlatformType } from '../../../../shared/git-platforms'

export function GitLabIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  )
}

export function GiteeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.984 2A9.984 9.984 0 0 0 2 11.984a9.984 9.984 0 0 0 9.984 9.984 9.984 9.984 0 0 0 9.984-9.984A9.984 9.984 0 0 0 11.984 2zm7.26 10.608c0 .504-.396.9-.9.9h-3.18c-.3 0-.54.24-.54.54v3.18c0 .504-.396.9-.9.9h-1.44c-.504 0-.9-.396-.9-.9v-3.18c0-.3-.24-.54-.54-.54h-3.18c-.504 0-.9-.396-.9-.9v-1.44c0-.504.396-.9.9-.9h3.18c.3 0 .54-.24.54-.54v-3.18c0-.504.396-.9.9-.9h1.44c.504 0 .9.396.9.9v3.18c0 .3.24.54.54.54h3.18c.504 0 .9.396.9.9v1.44z" />
    </svg>
  )
}

export function PlatformIcon({
  type,
  className
}: {
  type: GitPlatformType
  className?: string
}): React.JSX.Element {
  switch (type) {
    case 'github':
      return <Github className={className} />
    case 'gitlab':
      return <GitLabIcon className={className} />
    case 'gitee':
      return <GiteeIcon className={className} />
  }
}
