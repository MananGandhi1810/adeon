import { useEffect } from "react"
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            posthog.init((import.meta.env.VITE_POSTHOG_KEY as string) || "dummy_key", {
                api_host: (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                capture_pageview: true // Enable automatic pageview capture
            })
        }
    }, [])

    return (
        <PHProvider client={posthog}>
            {children}
        </PHProvider>
    )
}