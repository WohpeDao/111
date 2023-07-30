import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { createPool } from 'mysql2/promise';
import { ethers } from 'ethers';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import {
  errorHandler,
  authLinkGenerator,
  walletVerifier,
  mysqlManager,
  eventDateVerifier,
  referrerVerifier,
} from './middlewares';
import {
  twitterBinding,
  twitterLogout,
  twitterLogin,
  twitterAttendance,
  twitterPostTweet,
  twitterRetweet,
  blockchainNft,
  requestSignature,
  userInfo,
  makeUpAttendance,
  makeUpPostTweet,
} from './handlers';
import { checkNft } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MySQLStore = require('express-mysql-session')(session);

declare module 'express-session' {
  interface SessionData {
    state: string;
    codeVerifier: string;
    accessToken: string;
    refreshToken: string;
  }
}

const app = express();
const router = express.Router();
const port = config.port;
const pool = createPool(config.database);
const sessionStore = new MySQLStore({}, pool);

const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  standardHeaders: config.rateLimiting.standardHeaders,
  legacyHeaders: config.rateLimiting.legacyHeaders,
});

router
  .use(cors({ origin: config.frontEndDomain, credentials: true }))
  .use(
    session({
      name: 'twitter-nft',
      secret: 'twitter-nft-sc',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
    })
  )
  .use(express.json())
  .use(mysqlManager(pool))
  .use(helmet())
  .use(limiter);

router.get('/twitterLogin', authLinkGenerator);
router.get('/callback', twitterLogin);
router.post('/twitterLogout', twitterLogout);

router.get('/user/:walletAddress?', userInfo);
router.post('/user', walletVerifier, twitterBinding);

router.post('/retweet', walletVerifier, twitterRetweet);
router.post(
  '/attendance/:day',
  walletVerifier,
  referrerVerifier,
  eventDateVerifier,
  twitterAttendance
);
router.post('/tweet/:day', walletVerifier, eventDateVerifier, twitterPostTweet);

router.post('/nft', walletVerifier, blockchainNft);

router.post('/attendanceMakeUp/:day', walletVerifier, makeUpAttendance);
router.post('/tweetMakeUp/:day', walletVerifier, makeUpPostTweet);

router.get('/signature', walletVerifier, requestSignature);

router.use(errorHandler);

app.use('/', router);
app.listen(port, () => {
  console.log(`[server]: Server is running at port ${port}`);
});

const provider = new ethers.JsonRpcProvider(config.ethMainnetPrcEndpoint);
const contract = new ethers.Contract(
  config.controllerContractAddress,
  config.controllerAbi,
  provider
);

contract.on('Approval', async (buyer, nftType) => {
  checkNft(pool, buyer).catch((error) => console.log(error));
});
