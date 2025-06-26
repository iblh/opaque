'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import TrunkBookmark from '@/components/Trunk/TrunkBookmark'
import TrunkApplication from '@/components/Trunk/TrunkApplication'
import TrunkServer from '@/components/Trunk/TrunkServer'
import Tune from '@/components/Tune'
import '@/app/dashboard.css'

interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface Branch {
  id: string;
  name: string;
  leaves?: Leaf[];
  url?: string;
  icon?: string;
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface Dashboard {
  forest: Tree[];
  username: string;
}

const trunkMapping = {
  bookmarks: TrunkBookmark,
  applications: TrunkApplication,
  servers: TrunkServer,
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
    <div id="dashboard">
      {dashboard.forest && dashboard.forest.map((tree, index) => {
        const TrunkComponent = trunkMapping[tree.root as keyof typeof trunkMapping]
        
        return (
          <div key={index} className="tree">
            <div className="root">{tree.root}</div>
            
            {TrunkComponent && <TrunkComponent tree={tree} />}
            
            <div className="placeholder" />
          </div>
        )
      })}
      <Tune dashboard={dashboard} setDashboard={setDashboard} />
    </div>
  )
}
