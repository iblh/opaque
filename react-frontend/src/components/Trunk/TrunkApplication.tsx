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

interface TrunkApplicationProps {
  tree: Tree;
}

const TrunkApplication: React.FC<TrunkApplicationProps> = ({ tree }) => {
  const removeProtocol = (url: string) => {
    return url.replace(/(^\w+:|^)\/\//, '')
  }

  return (
    <div className="trunk">
      {tree.branches.map((branch) => (
        <div key={branch.id} className="branch">
          <div className="branch-name">{branch.name}</div>
          {branch.leaves.map((leaf) => (
            <div key={leaf.id} className="leaf">
              <div className="leaf-app-icon">
                <div dangerouslySetInnerHTML={{ __html: leaf.icon }} />
              </div>
              <div className="leaf-app-info">
                <div className="leaf-app-name">
                  {leaf.name}
                </div>
                <div className="leaf-app-url">
                  {removeProtocol(leaf.url)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default TrunkApplication 