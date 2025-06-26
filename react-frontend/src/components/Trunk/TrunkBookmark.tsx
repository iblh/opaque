import React from 'react'

interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface Branch {
  id: string;
  name: string;
  leaves: Leaf[];
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface TrunkBookmarkProps {
  tree: Tree;
}

const TrunkBookmark: React.FC<TrunkBookmarkProps> = ({ tree }) => {
  return (
    <div className="trunk">
      {tree.branches.map((branch, branchIndex) => (
        <div 
          key={branch.id} 
          className="branch"
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
        >
          <div className="branch-name-wrapper">
            <div className="branch-name">{branch.name}</div>
            <div className="line" />
          </div>
          <div className="branch-leaves">
            {branch.leaves && branch.leaves.map((leaf) => (
              <a
                key={leaf.id}
                href={leaf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="leaf"
              >
                <div className="leaf-wrapper">
                  <div className="leaf-bm">
                    <div 
                      className="leaf-bm-icon"
                      dangerouslySetInnerHTML={{ __html: leaf.icon }}
                    />
                    <div className="leaf-bm-name-wrapper">
                      <div className="line overline" />
                      <div className="leaf-bm-name">
                        {leaf.name}
                      </div>
                      <div className="line underline" />
                    </div>
                  </div>
                </div>
                <div className="leaf-placeholder" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TrunkBookmark 