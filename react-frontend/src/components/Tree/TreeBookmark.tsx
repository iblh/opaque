import React from 'react'
import { BookmarkBranch, Leaf } from '@/lib/types'

interface BookmarkTree {
  root: string;
  branches: BookmarkBranch[];
}

interface TreeBookmarkProps {
  tree: BookmarkTree;
}

const TreeBookmark: React.FC<TreeBookmarkProps> = ({ tree }) => {
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
              <div className="absolute -bottom-1 left-0 h-[2px] w-6 bg-accent-green"></div>
            </div>
          </div>
          <div className="relative grid flex-1 grid-cols-1 gap-1.5">
            {branch.leaves && branch.leaves.map((leaf) => (
              <a
                key={leaf.id}
                href={leaf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block text-inherit no-underline transition-all duration-200 ease-in-out"
              >
                <div className="relative rounded bg-surface-elevated border border-transparent hover:border-border-light p-2 transition-all duration-200 ease-in-out hover:shadow-subtle">
                  <div className="flex flex-row items-start gap-2 text-left items-center">
                    <div 
                      className="flex h-6 w-6 items-center justify-center opacity-75 group-hover:opacity-100"
                      dangerouslySetInnerHTML={{ __html: leaf.icon.replace(/svg/g, `svg class="h-4 w-4 fill-text-secondary transition-colors duration-200 ease-in-out group-hover:fill-accent-green"`) }}
                    />
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="leaf-bm-name text-center text-xs font-normal leading-tight text-text-primary group-hover:text-accent-green transition-all duration-200 ease-in-out" style={{ wordBreak: 'break-word' }}>
                        {leaf.name}
                      </div>
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

export default TreeBookmark 