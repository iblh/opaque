import React from 'react'

interface Branch {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface TrunkServerProps {
  tree: Tree;
}

const TrunkServer: React.FC<TrunkServerProps> = ({ tree }) => {
  const removeProtocol = (url: string) => {
    return url.replace(/(^\w+:|^)\/\//, '')
  }

  return (
    <div className="trunk">
      {tree.branches.map((branch, branchIndex) => (
        <a
          key={branch.id}
          href={branch.url}
          target="_blank"
          rel="noopener noreferrer"
          className="branch b-server"
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
        >
          <div className="branch-icon">
            <div dangerouslySetInnerHTML={{ __html: branch.icon }} />
          </div>
          <div className="branch-info">
            <div className="branch-name">
              {branch.name}
            </div>
            <div className="branch-url">
              {removeProtocol(branch.url)}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

export default TrunkServer 