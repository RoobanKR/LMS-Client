'use client'

import { useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const permissionsStr = localStorage.getItem('smartcliff_permissions')
      
      if (!permissionsStr) {
        redirect('/login')
        return
      }

      try {
        const permissions = JSON.parse(permissionsStr)
        
        if (!Array.isArray(permissions) || permissions.length === 0) {
          redirect('/login')
          return
        }

        const firstPermission = permissions[0]
        const permissionKey = firstPermission?.permissionKey
        
        if (!permissionKey) {
          redirect('/login')
          return
        }

        redirect(`/lms/pages/${permissionKey}`)
      } catch (error) {
        console.error('Error parsing permissions:', error)
        redirect('/login')
      }
    }
  }, [])

  return null 
}