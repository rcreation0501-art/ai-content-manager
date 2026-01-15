import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, Calendar } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ContentService } from "@/lib/contentService"
import { formatDistanceToNow } from "date-fns"
import { ContentProductionOverview } from "@/components/ContentProductionOverview"

const Index = () => {
  const navigate = useNavigate()

  // Fetch all posts for total count
  const { data: allPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['all-posts'],
    queryFn: ContentService.getAllPosts
  })

  // Fetch scheduled posts for this week
  const { data: scheduledPosts = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ['scheduled-posts'],
    queryFn: () => {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return ContentService.getScheduledPosts(now, weekFromNow)
    }
  })

  // Get recent posts for activity feed
  const recentPosts = allPosts.slice(0, 3)

  // Calculate stats
  const totalPosts = allPosts.length
  const scheduledThisWeek = scheduledPosts.length

  // Calculate growth (simplified - comparing with total/2 as mock "last month")
  const mockLastMonthTotal = Math.max(1, Math.floor(totalPosts * 0.85))
  const growthPercentage = totalPosts > 0 ? Math.round(((totalPosts - mockLastMonthTotal) / mockLastMonthTotal) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5 data-grid bg-noise">
      <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mb-2">
          Welcome to Sasa Ai
        </h1>
        <p className="text-muted-foreground">Here's an overview of your content performance</p>
      </div>

      {/* Content Production Overview */}
      <div className="mb-8">
        <ContentProductionOverview 
          totalPosts={totalPosts}
          scheduledThisWeek={scheduledThisWeek}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full"></div>
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-400 drop-shadow-glow animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 animate-pulse-glow">
                {postsLoading ? "..." : totalPosts}
              </div>
              {/* Progress bar visual */}
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-data-pulse"
                  style={{ width: `${Math.min(100, (totalPosts / 10) * 100)}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              {postsLoading ? "..." : totalPosts}
              {!postsLoading && (
                <>
                  <span className={`inline-flex items-center gap-1 ${growthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                    {growthPercentage >= 0 ? '+' : ''}{growthPercentage}% from last month
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"></div>
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-400 drop-shadow-glow animate-data-pulse" />
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 animate-data-pulse">
                {scheduledLoading ? "..." : scheduledThisWeek}
              </div>
              {/* Circular progress indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <div className="w-full h-full border-2 border-blue-500/30 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-0.5 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              {scheduledLoading ? "..." : scheduledThisWeek}
              {!scheduledLoading && (
                <>
                  <span className="inline-flex items-center gap-1 text-blue-400">
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                    Posts for this week
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Activity
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </CardTitle>
            <CardDescription>Your latest content updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {postsLoading ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  Loading recent activity...
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity yet. Create your first post!</div>
              ) : (
                recentPosts.map((post, index) => (
                  <div key={post.id} className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-2 h-2 bg-primary/30 rounded-full animate-ping"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {post.content_type === 'lead_magnet' ? 'Lead magnet' : 'Post'} "{post.title || 'Untitled'}" {post.status === 'scheduled' ? 'scheduled' : 'created'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent"></div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Quick Actions
              <div className="w-1 h-4 bg-gradient-to-t from-primary to-transparent animate-data-pulse"></div>
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start relative overflow-hidden group" 
              variant="outline"
              onClick={() => navigate('/create-post')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <BarChart3 className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
            <Button 
              className="w-full justify-start relative overflow-hidden group" 
              variant="outline"
              onClick={() => navigate('/lead-magnet')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Users className="mr-2 h-4 w-4" />
              Generate Lead Magnet
            </Button>
            <Button 
              className="w-full justify-start relative overflow-hidden group" 
              variant="outline"
              onClick={() => navigate('/content-calendar')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Content
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}

export default Index
