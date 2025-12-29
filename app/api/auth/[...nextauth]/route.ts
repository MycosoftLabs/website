import NextAuth, { type NextAuthOptions, type User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"

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
]

// Default password for credential login
const DEFAULT_PASSWORD = "Mushroom1!"

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
  
  // For Google OAuth, also check by matching the name part of email
  const emailName = normalizedEmail.split("@")[0]
  user = MYCOSOFT_USERS.find(u => {
    const userName = u.email.split("@")[0]
    return userName === emailName
  })
  
  return user || null
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Mycosoft",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = findMycosoftUser(credentials.email)
        if (!user) return null
        
        // Check password
        if (credentials.password !== DEFAULT_PASSWORD) return null
        
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
    // Google OAuth - always enabled for @mycosoft.org domain
    GoogleProvider({ 
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Restrict to mycosoft.org domain
          hd: "mycosoft.org",
        },
      },
    }),
    ...(process.env.GITHUB_ID ? [GitHubProvider({ 
      clientId: process.env.GITHUB_ID, 
      clientSecret: process.env.GITHUB_SECRET! 
    })] : []),
  ],
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
          token.id = mycosoftUser.id
          token.role = mycosoftUser.role
          token.permissions = mycosoftUser.permissions
          token.title = mycosoftUser.title
          token.name = mycosoftUser.name
          token.email = mycosoftUser.email
        } else if (user.email?.endsWith("@mycosoft.org")) {
          // New Mycosoft team member via OAuth
          token.id = user.id
          token.role = "developer"
          token.permissions = ["dev"]
        } else {
          // External user (shouldn't happen with domain restriction)
          token.id = user.id
          token.role = "user"
          token.permissions = []
        }
      }
      return token 
    },
    async session({ session, token }) { 
      if (session.user) { 
        (session.user as any).id = token.id
        (session.user as any).role = token.role
        (session.user as any).permissions = token.permissions
        (session.user as any).title = token.title
        
        // Owner has all permissions
        if (token.role === "owner") {
          (session.user as any).isOwner = true
          (session.user as any).isAdmin = true
          (session.user as any).isSuperAdmin = true
        } else if (token.role === "admin") {
          (session.user as any).isAdmin = true
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "mycosoft-secret-key-2024",
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
