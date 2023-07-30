import { TwitterApi } from 'twitter-api-v2';
import config from '../config';

import type { Handler } from 'express';
import type { NewRequest } from '../interfaces';

export const authLinkGenerator: Handler = async (
  req: NewRequest,
  res,
  next
) => {
  try {
    const {
      state: sessionState,
      codeVerifier: sessionCodeVerifier,
      accessToken,
      refreshToken,
    } = req.session;

    if (sessionState && sessionCodeVerifier && accessToken && refreshToken)
      return res.status(400).json({ message: 'You are already logged in.' });

    const client = new TwitterApi({
      clientId: config.twitter.projectClientId,
      clientSecret: config.twitter.projectClientSecret,
    });

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      config.callbackURL,
      {
        scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'follows.read',
          'follows.write',
          'offline.access',
        ],
      }
    );

    req.session.state = state;
    req.session.codeVerifier = codeVerifier;

    res.status(200).json({ url: url });
  } catch (err) {
    next(err);
  }
};
