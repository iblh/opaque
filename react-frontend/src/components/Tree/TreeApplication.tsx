import React from 'react'
import { ApplicationBranch, Leaf } from '@/lib/types'

interface ApplicationTree {
  root: string;
  branches: ApplicationBranch[];
}

interface TreeApplicationProps {
  tree: ApplicationTree;
}

const TreeApplication: React.FC<TreeApplicationProps> = ({ tree }) => {
  const removeProtocol = (url: string) => {
    return url.replace(/(^\w+:|^)\/\//, '')
  }

  return (
    <div className="relative grid max-w-[90rem] grid-cols-[repeat(auto-fill,minmax(280px,280px))] gap-6 px-8">
      {tree.branches.map((branch, branchIndex) => (
        <div 
          key={branch.id} 
          className="relative flex w-[280px] animate-fade-in flex-col p-5 transition-all duration-200 ease-in-out"
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
        >
          <div className="relative mb-4 flex flex-col">
            <div className="relative text-sm font-medium tracking-tight text-text-primary">
              {branch.name}
              <div className="absolute -bottom-1 left-0 h-[2px] w-6 bg-accent-blue"></div>
            </div>
          </div>
          <div className="relative grid flex-1 grid-cols-1 gap-4">
            {branch.leaves && branch.leaves.map((leaf) => (
              <a
                key={leaf.id}
                href={leaf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block text-inherit no-underline transition-all duration-200 ease-in-out"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-accent-blue-subtle transition-all duration-200 ease-in-out group-hover:scale-105 group-hover:bg-accent-blue-hover">
                    <div dangerouslySetInnerHTML={{ __html: leaf.icon.replace(/svg/g, `svg class="h-5 w-5 fill-accent-blue"`) }} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-medium leading-tight text-text-primary group-hover:text-accent-blue transition-all duration-200">
                      {leaf.name}
                    </div>
                    <div className="font-mono text-xs leading-tight text-text-tertiary">
                      {removeProtocol(leaf.url)}
                    </div>
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

export default TreeApplication 