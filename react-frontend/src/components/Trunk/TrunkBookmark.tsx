import React from 'react'
import { BookmarkBranch, Leaf } from '@/lib/types'

interface BookmarkTree {
  root: string;
  branches: BookmarkBranch[];
}

interface TrunkBookmarkProps {
  tree: BookmarkTree;
}

const TrunkBookmark: React.FC<TrunkBookmarkProps> = ({ tree }) => {
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
                className="block text-inherit no-underline transition-all duration-200 ease-in-out"
              >
                <div className="leaf-wrapper group relative rounded-sm border border-border-light bg-white p-2 transition-all duration-200 ease-in-out hover:border-accent-green">
                  <div className="flex flex-row items-start gap-1 text-left">
                    <div 
                      className="flex h-6 w-6 items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: leaf.icon.replace(/svg/g, `svg class="h-4 w-4 fill-text-secondary transition-colors duration-200 ease-in-out group-hover:fill-accent-green"`) }}
                    />
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="leaf-bm-name text-center text-xs font-normal leading-tight text-text-primary" style={{ wordBreak: 'break-word' }}>
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

export default TrunkBookmark 