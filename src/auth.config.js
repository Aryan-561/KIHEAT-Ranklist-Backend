import Google from "@auth/express/providers/google";
import { User } from "./models/user.model.js";

export const authConfig = {
    trustHost: true,
    basePath: "/api/v2/auth",
    cookies: {
    csrfToken: {
      name: "__Host-authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
      },
    },
    sessionToken: {
      name: "__Host-authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
      },
    },
  },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            try {
                console.log('🔍 SignIn attempt:', { email: user.email, name: user.name });
                
                let existingUser = await User.findOne({ email: user.email });
                if (!existingUser) {
                    const newUser = new User({
                        name: user.name,
                        email: user.email,
                    });
                    existingUser = await newUser.save();
                    console.log('✅ New user created:', user.email);
                } else {
                    console.log('✅ User already exists:', user.email);
                }
                
                // Attach database user ID to the user object
                user.dbId = existingUser._id.toString();
                return true;
            } catch (error) {
                console.error('❌ Error in signIn callback:', error);
                return false;
            }
        },

        async jwt({ token, user, account }) {
            // On initial sign in, user object is available
            if (user) {
                token.dbId = user.dbId;
                token.email = user.email;
                token.name = user.name;
                console.log('🔑 JWT created with dbId:', token.dbId);
            }
            return token;
        },
        
        async session({ session, token }) {
            // Add custom fields to session
            if (token) {
                session.user.id = token.dbId;
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        },
    },

    session:{
        strategy: 'jwt',
    },

    secret: process.env.AUTH_SECRET,
}