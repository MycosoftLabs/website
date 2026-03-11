import NextAuth, { type NextAuthOptions, type User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"

// Check if OAuth providers are configured
const GOOGLE_OAUTH_CONFIGURED = !!(
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CLIENT_ID !== "placeholder" &&
  !process.env.GOOGLE_CLIENT_ID.includes("your-")
)

const GITHUB_OAUTH_CONFIGURED = !!(
  process.env.GITHUB_ID && 
  process.env.GITHUB_SECRET
)

// Mycosoft user database with roles and permissions
interface MycosoftUser {
  id: string
  email: string
  name: string
  role: "owner" | "admin" | "developer" | "ai" | "user"
  permissions: string[]
  title?: string
}

const MYCOSOFT_USERS: MycosoftUser[] = [
  { 
    id: "1", 
    email: "morgan@mycosoft.org", 
    name: "Morgan Rockwell", 
    role: "owner",
    title: "CEO & Founder",
    permissions: ["*"], // Full god-mode access
  },
  { 
    id: "2", 
    email: "garret@mycosoft.org", 
    name: "Garret Baquet", 
    role: "admin",
    title: "CTO",
    permissions: ["admin", "dev", "ai", "infra", "data"],
  },
  { 
    id: "3", 
    email: "rj@mycosoft.org", 
    name: "RJ Ricasata", 
    role: "admin",
    title: "COO",
    permissions: ["admin", "dev", "data", "ops"],
  },
  { 
    id: "4", 
    email: "chris@mycosoft.org", 
    name: "Chris Freetage", 
    role: "developer",
    title: "Engineer",
    permissions: ["dev", "ai"],
  },
  { 
    id: "5", 
    email: "alberto@mycosoft.org", 
    name: "Alberto Septien", 
    role: "developer",
    title: "Engineer",
    permissions: ["dev", "data"],
  },
  { 
    id: "6", 
    email: "abelardo@mycosoft.org", 
    name: "Abelardo", 
    role: "developer",
    permissions: ["dev"],
  },
  { 
    id: "7", 
    email: "myca@mycosoft.org", 
    name: "MYCA", 
    role: "ai",
    title: "AI Agent",
    permissions: ["ai", "dev", "data", "infra"],
  },
  {
    id: "8",
    email: "michelle@mycosoft.org",
    name: "Michelle",
    role: "admin",
    title: "Ethics Training",
    permissions: ["admin", "ethics-training"],
  },
]

// Default password for credential login — MUST be set via MYCOSOFT_DEFAULT_PASSWORD env var
// SECURITY: No fallback — empty/missing password disables credential login
const DEFAULT_PASSWORD = process.env.MYCOSOFT_DEFAULT_PASSWORD
if (!DEFAULT_PASSWORD && typeof window === 'undefined') {
  console.error('[SECURITY] WARNING: MYCOSOFT_DEFAULT_PASSWORD is not set. Credential login is disabled.')
}

// Find user by email (case-insensitive, supports @mycosoft.org domain)
function findMycosoftUser(email: string): MycosoftUser | null {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Direct match
  let user = MYCOSOFT_USERS.find(u => u.email.toLowerCase() === normalizedEmail)
  if (user) return user
  
  // Check if it's a mycosoft.org email
  if (normalizedEmail.endsWith("@mycosoft.org")) {
    user = MYCOSOFT_USERS.find(u => u.email.toLowerCase() === normalizedEmail)
    return user || null
  }
  
  // SECURITY: Only match by exact email — prefix matching is disabled to prevent
  // privilege escalation (e.g., morgan@gmail.com matching morgan@mycosoft.org)
  return null
}

// Check if email is allowed to access the system
function isAllowedEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Mycosoft team members always allowed
  if (normalizedEmail.endsWith("@mycosoft.org")) return true
  
  // Check if user exists in our database
  const user = findMycosoftUser(normalizedEmail)
  return user !== null
}

// Build providers array - only include OAuth if properly configured
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Mycosoft",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      // SECURITY: Reject login if password is not configured
      if (!DEFAULT_PASSWORD) return null

      const user = findMycosoftUser(credentials.email)
      if (!user) return null

      // Check password — timing-safe comparison to prevent timing attacks
      const crypto = require('crypto')
      const inputBuf = Buffer.from(credentials.password)
      const expectedBuf = Buffer.from(DEFAULT_PASSWORD)
      if (inputBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(inputBuf, expectedBuf)) return null
      
      return { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        permissions: user.permissions,
        title: user.title,
      } as User & { role: string; permissions: string[]; title?: string }
    },
  }),
]

// Add Google OAuth only if properly configured
if (GOOGLE_OAUTH_CONFIGURED) {
  providers.push(
    GoogleProvider({ 
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Restrict to mycosoft.org domain
          hd: "mycosoft.org",
        },
      },
    })
  )
} else if (process.env.NODE_ENV === "development") {
  console.warn("[NextAuth] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local")
}

// Add GitHub OAuth only if properly configured
if (GITHUB_OAUTH_CONFIGURED) {
  providers.push(
    GitHubProvider({ 
      clientId: process.env.GITHUB_ID!, 
      clientSecret: process.env.GITHUB_SECRET! 
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: { 
    signIn: "/login", 
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, check if email is allowed
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) return false
        return isAllowedEmail(user.email)
      }
      return true
    },
    async jwt({ token, user, account }) { 
      // On initial sign in
      if (user) { 
        const mycosoftUser = findMycosoftUser(user.email || "")
        
        if (mycosoftUser) {
          // Map to Mycosoft user
          token.userId = mycosoftUser.id
          token.role = mycosoftUser.role
          token.permissions = mycosoftUser.permissions
          token.title = mycosoftUser.title
          token.name = mycosoftUser.name
          token.email = mycosoftUser.email
        } else if (user.email?.endsWith("@mycosoft.org")) {
          // New Mycosoft team member via OAuth
          token.userId = String(user.id)
          token.role = "developer"
          token.permissions = ["dev"]
        } else {
          // External user (shouldn't happen with domain restriction)
          token.userId = String(user.id)
          token.role = "user"
          token.permissions = []
        }
      }
      return token 
    },
    async session({ session, token }) { 
      if (session.user) { 
        // Assign values directly from token to session.user
        const sessionUser = session.user as any
        sessionUser.id = token.userId || token.sub || ''
        sessionUser.role = token.role || 'user'
        sessionUser.permissions = token.permissions || []
        sessionUser.title = token.title
        
        // Owner has all permissions
        if (token.role === "owner") {
          sessionUser.isOwner = true
          sessionUser.isAdmin = true
          sessionUser.isSuperAdmin = true
        } else if (token.role === "admin") {
          sessionUser.isAdmin = true
        }
      }
      return session 
    },
    async redirect({ url, baseUrl }) {
      // Handle callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  session: { 
    strategy: "jwt", 
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for security)
  },
  // SECURITY: No hardcoded fallback — NEXTAUTH_SECRET must be set in environment
  secret: process.env.NEXTAUTH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: NEXTAUTH_SECRET environment variable is required in production')
    }
    console.error('[SECURITY] WARNING: NEXTAUTH_SECRET is not set. Using random secret (sessions will not persist across restarts)')
    return require('crypto').randomBytes(32).toString('hex')
  })(),
  debug: process.env.NODE_ENV === "development",
  trustHost: true, // Required behind Cloudflare/proxy so session is recognized
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
