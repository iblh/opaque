'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

interface Branch {
  name: string;
  items: any[];
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface Dashboard {
  forest: Tree[];
  username: string;
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const jwt_token = Cookies.get('jwt_token')
        if (!jwt_token) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/dashboard/get', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${jwt_token}`,
          },
        })

        if (res.status === 401) {
          // Token invalid, redirect to login
          Cookies.remove('jwt_token')
          router.push('/login')
          return
        }

        if (res.ok) {
          const data = await res.json()
          setDashboard(data.dashboard)
        } else {
          setError('Failed to load dashboard')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>No dashboard data available</div>
      </div>
    )
  }

  return (
    <div id="dashboard" className="flex flex-col py-7">
      <div className="text-2xl font-bold mb-8 text-center">
        Welcome to OPAQUE
      </div>
      
      {dashboard.forest && dashboard.forest.length > 0 ? (
        dashboard.forest.map((tree, index) => (
          <div key={index} className="tree flex flex-row justify-between my-3">
            <div className="root w-50 py-2 flex justify-end uppercase font-bold text-gray-600">
              {tree.root}
            </div>
            
            <div className="trunk flex-1 px-8">
              {tree.branches && tree.branches.map((branch, branchIndex) => (
                <div key={branchIndex} className="branch mb-4 p-4 border rounded-lg">
                  <div className="branch-name font-semibold mb-2">
                    {branch.name}
                  </div>
                  <div className="branch-items">
                    {branch.items && branch.items.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {branch.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm text-gray-700">
                            {typeof item === 'string' ? item : JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500 text-sm">No items</div>
                    )}
                  </div>
                </div>
              ))}
              
              {(!tree.branches || tree.branches.length === 0) && (
                <div className="text-gray-500 text-center py-8">
                  No branches yet. Start adding some content!
                </div>
              )}
            </div>
            
            <div className="placeholder w-50"></div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Your dashboard is empty</div>
          <div className="text-sm text-gray-400">
            Start by creating some bookmarks, applications, or servers
          </div>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <button
          onClick={() => {
            Cookies.remove('jwt_token')
            router.push('/login')
          }}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
