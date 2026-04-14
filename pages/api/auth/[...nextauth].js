import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';

const SPOTIFY_SCOPES = [
  'user-read-private',
'user-read-email',
'playlist-read-private',
'playlist-read-collaborative',
'user-top-read',
'user-library-read',
].join(' ');

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
          show_dialog: true,
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.spotifyId = profile.id;
        token.displayName = profile.display_name;
        token.avatar = profile.images?.[0]?.url || null;
      }
      if (Date.now() < token.expiresAt * 1000) return token;
      try {
        const r = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
          }),
        });
        const data = await r.json();
        return {
          ...token,
          accessToken: data.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + data.expires_in),
          refreshToken: data.refresh_token ?? token.refreshToken,
        };
      } catch {
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.spotifyId = token.spotifyId;
      session.displayName = token.displayName;
      session.avatar = token.avatar;
      session.error = token.error;
      return session;
    },
  },
};

export default NextAuth(authOptions);
