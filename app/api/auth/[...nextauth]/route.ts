import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"

const MYCOSOFT_USERS = [
  { id: "1", email: "morgan@mycosoft.org", name: "Morgan", role: "admin", password: "Mushroom1!" },
  { id: "2", email: "rj@mycosoft.org", name: "RJ", role: "developer", password: "Mushroom1!" },
  { id: "3", email: "chris@mycosoft.org", name: "Chris", role: "developer", password: "Mushroom1!" },
  { id: "4", email: "garret@mycosoft.org", name: "Garret", role: "developer", password: "Mushroom1!" },
  { id: "5", email: "alberto@mycosoft.org", name: "Alberto", role: "developer", password: "Mushroom1!" },
  { id: "6", email: "abelardo@mycosoft.org", name: "Abelardo", role: "developer", password: "Mushroom1!" },
  { id: "7", email: "myca@mycosoft.org", name: "MYCA", role: "ai", password: "Mushroom1!" },
]

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
        const user = MYCOSOFT_USERS.find(u => u.email.toLowerCase() === credentials.email.toLowerCase())
        if (!user || user.password !== credentials.password) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
    ...(process.env.GITHUB_ID ? [GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET! })] : []),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user }) { 
      if (user) { 
        token.role = (user as any).role
        token.id = user.id 
      } 
      return token 
    },
    async session({ session, token }) { 
      if (session.user) { 
        (session.user as any).role = token.role
        (session.user as any).id = token.id 
      } 
      return session 
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET || "mycosoft-secret-key",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
