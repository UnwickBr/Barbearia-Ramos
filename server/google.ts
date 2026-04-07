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

export const verifyGoogleAccessToken = async (accessToken: string): Promise<GoogleIdentity> => {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Invalid Google access token.");
  }

  const payload = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!payload.sub || !payload.email || !payload.name) {
    throw new Error("Invalid Google user info payload.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}`,
  };
};
