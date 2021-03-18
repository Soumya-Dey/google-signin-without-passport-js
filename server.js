const express = require('express');
const axios = require('axios');
const cors = require('cors');

const env = require('./env');

const app = express();

const PORT = process.env.PORT || 7001;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('Hello from localhost:5000'));

app.get('/user/signin', async (req, res) => {
  try {
    // TODO: also get the clientId here to save page details inside copany model in db
    const { code, method } = req.query;

    if (!code)
      return res
        .status(400)
        .json({ errors: [{ msg: 'No code found in url' }] });

    let urlForData;
    let dataForToken;
    let reqMethod;
    let queryParams;
    if (method === 'google') {
      urlForData = `https://oauth2.googleapis.com/token`;
      dataForToken = {
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/auth/google',
        grant_type: 'authorization_code',
        code,
      };
      reqMethod = 'post';
    } else if (method === 'facebook') {
      queryParams = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        redirect_uri: 'http://localhost:3000/auth/facebook',
        code,
      }).toString();
      urlForData = `https://graph.facebook.com/v9.0/oauth/access_token?${queryParams}`;
      dataForToken = {};
      reqMethod = 'get';
    }

    const { data: tokenData } = await axios({
      url: urlForData,
      method: reqMethod,
      data: dataForToken,
    });

    const token = tokenData.access_token;

    if (!token)
      return res
        .status(400)
        .json({ errors: [{ msg: 'Problem fetching access token' }] });

    let headersForInfo;
    if (method === 'google') {
      urlForData = `https://www.googleapis.com/oauth2/v2/userinfo`;
      headersForInfo = {
        Authorization: `Bearer ${token}`,
      };
    } else if (method === 'facebook') {
      queryParams = new URLSearchParams({
        fields: ['id', 'name'].join(','),
        access_token: token,
      }).toString();
      urlForData = `https://graph.facebook.com/me?${queryParams}`;
      headersForInfo = {};
    }

    const { data: userInfo } = await axios({
      url: urlForData,
      method: 'get',
      headers: headersForInfo,
    });

    if (!userInfo)
      return res.status(400).json({ errors: [{ msg: 'No user found' }] });

    res.json(userInfo);

    // queryParams = new URLSearchParams({
    //   fields: ['id', 'name', 'access_token'].join(','),
    //   access_token: token,
    // }).toString();
    // urlForData = `https://graph.facebook.com/v9.0/${userInfo.id}/accounts?${queryParams}`;
    // headersForInfo = {};

    // const {
    //   data: { data: pages },
    // } = await axios({
    //   url: urlForData,
    //   method: 'get',
    //   headers: headersForInfo,
    // });

    // // TODO: save the page-id, page-name, page-access-token in company model in db

    // // TODO: should we connect all user pages to our app or give them the option to connect manually

    // queryParams = new URLSearchParams({
    //   subscribed_fields: ['feed'].join(','),
    //   access_token: pages[0].access_token,
    // }).toString();
    // urlForData = `https://graph.facebook.com/${pages[0].id}/subscribed_apps?${queryParams}`;
    // headersForInfo = {};

    // const { data } = await axios({
    //   url: urlForData,
    //   method: 'post',
    //   headers: headersForInfo,
    // });

    // console.log('data', data);
    // res.json({ data, pages });
  } catch (error) {
    res
      .status(500)
      .json({ errors: [{ msg: `Server error: ${error.message}`, error }] });
  }
});

app.get('/webhook/facebook', async (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = env.WEBHOOK_SECRET;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

app.post('/webhook/facebook', async (req, res) => {
  let { object, entry } = req.body;

  if (object === 'page') {
    entry.forEach((item) => {
      item.changes.forEach((change) => {
        console.log(change);
      });
    });

    res.status(200).json({ msg: 'OK' });
  } else {
    res.sendStatus(404);
  }

  // Check the webhook event is from a Page subscription
  // if (body.object === 'page') {
  //   let tempPosts;
  //   let postIdArr = [];
  //   body.entry.forEach((entry) => {
  //     // Gets the body of the webhook event
  //     webHookChanges = entry.changes;
  //     webHookChanges.forEach((change) => {
  //       postIdArr.push(change.value.post_id);
  //     });
  //   });

  //   tempPosts = postIdArr.map(async (postId) => {
  //     const { data } = await axios({
  //       url: `https://graph.facebook.com/${postId}?access_token=${process.env.FB_LONG_LIVED_ACCESS_TOKEN}`,
  //       method: 'GET',
  //     });

  //     return data;
  //   });

  //   const posts = await Promise.all(tempPosts);
  //   console.log(posts);

  //   res.status(200).json(posts);
  // } else {
  //   // Return a '404 Not Found' if event is not from a page subscription
  //   res.sendStatus(404);
  // }
});

app.listen(PORT, () =>
  console.log(`server started at => http://localhost:${PORT}/`)
);
