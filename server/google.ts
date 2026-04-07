import { OAuth2Client } from "google-auth-library";

const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error("GOOGLE_CLIENT_ID is not configured.");
}

const oauthClient = new OAuth2Client(googleClientId);

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

export const verifyGoogleCredential = async (credential: string): Promise<GoogleIdentity> => {
  const ticket = await oauthClient.verifyIdToken({
    idToken: credential,
    audience: googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error("Invalid Google token payload.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}`,
  };
};
