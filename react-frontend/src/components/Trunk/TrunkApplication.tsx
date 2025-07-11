import React from 'react'
import { ApplicationBranch, Leaf } from '@/lib/types'

interface ApplicationTree {
  root: string;
  branches: ApplicationBranch[];
}

interface TrunkApplicationProps {
  tree: ApplicationTree;
}

const TrunkApplication: React.FC<TrunkApplicationProps> = ({ tree }) => {
  const removeProtocol = (url: string) => {
    return url.replace(/(^\w+:|^)\/\//, '')
  }

  return (
    <div className="relative grid max-w-[90rem] grid-cols-[repeat(auto-fill,minmax(280px,280px))] gap-6 px-8">
      {tree.branches.map((branch, branchIndex) => (
        <div 
          key={branch.id} 
          className="group relative flex w-[280px] min-h-[200px] animate-fade-in flex-col p-4 transition-all duration-200 ease-in-out"
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
        >
          <div className="relative mb-4 flex flex-col">
            <div className="relative text-sm font-medium tracking-[-0.01em] text-text-primary after:absolute after:bottom-0 after:left-0 after:h-px after:w-[30%] after:bg-accent-green after:transition-all after:duration-300 after:ease-in-out group-hover:after:w-[60%]">{branch.name}</div>
          </div>
          <div className="relative grid flex-1 grid-cols-1 gap-2">
            {branch.leaves && branch.leaves.map((leaf) => (
              <a
                key={leaf.id}
                href={leaf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block text-inherit no-underline transition-all duration-200 ease-in-out"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-accent-green-subtle transition-all duration-200 ease-in-out group-hover:scale-105 group-hover:bg-accent-green-hover">
                  <div dangerouslySetInnerHTML={{ __html: leaf.icon.replace(/svg/g, `svg class="h-6 w-6 fill-accent-green"`) }} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium leading-tight text-text-primary">
                    {leaf.name}
                  </div>
                  <div className="break-all font-mono text-xs leading-tight text-text-tertiary">
                    {removeProtocol(leaf.url)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TrunkApplication 