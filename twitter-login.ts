import { TwitterApi } from 'twitter-api-v2';
import config from '../config';

import type { Handler } from 'express';
import type { NewRequest } from '../interfaces';

export const twitterLogin: Handler = async (req: NewRequest, res, next) => {
  const { state, code } = req.query;
  const { codeVerifier, state: sessionState } = req.session || {};

  if (!state || !code || !codeVerifier || !sessionState) {
    return next(Error('You denied the app or your session expired.'));
  }

  if (state !== sessionState) {
    return next(Error('Stored tokens did not match.'));
  }

  const requestClient = new TwitterApi({
    clientId: config.twitter.projectClientId,
    clientSecret: config.twitter.projectClientSecret,
  });

  try {
    const { accessToken, refreshToken } = await requestClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: config.callbackURL,
    });

    req.session.accessToken = accessToken;
    req.session.refreshToken = refreshToken;
    res.status(200).redirect(config.frontEndDomain);
  } catch (err) {
    next(err);
  }
};
