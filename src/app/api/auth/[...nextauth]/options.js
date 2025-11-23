import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { auth } from "@/lib/services/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                try {
                    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
                    const firebaseUser = userCredential.user

                    let user = await db.user.findUnique({
                        where: { id: firebaseUser.uid },
                    })

                    if (!user) {
                        user = await db.user.create({
                            data: {
                                id: firebaseUser.uid,
                                email: firebaseUser.email,
                                isAnonymous: false,
                                role: "USER",
                                provider: "email",
                                providerUid: firebaseUser.uid,
                            },
                        })
                    }

                    return { id: user.id, email: user.email, role: user.role }
                } catch (err) {
                    console.error("Firebase login error:", err)
                    return null
                }
            },
        }),
    ],

    session: { strategy: "jwt" },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            session.user.id = token.id
            session.user.role = token.role
            return session
        },
    },

    pages: { signIn: "/auth/signin" },

    secret: process.env.NEXTAUTH_SECRET,
}

// App Router handler
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
